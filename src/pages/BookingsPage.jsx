import { useEffect, useMemo, useState } from "react";
import { saveBookingsToFirestore } from "../firebaseService";
import { createNotification, pushNotification } from "../utils/notificationService";

const rideTypeOptions = [
  { value: "Bike", label: "Bike", baseFare: 79, multiplier: 1 },
  { value: "Auto", label: "Auto", baseFare: 129, multiplier: 1.25 },
  { value: "Cab", label: "Cab", baseFare: 219, multiplier: 1.6 },
];

const paymentOptions = ["Cash", "Wallet", "Google Pay"];

function stageToProgress(stage) {
  switch (stage) {
    case "Waiting":
      return 8;
    case "Driver Assigned":
      return 18;
    case "On the way":
      return 38;
    case "Reached Pickup":
      return 55;
    case "Trip Started":
      return 74;
    case "Trip Ending":
      return 90;
    case "Completed":
      return 100;
    default:
      return 8;
  }
}

function getNextRideStage(currentStage) {
  if (currentStage === "Driver Assigned") return "On the way";
  if (currentStage === "On the way") return "Reached Pickup";
  if (currentStage === "Reached Pickup") return "Trip Started";
  if (currentStage === "Trip Started") return "Trip Ending";
  return currentStage;
}

function syncDriversFromBookings(currentDrivers, nextBookings) {
  const busyDriverIds = new Set(
    nextBookings
      .filter(
        (booking) =>
          (booking.status === "Assigned" || booking.status === "In Progress") &&
          booking.assignedDriverId !== "" &&
          booking.assignedDriverId !== null &&
          booking.assignedDriverId !== undefined
      )
      .map((booking) => String(booking.assignedDriverId))
  );

  return currentDrivers.map((driver) => {
    const driverId = String(driver.id);

    if (busyDriverIds.has(driverId)) {
      return {
        ...driver,
        status: "Busy",
      };
    }

    if (driver.status === "Offline") {
      return driver;
    }

    return {
      ...driver,
      status: "Online",
    };
  });
}

function BookingsPage({ appData, setAppData, firebaseStatus, role }) {
  const {
    bookings = [],
    drivers = [],
    transactions = [],
    auditLogs = [],
  } = appData || {};

  const driverOptions = useMemo(
    () =>
      drivers.map((driver, index) => ({
        id: driver.id,
        code: `DRV-${String(index + 1).padStart(3, "0")}`,
        name: driver.name,
        vehicle: driver.vehicle,
        status: driver.status,
      })),
    [drivers]
  );

  const onlineDrivers = useMemo(
    () => driverOptions.filter((driver) => driver.status === "Online"),
    [driverOptions]
  );

  const [form, setForm] = useState({
    riderName: "",
    riderPhone: "",
    pickup: "",
    drop: "",
    rideType: "Bike",
    paymentMethod: "Cash",
    assignedDriverId: "",
    distanceKm: 2,
  });

  const [editForm, setEditForm] = useState({
    riderName: "",
    riderPhone: "",
    pickup: "",
    drop: "",
    rideType: "Bike",
    paymentMethod: "Cash",
  });

  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [editingBooking, setEditingBooking] = useState(null);
  const [deletingBooking, setDeletingBooking] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptBooking, setReceiptBooking] = useState(null);

  const [toast, setToast] = useState({
    show: false,
    type: "success",
    title: "",
    message: "",
  });

  function showToast(type, title, message) {
    setToast({
      show: true,
      type,
      title,
      message,
    });
  }

  function closeToast() {
    setToast((current) => ({
      ...current,
      show: false,
    }));
  }

  function makeAuditEntry({
    action,
    booking,
    actorRole = role || "system",
    details,
  }) {
    return {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      bookingId: booking?.id ?? "",
      riderName: booking?.riderName || "Unknown",
      action,
      actorRole,
      details,
      createdAt: new Date().toLocaleString(),
    };
  }

  function appendAuditToBooking(booking, auditEntry) {
    return {
      ...booking,
      auditTrail: [auditEntry, ...(booking.auditTrail || [])],
    };
  }

  function pushAudit(nextAuditEntry, nextBookings, nextTransactions, nextDrivers) {
    setAppData((current) => ({
      ...current,
      bookings: nextBookings,
      transactions: nextTransactions ?? current.transactions,
      drivers: nextDrivers ?? current.drivers,
      auditLogs: [nextAuditEntry, ...(current.auditLogs || [])],
    }));
  }

  function openBookingDetails(booking) {
    setSelectedBooking(booking);
  }

  function closeBookingDetails() {
    setSelectedBooking(null);
  }

  function openEditBooking(booking) {
    setEditingBooking(booking);
    setEditForm({
      riderName: booking.riderName || "",
      riderPhone: booking.riderPhone || "",
      pickup: booking.pickup || "",
      drop: booking.drop || "",
      rideType: booking.rideType || "Bike",
      paymentMethod: booking.paymentMethod || "Cash",
    });
  }

  function closeEditBooking() {
    setEditingBooking(null);
  }

  function openDeleteBooking(booking) {
    setDeletingBooking(booking);
  }

  function closeDeleteBooking() {
    setDeletingBooking(null);
  }

  function openReceipt(booking) {
    setReceiptBooking(booking);
    setShowReceipt(true);
  }

  function closeReceipt() {
    setShowReceipt(false);
    setReceiptBooking(null);
  }

  function printReceipt() {
    window.print();
  }

  function handleEditChange(event) {
    const { name, value } = event.target;
    setEditForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  useEffect(() => {
    if (!toast.show) return;

    const timer = setTimeout(() => {
      closeToast();
    }, 2600);

    return () => clearTimeout(timer);
  }, [toast.show]);

  useEffect(() => {
    if (!selectedBooking) return;

    const updatedBooking = bookings.find(
      (item) => String(item.id) === String(selectedBooking.id)
    );

    if (updatedBooking) {
      setSelectedBooking(updatedBooking);
    }
  }, [bookings, selectedBooking]);

  useEffect(() => {
    if (!editingBooking) return;

    const updatedBooking = bookings.find(
      (item) => String(item.id) === String(editingBooking.id)
    );

    if (updatedBooking) {
      setEditingBooking(updatedBooking);
    }
  }, [bookings, editingBooking]);

  useEffect(() => {
    if (!deletingBooking) return;

    const updatedBooking = bookings.find(
      (item) => String(item.id) === String(deletingBooking.id)
    );

    if (updatedBooking) {
      setDeletingBooking(updatedBooking);
    }
  }, [bookings, deletingBooking]);

  useEffect(() => {
    if (!receiptBooking) return;

    const updatedBooking = bookings.find(
      (item) => String(item.id) === String(receiptBooking.id)
    );

    if (updatedBooking) {
      setReceiptBooking(updatedBooking);
    }
  }, [bookings, receiptBooking]);

  const selectedRide = useMemo(() => {
    return (
      rideTypeOptions.find((item) => item.value === form.rideType) ||
      rideTypeOptions[0]
    );
  }, [form.rideType]);

  const selectedDriver = useMemo(() => {
    return (
      driverOptions.find(
        (item) => String(item.id) === String(form.assignedDriverId)
      ) || null
    );
  }, [form.assignedDriverId, driverOptions]);

  const farePreview = useMemo(() => {
    const distance = Number(form.distanceKm) || 0;
    return (
      selectedRide.baseFare +
      Math.round(distance * 10 * selectedRide.multiplier)
    );
  }, [form.distanceKm, selectedRide]);

  const bookingStats = useMemo(() => {
    const pending = bookings.filter((item) => item.status === "Pending").length;
    const assigned = bookings.filter(
      (item) => item.status === "Assigned"
    ).length;
    const inProgress = bookings.filter(
      (item) => item.status === "In Progress"
    ).length;
    const completed = bookings.filter(
      (item) => item.status === "Completed"
    ).length;

    if (role === "customer") {
      return [
        {
          id: 1,
          title: "My pending rides",
          value: String(pending).padStart(2, "0"),
          icon: "🕒",
          note: "Waiting for captain action",
        },
        {
          id: 2,
          title: "Assigned rides",
          value: String(assigned).padStart(2, "0"),
          icon: "📍",
          note: "Driver assigned",
        },
        {
          id: 3,
          title: "On-going rides",
          value: String(inProgress).padStart(2, "0"),
          icon: "🛵",
          note: "Ride currently active",
        },
        {
          id: 4,
          title: "Completed rides",
          value: String(completed).padStart(2, "0"),
          icon: "✅",
          note: "Trips completed",
        },
      ];
    }

    if (role === "captain") {
      return [
        {
          id: 1,
          title: "Open rides",
          value: String(pending).padStart(2, "0"),
          icon: "🕒",
          note: "Waiting to be assigned",
        },
        {
          id: 2,
          title: "Assigned rides",
          value: String(assigned).padStart(2, "0"),
          icon: "📍",
          note: "Ready to accept and start",
        },
        {
          id: 3,
          title: "My active ride",
          value: String(inProgress).padStart(2, "0"),
          icon: "🛵",
          note: "Priority captain work now",
        },
        {
          id: 4,
          title: "Completed rides",
          value: String(completed).padStart(2, "0"),
          icon: "✅",
          note: "Successful rides completed",
        },
      ];
    }

    return [
      {
        id: 1,
        title: "Pending bookings",
        value: String(pending).padStart(2, "0"),
        icon: "🕒",
        note: "Waiting for driver assignment",
      },
      {
        id: 2,
        title: "Assigned rides",
        value: String(assigned).padStart(2, "0"),
        icon: "📍",
        note: "Driver linked to booking",
      },
      {
        id: 3,
        title: "In progress",
        value: String(inProgress).padStart(2, "0"),
        icon: "🛵",
        note: "Active ride operations",
      },
      {
        id: 4,
        title: "Completed rides",
        value: String(completed).padStart(2, "0"),
        icon: "✅",
        note: "Successful rides completed",
      },
    ];
  }, [bookings, role]);

  const captainVisibleBookings = useMemo(() => {
    return bookings.filter(
      (booking) =>
        booking.status === "Pending" ||
        booking.status === "Assigned" ||
        booking.status === "In Progress" ||
        booking.status === "Completed"
    );
  }, [bookings]);

  const visibleBookings = role === "captain" ? captainVisibleBookings : bookings;

  const filteredBookings = useMemo(() => {
    return visibleBookings.filter((booking) => {
      const matchesStatus =
        filterStatus === "All" || booking.status === filterStatus;

      const search = searchText.trim().toLowerCase();

      const matchesSearch =
        search === "" ||
        booking.riderName.toLowerCase().includes(search) ||
        booking.riderPhone.toLowerCase().includes(search) ||
        booking.pickup.toLowerCase().includes(search) ||
        booking.drop.toLowerCase().includes(search) ||
        booking.rideType.toLowerCase().includes(search) ||
        booking.paymentMethod.toLowerCase().includes(search) ||
        (booking.assignedDriverName || "").toLowerCase().includes(search);

      return matchesStatus && matchesSearch;
    });
  }, [visibleBookings, filterStatus, searchText]);

  const featuredBooking = useMemo(() => {
    return (
      bookings.find((item) => item.status === "In Progress") ||
      bookings.find((item) => item.status === "Assigned") ||
      bookings.find((item) => item.status === "Pending") ||
      bookings[0] ||
      null
    );
  }, [bookings]);

  const captainActiveRide = useMemo(() => {
    return bookings.find((item) => item.status === "In Progress") || null;
  }, [bookings]);

  const captainQueueBookings = useMemo(() => {
    if (role !== "captain") return [];

    return filteredBookings
      .filter((item) => item.status !== "In Progress")
      .sort((a, b) => Number(b.id) - Number(a.id));
  }, [filteredBookings, role]);

  const recentAuditLogs = useMemo(() => {
    return auditLogs.slice(0, 10);
  }, [auditLogs]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function getSmartAutoDriver() {
    if (onlineDrivers.length === 0) return null;

    const assignedCounts = new Map();

    for (const driver of onlineDrivers) {
      assignedCounts.set(String(driver.id), 0);
    }

    for (const booking of bookings) {
      const isActiveBooking =
        booking.status === "Assigned" || booking.status === "In Progress";

      if (!isActiveBooking) continue;

      const key = String(booking.assignedDriverId || "");
      if (assignedCounts.has(key)) {
        assignedCounts.set(key, assignedCounts.get(key) + 1);
      }
    }

    return [...onlineDrivers].sort((a, b) => {
      const countA = assignedCounts.get(String(a.id)) ?? 0;
      const countB = assignedCounts.get(String(b.id)) ?? 0;

      if (countA !== countB) return countA - countB;
      return String(a.name).localeCompare(String(b.name));
    })[0];
  }

  async function pushBookingsToCloud(nextBookings) {
    if (!firebaseStatus?.connected) {
      return false;
    }

    const success = await saveBookingsToFirestore(nextBookings);
    return success;
  }

  function buildAutoIncomeTransaction(booking) {
    return {
      id: `ride-income-${booking.id}`,
      bookingId: booking.id,
      type: "Income",
      title: `Ride payment • ${booking.riderName}`,
      amount: Number(booking.fare) || 0,
      method: booking.paymentMethod || "Cash",
      createdAt: "Just now",
      source: "Auto Ride Completion",
    };
  }

  function buildRefundTransaction(booking) {
    return {
      id: `ride-refund-${booking.id}`,
      bookingId: booking.id,
      type: "Expense",
      title: `Ride refund • ${booking.riderName}`,
      amount: Number(booking.fare || 0),
      method: booking.paymentMethod || "Wallet",
      createdAt: "Just now",
      source: "Auto Ride Refund",
    };
  }

  function buildGooglePayTransaction(booking) {
    return {
      id: `gpay-income-${booking.id}`,
      bookingId: booking.id,
      type: "Income",
      title: `Google Pay payment • ${booking.riderName}`,
      amount: Number(booking.fare || 0),
      method: "Google Pay",
      createdAt: "Just now",
      source: "Google Pay Payment",
    };
  }

  function recalculateFare(rideType, existingFare) {
    const ride = rideTypeOptions.find((item) => item.value === rideType);
    if (!ride) return Number(existingFare || 0);
    return Number(ride.baseFare || 0);
  }

  function mergeCompletionIntoState(nextBookings, completedBooking) {
    const alreadyExists = transactions.some(
      (item) =>
        String(item.bookingId) === String(completedBooking.id) &&
        item.source === "Auto Ride Completion"
    );

    const nextTransactions = alreadyExists
      ? transactions
      : [buildAutoIncomeTransaction(completedBooking), ...transactions];

    const nextDrivers = syncDriversFromBookings(drivers, nextBookings);

    const auditEntry = makeAuditEntry({
      action: "Ride Completed",
      booking: completedBooking,
      details: `Ride marked completed at fare ₹${Number(completedBooking.fare || 0).toLocaleString()}.`,
    });

    const auditedBookings = nextBookings.map((booking) =>
      String(booking.id) === String(completedBooking.id)
        ? appendAuditToBooking(booking, auditEntry)
        : booking
    );

    pushAudit(auditEntry, auditedBookings, nextTransactions, nextDrivers);

    return !alreadyExists;
  }

  function mergeCancellationIntoState(nextBookings, cancelledBooking) {
    const refundRequired =
      cancelledBooking.paymentMethod === "Online" ||
      cancelledBooking.paymentMethod === "Wallet";

    const refundExists = transactions.some(
      (item) =>
        String(item.bookingId) === String(cancelledBooking.id) &&
        item.source === "Auto Ride Refund"
    );

    const refundAdded = refundRequired && !refundExists;

    const nextTransactions = refundAdded
      ? [buildRefundTransaction(cancelledBooking), ...transactions]
      : transactions;

    const nextDrivers = syncDriversFromBookings(drivers, nextBookings);

    const auditEntry = makeAuditEntry({
      action: "Booking Cancelled",
      booking: cancelledBooking,
      details: refundRequired
        ? `Booking cancelled. Refund status: ${refundAdded ? "recorded" : "already existed"}.`
        : "Booking cancelled. No refund required.",
    });

    const auditedBookings = nextBookings.map((booking) =>
      String(booking.id) === String(cancelledBooking.id)
        ? appendAuditToBooking(booking, auditEntry)
        : booking
    );

    pushAudit(auditEntry, auditedBookings, nextTransactions, nextDrivers);

    return {
      refundRequired,
      refundAdded,
      refundExists,
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSaveMessage("");

    if (
      !form.riderName.trim() ||
      !form.riderPhone.trim() ||
      !form.pickup.trim() ||
      !form.drop.trim()
    ) {
      const message = "Please fill all booking fields before adding a booking.";
      setError(message);
      showToast("error", "Booking not created", message);
      return;
    }

    const manuallySelectedDriver =
      role === "admin"
        ? driverOptions.find(
            (item) => String(item.id) === String(form.assignedDriverId)
          ) || null
        : null;

    const autoDriver = getSmartAutoDriver();

    const driverToAssign = manuallySelectedDriver || autoDriver || null;

    const tempBooking = {
      id: Date.now(),
      riderName: form.riderName.trim(),
      riderPhone: form.riderPhone.trim(),
      pickup: form.pickup.trim(),
      drop: form.drop.trim(),
      rideType: form.rideType,
      paymentMethod: form.paymentMethod,
      paymentStatus: "Pending",
      assignedDriverId: driverToAssign ? driverToAssign.id : "",
      assignedDriverName: driverToAssign ? driverToAssign.name : "",
      fare: farePreview,
      status: driverToAssign ? "Assigned" : "Pending",
      rideStage: driverToAssign ? "Driver Assigned" : "Waiting",
      createdAt: "Just now",
      requestedByRole: role || "customer",
      assignmentMode: manuallySelectedDriver
        ? "Manual"
        : driverToAssign
        ? "Auto"
        : "Unassigned",
      refundStatus: "Not Required",
      auditTrail: [],
    };

    const createAudit = makeAuditEntry({
      action: "Booking Created",
      booking: tempBooking,
      details: `Created with ${tempBooking.rideType}, ${tempBooking.paymentMethod}, fare ₹${Number(tempBooking.fare || 0).toLocaleString()}.`,
    });
    pushNotification(setAppData, createNotification({
  type: "success",
  title: "Booking Created",
  message: `${form.riderName} booking created successfully`,
  role
}));

    const newBooking = appendAuditToBooking(tempBooking, createAudit);

    const nextBookings = [newBooking, ...bookings];
    const nextDrivers = syncDriversFromBookings(drivers, nextBookings);

    pushAudit(createAudit, nextBookings, transactions, nextDrivers);

    const cloudSaved = await pushBookingsToCloud(nextBookings);

    const message = cloudSaved
      ? "Bookings saved to Firebase + Local ✅"
      : "Bookings saved locally only (Firebase failed)";

    setSaveMessage(message);

    if (driverToAssign) {
      showToast(
        cloudSaved ? "success" : "warning",
        manuallySelectedDriver ? "Booking created" : "Driver auto-assigned",
        manuallySelectedDriver
          ? `${newBooking.riderName} assigned to ${driverToAssign.name}.`
          : `${driverToAssign.name} was auto-assigned to ${newBooking.riderName}.`
      );
    } else {
      showToast(
        cloudSaved ? "success" : "warning",
        role === "customer" ? "Ride requested" : "Booking created",
        "No online driver available right now. Booking is pending."
      );
    }

    setForm({
      riderName: "",
      riderPhone: "",
      pickup: "",
      drop: "",
      rideType: "Bike",
      paymentMethod: "Cash",
      assignedDriverId: "",
      distanceKm: 2,
    });
  }

  async function handleSaveEdit(event) {
    event.preventDefault();

    if (
      !editingBooking ||
      !editForm.riderName.trim() ||
      !editForm.riderPhone.trim() ||
      !editForm.pickup.trim() ||
      !editForm.drop.trim()
    ) {
      showToast(
        "error",
        "Edit failed",
        "Please fill all booking fields before saving."
      );
      return;
    }

    let updatedBooking = null;

    const nextBookings = bookings.map((booking) => {
      if (String(booking.id) !== String(editingBooking.id)) {
        return booking;
      }

      updatedBooking = {
        ...booking,
        riderName: editForm.riderName.trim(),
        riderPhone: editForm.riderPhone.trim(),
        pickup: editForm.pickup.trim(),
        drop: editForm.drop.trim(),
        rideType: editForm.rideType,
        paymentMethod: editForm.paymentMethod,
        fare: recalculateFare(editForm.rideType, booking.fare),
      };

      return updatedBooking;
    });

    if (!updatedBooking) return;

    const auditEntry = makeAuditEntry({
      action: "Booking Edited",
      booking: updatedBooking,
      details: `Updated rider/route/payment. New fare ₹${Number(updatedBooking.fare || 0).toLocaleString()}.`,
    });

    const auditedBookings = nextBookings.map((booking) =>
      String(booking.id) === String(updatedBooking.id)
        ? appendAuditToBooking(booking, auditEntry)
        : booking
    );

    const nextDrivers = syncDriversFromBookings(drivers, auditedBookings);

    pushAudit(auditEntry, auditedBookings, transactions, nextDrivers);

    const cloudSaved = await pushBookingsToCloud(auditedBookings);

    setSaveMessage(
      cloudSaved ? "Booking updated successfully ✅" : "Booking updated locally only"
    );

    showToast(
      cloudSaved ? "success" : "warning",
      "Booking updated",
      `${editForm.riderName}'s booking details were updated.`
    );

    closeEditBooking();
  }

  async function handlePermanentDelete() {
    if (!deletingBooking) return;

    if (deletingBooking.status === "In Progress") {
      showToast(
        "error",
        "Delete blocked",
        "In-progress rides cannot be deleted. Complete or cancel the ride first."
      );
      return;
    }

    const deleteAudit = makeAuditEntry({
      action: "Booking Deleted",
      booking: deletingBooking,
      details: `Deleted permanently from booking list.`,
    });

    const nextBookings = bookings.filter(
      (booking) => String(booking.id) !== String(deletingBooking.id)
    );

    const nextDrivers = syncDriversFromBookings(drivers, nextBookings);

    setAppData((current) => ({
      ...current,
      bookings: nextBookings,
      drivers: nextDrivers,
      auditLogs: [deleteAudit, ...(current.auditLogs || [])],
    }));

    const cloudSaved = await pushBookingsToCloud(nextBookings);

    setSaveMessage(
      cloudSaved ? "Booking deleted permanently ✅" : "Booking deleted locally only"
    );

    showToast(
      cloudSaved ? "success" : "warning",
      "Booking deleted",
      `${deletingBooking.riderName}'s booking was deleted permanently.`
    );

    if (
      selectedBooking &&
      String(selectedBooking.id) === String(deletingBooking.id)
    ) {
      setSelectedBooking(null);
    }

    closeDeleteBooking();
  }

  function handleGooglePay(bookingId) {
    const bookingToPay = bookings.find((b) => b.id === bookingId);
    if (!bookingToPay) return;
pushNotification(setAppData, createNotification({
  type: "success",
  title: "Payment Received",
  message: `₹${bookingToPay.fare} received via Google Pay`,
  role
}));
    const alreadyPaid =
      bookingToPay.paymentStatus === "Paid" ||
      transactions.some(
        (item) =>
          String(item.bookingId) === String(bookingId) &&
          item.source === "Google Pay Payment"
      );

    if (alreadyPaid) {
      showToast("info", "Already Paid", "This booking is already paid.");
      return;
    }

    const nextBookings = bookings.map((b) => {
      if (b.id !== bookingId) return b;

      return {
        ...b,
        paymentMethod: "Google Pay",
        paymentStatus: "Paid",
      };
    });

    const paymentTransaction = buildGooglePayTransaction({
      ...bookingToPay,
      paymentMethod: "Google Pay",
      paymentStatus: "Paid",
    });

    const paidBooking = {
      ...bookingToPay,
      paymentMethod: "Google Pay",
      paymentStatus: "Paid",
    };

    const auditEntry = makeAuditEntry({
      action: "Payment Completed",
      booking: paidBooking,
      details: `Paid via Google Pay for ₹${Number(paidBooking.fare || 0).toLocaleString()}.`,
    });

    const auditedBookings = nextBookings.map((booking) =>
      String(booking.id) === String(bookingId)
        ? appendAuditToBooking(booking, auditEntry)
        : booking
    );

    pushAudit(
      auditEntry,
      auditedBookings,
      [paymentTransaction, ...transactions],
      drivers
    );

    showToast(
      "success",
      "Payment Successful",
      "Paid via Google Pay and added to ledger ✅"
    );
  }

  async function assignDriverToBooking(bookingId) {
    const fallbackDriver =
      driverOptions.find((item) => item.status === "Online") || driverOptions[0];
    if (!fallbackDriver) return;

    let updatedBooking = null;

    const nextBookings = bookings.map((booking) => {
      if (
        booking.id !== bookingId ||
        booking.status === "Completed" ||
        booking.status === "Cancelled"
      ) {
        return booking;
      }

      updatedBooking = {
        ...booking,
        assignedDriverId: fallbackDriver.id,
        assignedDriverName: fallbackDriver.name,
        status: "Assigned",
        rideStage: "Driver Assigned",
        assignmentMode: "Manual",
      };

      return updatedBooking;
    });

    if (!updatedBooking) return;

    const auditEntry = makeAuditEntry({
      action: "Driver Reassigned",
      booking: updatedBooking,
      details: `Assigned to ${updatedBooking.assignedDriverName}.`,
    });

    const auditedBookings = nextBookings.map((booking) =>
      String(booking.id) === String(updatedBooking.id)
        ? appendAuditToBooking(booking, auditEntry)
        : booking
    );

    const nextDrivers = syncDriversFromBookings(drivers, auditedBookings);

    pushAudit(auditEntry, auditedBookings, transactions, nextDrivers);

    const cloudSaved = await pushBookingsToCloud(auditedBookings);
    const message = cloudSaved
      ? "Bookings saved to Firebase + Local ✅"
      : "Bookings saved locally only (Firebase failed)";

    setSaveMessage(message);

    showToast(
      cloudSaved ? "success" : "warning",
      "Driver assigned",
      `${updatedBooking.assignedDriverName || "Driver"} assigned to ${updatedBooking.riderName}.`
    );
  }

  async function markCompleted(bookingId) {
    let completedBooking = null;
    pushNotification(setAppData, createNotification({
  type: "success",
  title: "Ride Completed",
  message: `${completedBooking.riderName}'s ride completed`,
  role
}));

    const nextBookings = bookings.map((booking) => {
      if (booking.id !== bookingId || booking.status === "Cancelled") {
        return booking;
      }

      const updated = {
        ...booking,
        status: "Completed",
        rideStage: "Completed",
      };

      completedBooking = updated;
      return updated;
    });

    if (!completedBooking) return;

    const addedIncome = mergeCompletionIntoState(nextBookings, completedBooking);
    const cloudSaved = await pushBookingsToCloud(
      bookings.map((booking) => booking)
    );

    const message = addedIncome
      ? cloudSaved
        ? "Ride completed and wallet income added automatically ✅"
        : "Ride completed and wallet income added locally only"
      : cloudSaved
      ? "Ride completed. Income was already recorded ✅"
      : "Ride completed locally only. Income already existed";

    setSaveMessage(message);

    showToast(
      addedIncome ? "success" : "info",
      "Ride completed",
      addedIncome
        ? `₹${completedBooking.fare} added to wallet for ${completedBooking.riderName}.`
        : `Ride for ${completedBooking.riderName} was completed.`
    );
  }

  async function cancelBooking(bookingId) {
    let cancelledBooking = null;
    pushNotification(setAppData, createNotification({
  type: "warning",
  title: "Booking Cancelled",
  message: `${cancelledBooking.riderName}'s booking cancelled`,
  role
}));

    const nextBookings = bookings.map((booking) => {
      if (booking.id !== bookingId || booking.status === "Completed") {
        return booking;
      }

      const refundRequired =
        booking.paymentMethod === "Online" || booking.paymentMethod === "Wallet";

      cancelledBooking = {
        ...booking,
        status: "Cancelled",
        refundStatus: refundRequired ? "Refunded" : "Not Required",
      };

      return cancelledBooking;
    });

    if (!cancelledBooking) return;

    const { refundRequired, refundAdded, refundExists } =
      mergeCancellationIntoState(nextBookings, cancelledBooking);

    const cloudSaved = await pushBookingsToCloud(
      bookings.map((booking) => booking)
    );

    const message = refundRequired
      ? refundAdded
        ? cloudSaved
          ? "Booking cancelled and refund recorded automatically ✅"
          : "Booking cancelled and refund recorded locally only"
        : refundExists
        ? cloudSaved
          ? "Booking cancelled. Refund was already recorded ✅"
          : "Booking cancelled locally only. Refund already existed"
        : cloudSaved
        ? "Booking cancelled ✅"
        : "Booking cancelled locally only"
      : cloudSaved
      ? "Booking cancelled. No refund required ✅"
      : "Booking cancelled locally only. No refund required";

    setSaveMessage(message);

    showToast(
      refundRequired ? "warning" : "info",
      "Booking cancelled",
      refundRequired
        ? refundAdded
          ? `Refund of ₹${cancelledBooking.fare} recorded for ${cancelledBooking.riderName}.`
          : `Booking for ${cancelledBooking.riderName} cancelled. Refund was already recorded.`
        : `Booking for ${cancelledBooking.riderName} cancelled. No refund required.`
    );
  }

  async function captainAcceptRide(bookingId) {
    const captainDriver =
      driverOptions.find((item) => item.status === "Online") || driverOptions[0];
    if (!captainDriver) return;

    let acceptedBooking = null;

    const nextBookings = bookings.map((booking) => {
      if (booking.id !== bookingId) return booking;
      if (booking.status !== "Pending" && booking.status !== "Assigned") {
        return booking;
      }

      acceptedBooking = {
        ...booking,
        assignedDriverId: booking.assignedDriverId || captainDriver.id,
        assignedDriverName:
          booking.assignedDriverName || captainDriver.name,
        status: "In Progress",
        rideStage: "Driver Assigned",
      };

      return acceptedBooking;
    });

    if (!acceptedBooking) return;

    const auditEntry = makeAuditEntry({
      action: "Ride Accepted",
      booking: acceptedBooking,
      actorRole: "captain",
      details: `Captain accepted ride. Current stage: ${acceptedBooking.rideStage}.`,
    });

    const auditedBookings = nextBookings.map((booking) =>
      String(booking.id) === String(acceptedBooking.id)
        ? appendAuditToBooking(booking, auditEntry)
        : booking
    );

    const nextDrivers = syncDriversFromBookings(drivers, auditedBookings);

    pushAudit(auditEntry, auditedBookings, transactions, nextDrivers);

    const cloudSaved = await pushBookingsToCloud(auditedBookings);
    const message = cloudSaved
      ? "Ride accepted and synced ✅"
      : "Ride accepted locally only";

    setSaveMessage(message);

    showToast(
      cloudSaved ? "success" : "warning",
      "Ride accepted",
      `${acceptedBooking.riderName}'s ride is now in progress.`
    );
  }

  async function captainUpdateStage(bookingId) {
    let stageBooking = null;
    let nextStageLabel = "";

    const nextBookings = bookings.map((booking) => {
      if (booking.id !== bookingId) return booking;
      if (booking.status !== "In Progress") return booking;

      const currentStage = booking.rideStage || "Driver Assigned";
      const nextStage = getNextRideStage(currentStage);

      nextStageLabel = nextStage;
      stageBooking = {
        ...booking,
        rideStage: nextStage,
      };

      return stageBooking;
    });

    if (!stageBooking || !nextStageLabel) return;

    const auditEntry = makeAuditEntry({
      action: "Ride Stage Updated",
      booking: stageBooking,
      actorRole: "captain",
      details: `Ride stage moved to ${nextStageLabel}.`,
    });

    const auditedBookings = nextBookings.map((booking) =>
      String(booking.id) === String(stageBooking.id)
        ? appendAuditToBooking(booking, auditEntry)
        : booking
    );

    const nextDrivers = syncDriversFromBookings(drivers, auditedBookings);

    pushAudit(auditEntry, auditedBookings, transactions, nextDrivers);

    const cloudSaved = await pushBookingsToCloud(auditedBookings);
    const message = cloudSaved
      ? "Ride stage updated and synced ✅"
      : "Ride stage updated locally only";

    setSaveMessage(message);

    showToast(
      "info",
      "Ride stage updated",
      `${stageBooking.riderName} is now at: ${nextStageLabel}.`
    );
  }

  async function captainCompleteRide(bookingId) {
    let completedBooking = null;

    const nextBookings = bookings.map((booking) => {
      if (booking.id !== bookingId) return booking;
      if (booking.status !== "In Progress") return booking;
      if (booking.rideStage !== "Trip Ending") return booking;

      const updated = {
        ...booking,
        status: "Completed",
        rideStage: "Completed",
      };

      completedBooking = updated;
      return updated;
    });

    if (!completedBooking) return;

    const addedIncome = mergeCompletionIntoState(nextBookings, completedBooking);
    const cloudSaved = await pushBookingsToCloud(
      bookings.map((booking) => booking)
    );

    const message =
      addedIncome
        ? cloudSaved
          ? "Ride completed and wallet income added automatically ✅"
          : "Ride completed and wallet income added locally only"
        : cloudSaved
        ? "Ride completed. Income was already recorded ✅"
        : "Ride completed locally only. Income already existed";

    setSaveMessage(message);

    showToast(
      addedIncome ? "success" : "info",
      "Trip completed",
      addedIncome
        ? `Trip finished. ₹${completedBooking.fare} added to wallet.`
        : `Trip for ${completedBooking.riderName} completed successfully.`
    );
  }

  useEffect(() => {
    const activeRide = bookings.find((item) => item.status === "In Progress");
    if (!activeRide) return;

    const timer = setTimeout(async () => {
      const currentRide = bookings.find((item) => item.id === activeRide.id);
      if (!currentRide || currentRide.status !== "In Progress") return;

      if (currentRide.rideStage === "Trip Ending") {
        let completedBooking = null;

        const nextBookings = bookings.map((booking) => {
          if (booking.id !== currentRide.id) return booking;

          const updated = {
            ...booking,
            status: "Completed",
            rideStage: "Completed",
          };

          completedBooking = updated;
          return updated;
        });

        if (!completedBooking) return;

        const addedIncomeAlreadyExists = transactions.some(
          (item) =>
            String(item.bookingId) === String(completedBooking.id) &&
            item.source === "Auto Ride Completion"
        );

        const nextTransactions = addedIncomeAlreadyExists
          ? transactions
          : [buildAutoIncomeTransaction(completedBooking), ...transactions];

        const autoAudit = makeAuditEntry({
          action: "Auto Ride Completed",
          booking: completedBooking,
          actorRole: "system",
          details: addedIncomeAlreadyExists
            ? "Ride auto-completed by simulation."
            : "Ride auto-completed by simulation and income added.",
        });

        const auditedBookings = nextBookings.map((booking) =>
          String(booking.id) === String(completedBooking.id)
            ? appendAuditToBooking(booking, autoAudit)
            : booking
        );

        const nextDrivers = syncDriversFromBookings(drivers, auditedBookings);

        pushAudit(autoAudit, auditedBookings, nextTransactions, nextDrivers);

        await pushBookingsToCloud(auditedBookings);

        showToast(
          addedIncomeAlreadyExists ? "info" : "success",
          "Auto trip completed",
          addedIncomeAlreadyExists
            ? `${completedBooking.riderName}'s trip completed automatically.`
            : `${completedBooking.riderName}'s trip completed automatically and income was added.`
        );

        setSaveMessage(
          addedIncomeAlreadyExists
            ? "Auto simulation completed the ride ✅"
            : "Auto simulation completed the ride and added income ✅"
        );

        return;
      }

      const nextStage = getNextRideStage(
        currentRide.rideStage || "Driver Assigned"
      );
      if (nextStage === currentRide.rideStage) return;

      const nextBookings = bookings.map((booking) => {
        if (booking.id !== currentRide.id) return booking;

        return {
          ...booking,
          rideStage: nextStage,
        };
      });

      const autoAudit = makeAuditEntry({
        action: "Auto Ride Stage Updated",
        booking: { ...currentRide, rideStage: nextStage },
        actorRole: "system",
        details: `Simulation moved ride to ${nextStage}.`,
      });

      const auditedBookings = nextBookings.map((booking) =>
        String(booking.id) === String(currentRide.id)
          ? appendAuditToBooking(booking, autoAudit)
          : booking
      );

      const nextDrivers = syncDriversFromBookings(drivers, auditedBookings);

      pushAudit(autoAudit, auditedBookings, transactions, nextDrivers);

      await pushBookingsToCloud(auditedBookings);

      showToast(
        "info",
        "Auto ride update",
        `${currentRide.riderName} is now at: ${nextStage}.`
      );

      setSaveMessage(`Auto simulation moved ride to: ${nextStage} ✅`);
    }, 5000);

    return () => clearTimeout(timer);
  }, [bookings, transactions, drivers, firebaseStatus, setAppData, role]);

  function renderMapPanel() {
    if (!featuredBooking) {
      return (
        <section className="glass panel">
          <div className="panel-head">
            <h3>Live ride map</h3>
            <span className="panel-tag">Step 42</span>
          </div>
          <div className="empty-state">
            <div>
              <div className="empty-icon">🗺️</div>
              <h4>No active ride yet</h4>
              <p>Create or open a booking to see driver movement simulation.</p>
            </div>
          </div>
        </section>
      );
    }

    const progress = stageToProgress(featuredBooking.rideStage || "Waiting");

    return (
      <section className="glass panel">
        <div className="panel-head">
          <h3>Live ride map</h3>
          <span className="panel-tag">Step 42</span>
        </div>

        <div
          style={{
            borderRadius: "24px",
            padding: "16px",
            border: "1px solid rgba(255,255,255,0.1)",
            background:
              "radial-gradient(circle at 20% 20%, rgba(110,231,255,0.14), transparent 20%), radial-gradient(circle at 80% 75%, rgba(139,92,246,0.16), transparent 22%), linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "12px",
              flexWrap: "wrap",
              marginBottom: "14px",
              color: "var(--text-soft)",
              fontSize: "0.92rem",
            }}
          >
            <span>
              {featuredBooking.pickup} → {featuredBooking.drop}
            </span>
            <strong style={{ color: "var(--text)" }}>
              {featuredBooking.rideStage || "Waiting"}
            </strong>
          </div>

          <div
            style={{
              position: "relative",
              height: "190px",
              borderRadius: "22px",
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.08)",
              background:
                "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
              backgroundSize: "26px 26px, 26px 26px, auto",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: "26px",
                top: "28px",
                width: "18px",
                height: "18px",
                borderRadius: "999px",
                background: "#22c55e",
                boxShadow: "0 0 14px rgba(34,197,94,0.75)",
              }}
            />
            <div
              style={{
                position: "absolute",
                right: "28px",
                bottom: "26px",
                width: "18px",
                height: "18px",
                borderRadius: "999px",
                background: "#ef4444",
                boxShadow: "0 0 14px rgba(239,68,68,0.75)",
              }}
            />

            <div
              style={{
                position: "absolute",
                left: "44px",
                top: "38px",
                width: "calc(100% - 90px)",
                height: "4px",
                background:
                  "linear-gradient(to right, rgba(255,255,255,0.18), rgba(255,255,255,0.35), rgba(255,255,255,0.18))",
                transform: "rotate(25deg)",
                transformOrigin: "left center",
                borderRadius: "999px",
              }}
            />

            <div
              style={{
                position: "absolute",
                left: `calc(${progress}% - 14px)`,
                top: `calc(${progress * 0.9}% - 6px)`,
                width: "30px",
                height: "30px",
                borderRadius: "999px",
                display: "grid",
                placeItems: "center",
                background:
                  "linear-gradient(135deg, var(--accent), var(--accent-2))",
                color: "white",
                fontSize: "1rem",
                boxShadow: "0 10px 26px rgba(0,0,0,0.26)",
                transition: "all 0.35s ease",
              }}
            >
              🛵
            </div>
          </div>
        </div>
      </section>
    );
  }

  function renderCaptainActiveRidePanel() {
    if (!captainActiveRide) {
      return (
        <section className="glass panel">
          <div className="panel-head">
            <h3>My Active Ride</h3>
            <span className="panel-tag">Captain Focus</span>
          </div>

          <div className="wallet-guide-list">
            <article className="wallet-guide-card">
              <div className="fare-guide-icon">🛵</div>
              <div>
                <h4>No active ride right now</h4>
                <p>Accept a pending or assigned ride to start your captain workflow.</p>
              </div>
            </article>
          </div>
        </section>
      );
    }

    const progress = stageToProgress(
      captainActiveRide.rideStage || "Driver Assigned"
    );

    return (
      <section className="glass panel">
        <div className="panel-head">
          <h3>My Active Ride</h3>
          <span className="panel-tag">Captain Focus</span>
        </div>

        <div
          style={{
            borderRadius: "22px",
            padding: "16px",
            background:
              "linear-gradient(135deg, rgba(110,231,255,0.14), rgba(139,92,246,0.14))",
            border: "1px solid rgba(255,255,255,0.12)",
            display: "grid",
            gap: "14px",
          }}
        >
          <div>
            <h4 style={{ margin: 0 }}>{captainActiveRide.riderName}</h4>
            <p style={{ margin: "6px 0 0", color: "var(--text-soft)" }}>
              {captainActiveRide.pickup} → {captainActiveRide.drop}
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: "12px",
            }}
          >
            <div className="booking-meta-item">
              <span className="booking-meta-label">Ride Stage</span>
              <strong>{captainActiveRide.rideStage}</strong>
            </div>

            <div className="booking-meta-item">
              <span className="booking-meta-label">Fare</span>
              <strong>₹{captainActiveRide.fare}</strong>
            </div>
          </div>

          <div>
            <div
              style={{
                height: "10px",
                borderRadius: "999px",
                background: "rgba(255,255,255,0.10)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: "100%",
                  borderRadius: "999px",
                  background:
                    "linear-gradient(135deg, var(--accent), var(--accent-2))",
                }}
              />
            </div>
          </div>

          <div className="booking-actions">
            <button
              type="button"
              className="secondary-btn small-btn"
              onClick={() => captainUpdateStage(captainActiveRide.id)}
              disabled={captainActiveRide.rideStage === "Trip Ending"}
            >
              Update Stage
            </button>

            <button
              type="button"
              className="primary-btn small-btn"
              onClick={() => captainCompleteRide(captainActiveRide.id)}
              disabled={captainActiveRide.rideStage !== "Trip Ending"}
            >
              Complete Ride
            </button>

            <button
              type="button"
              className="secondary-btn small-btn"
              onClick={() => openBookingDetails(captainActiveRide)}
            >
              View Details
            </button>
          </div>
        </div>
      </section>
    );
  }

  function renderAdminForm() {
    return (
      <section className="glass panel">
        <div className="panel-head">
          <h3>New booking form</h3>
          <span className="panel-tag">Step 42</span>
        </div>

        <form className="booking-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label className="form-field">
              <span>Rider name</span>
              <input
                type="text"
                name="riderName"
                value={form.riderName}
                onChange={handleChange}
                placeholder="Enter rider name"
              />
            </label>

            <label className="form-field">
              <span>Rider phone</span>
              <input
                type="text"
                name="riderPhone"
                value={form.riderPhone}
                onChange={handleChange}
                placeholder="Enter phone number"
              />
            </label>

            <label className="form-field form-field-full">
              <span>Pickup location</span>
              <input
                type="text"
                name="pickup"
                value={form.pickup}
                onChange={handleChange}
                placeholder="Enter pickup point"
              />
            </label>

            <label className="form-field form-field-full">
              <span>Drop location</span>
              <input
                type="text"
                name="drop"
                value={form.drop}
                onChange={handleChange}
                placeholder="Enter destination"
              />
            </label>

            <label className="form-field">
              <span>Ride type</span>
              <select
                name="rideType"
                value={form.rideType}
                onChange={handleChange}
              >
                {rideTypeOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span>Payment method</span>
              <select
                name="paymentMethod"
                value={form.paymentMethod}
                onChange={handleChange}
              >
                {paymentOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span>Assign driver (optional)</span>
              <select
                name="assignedDriverId"
                value={form.assignedDriverId}
                onChange={handleChange}
              >
                <option value="">Auto assign online driver</option>
                {driverOptions.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name} • {driver.vehicle} • {driver.status}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span>Estimated distance (km)</span>
              <input
                type="number"
                min="1"
                name="distanceKm"
                value={form.distanceKm}
                onChange={handleChange}
                placeholder="Distance in km"
              />
            </label>

            <div className="fare-preview-card">
              <p className="fare-preview-label">Estimated fare</p>
              <h3 className="fare-preview-value">₹{farePreview}</h3>
              <p className="fare-preview-note">
                {selectedRide.label} • base ₹{selectedRide.baseFare}
              </p>
              <p className="fare-preview-note">
                Driver: {selectedDriver ? selectedDriver.name : "Smart auto-assign"}
              </p>
            </div>
          </div>

          {error ? <div className="form-error">{error}</div> : null}
          {saveMessage ? <div className="form-success">{saveMessage}</div> : null}

          <div className="form-actions">
            <button className="primary-btn" type="submit">
              Add Booking
            </button>
          </div>
        </form>
      </section>
    );
  }

  function renderCaptainPanel() {
    return (
      <section className="glass panel">
        <div className="panel-head">
          <h3>Captain ride operations</h3>
          <span className="panel-tag">Step 42</span>
        </div>

        <div className="fare-guide-list">
          <article className="fare-guide-card">
            <div className="fare-guide-icon">🧾</div>
            <div>
              <h4>Audit trail ready</h4>
              <p>Every important booking action now writes a history entry.</p>
            </div>
          </article>

          <article className="fare-guide-card">
            <div className="fare-guide-icon">💳</div>
            <div>
              <h4>Google Pay ledger ready</h4>
              <p>Google Pay payments create income entries automatically.</p>
            </div>
          </article>

          <article className="fare-guide-card">
            <div className="fare-guide-icon">⚡</div>
            <div>
              <h4>Real-time ride engine</h4>
              <p>In-progress rides can keep moving automatically through stages.</p>
            </div>
          </article>
        </div>

        {saveMessage ? (
          <div className="form-success" style={{ marginTop: "14px" }}>
            {saveMessage}
          </div>
        ) : null}
      </section>
    );
  }

  function renderCustomerForm() {
    return (
      <section className="glass panel">
        <div className="panel-head">
          <h3>Request a ride</h3>
          <span className="panel-tag">Step 42</span>
        </div>

        <form className="booking-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label className="form-field">
              <span>Your name</span>
              <input
                type="text"
                name="riderName"
                value={form.riderName}
                onChange={handleChange}
                placeholder="Enter your name"
              />
            </label>

            <label className="form-field">
              <span>Your phone</span>
              <input
                type="text"
                name="riderPhone"
                value={form.riderPhone}
                onChange={handleChange}
                placeholder="Enter your phone number"
              />
            </label>

            <label className="form-field form-field-full">
              <span>Pickup location</span>
              <input
                type="text"
                name="pickup"
                value={form.pickup}
                onChange={handleChange}
                placeholder="Where should captain pick you up?"
              />
            </label>

            <label className="form-field form-field-full">
              <span>Drop location</span>
              <input
                type="text"
                name="drop"
                value={form.drop}
                onChange={handleChange}
                placeholder="Where do you want to go?"
              />
            </label>

            <label className="form-field">
              <span>Ride type</span>
              <select
                name="rideType"
                value={form.rideType}
                onChange={handleChange}
              >
                {rideTypeOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span>Payment method</span>
              <select
                name="paymentMethod"
                value={form.paymentMethod}
                onChange={handleChange}
              >
                {paymentOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field form-field-full">
              <span>Estimated distance (km)</span>
              <input
                type="number"
                min="1"
                name="distanceKm"
                value={form.distanceKm}
                onChange={handleChange}
                placeholder="Distance in km"
              />
            </label>

            <div className="fare-preview-card form-field-full">
              <p className="fare-preview-label">Estimated fare</p>
              <h3 className="fare-preview-value">₹{farePreview}</h3>
              <p className="fare-preview-note">
                {selectedRide.label} • base ₹{selectedRide.baseFare}
              </p>
              <p className="fare-preview-note">
                Online drivers will be auto-assigned when available.
              </p>
            </div>
          </div>

          {error ? <div className="form-error">{error}</div> : null}
          {saveMessage ? <div className="form-success">{saveMessage}</div> : null}

          <div className="form-actions">
            <button className="primary-btn" type="submit">
              Request Ride
            </button>
          </div>
        </form>
      </section>
    );
  }

  function renderActionsForBooking(booking) {
    if (role === "admin") {
      return (
        <div className="booking-actions">
          <button
            type="button"
            className="secondary-btn small-btn"
            onClick={() => openBookingDetails(booking)}
          >
            View Details
          </button>

          <button
            type="button"
            className="secondary-btn small-btn"
            onClick={() => openEditBooking(booking)}
            disabled={
              booking.status === "Completed" || booking.status === "Cancelled"
            }
          >
            Edit Booking
          </button>

          {(booking.status !== "Completed" &&
            (!booking.paymentStatus || booking.paymentStatus === "Pending")) && (
            <button
              type="button"
              className="primary-btn small-btn"
              onClick={() => handleGooglePay(booking.id)}
            >
              Pay via Google Pay
            </button>
          )}

          {booking.paymentStatus === "Paid" && (
            <button
              type="button"
              className="secondary-btn small-btn"
              onClick={() => openReceipt(booking)}
            >
              View Receipt
            </button>
          )}

          <button
            type="button"
            className="secondary-btn small-btn"
            onClick={() => assignDriverToBooking(booking.id)}
            disabled={
              booking.status === "Completed" || booking.status === "Cancelled"
            }
          >
            Reassign Driver
          </button>

          <button
            type="button"
            className="secondary-btn small-btn"
            onClick={() => markCompleted(booking.id)}
            disabled={
              booking.status === "Completed" || booking.status === "Cancelled"
            }
          >
            Mark Completed
          </button>

          <button
            type="button"
            className="danger-btn small-btn"
            onClick={() => cancelBooking(booking.id)}
            disabled={
              booking.status === "Completed" || booking.status === "Cancelled"
            }
          >
            Cancel
          </button>

          <button
            type="button"
            className="danger-btn small-btn"
            onClick={() => openDeleteBooking(booking)}
            disabled={booking.status === "In Progress"}
          >
            Delete Permanently
          </button>
        </div>
      );
    }

    if (role === "captain") {
      if (booking.status === "In Progress") {
        return (
          <div className="booking-actions">
            <button
              type="button"
              className="secondary-btn small-btn"
              onClick={() => openBookingDetails(booking)}
            >
              View Details
            </button>

            {booking.paymentStatus === "Paid" && (
              <button
                type="button"
                className="secondary-btn small-btn"
                onClick={() => openReceipt(booking)}
              >
                View Receipt
              </button>
            )}
          </div>
        );
      }

      return (
        <div className="booking-actions">
          <button
            type="button"
            className="secondary-btn small-btn"
            onClick={() => openBookingDetails(booking)}
          >
            View Details
          </button>

          {booking.paymentStatus === "Paid" && (
            <button
              type="button"
              className="secondary-btn small-btn"
              onClick={() => openReceipt(booking)}
            >
              View Receipt
            </button>
          )}

          <button
            type="button"
            className="secondary-btn small-btn"
            onClick={() => captainAcceptRide(booking.id)}
            disabled={
              booking.status !== "Pending" && booking.status !== "Assigned"
            }
          >
            Accept Ride
          </button>
        </div>
      );
    }

    return (
      <div className="booking-actions">
        <button
          type="button"
          className="secondary-btn small-btn"
          onClick={() => openBookingDetails(booking)}
        >
          View Details
        </button>

        {(booking.status !== "Completed" &&
          (!booking.paymentStatus || booking.paymentStatus === "Pending")) && (
          <button
            type="button"
            className="primary-btn small-btn"
            onClick={() => handleGooglePay(booking.id)}
          >
            Pay via Google Pay
          </button>
        )}

        {booking.paymentStatus === "Paid" && (
          <button
            type="button"
            className="secondary-btn small-btn"
            onClick={() => openReceipt(booking)}
          >
            View Receipt
          </button>
        )}
      </div>
    );
  }

  function renderBookingDetailsModal() {
    if (!selectedBooking) return null;

    const progress = stageToProgress(selectedBooking.rideStage || "Waiting");
    const bookingAuditTrail = selectedBooking.auditTrail || [];

    return (
      <div
        onClick={closeBookingDetails}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          zIndex: 9998,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "18px",
        }}
      >
        <div
          className="glass"
          onClick={(event) => event.stopPropagation()}
          style={{
            width: "min(960px, 100%)",
            maxHeight: "90vh",
            overflowY: "auto",
            borderRadius: "24px",
            padding: "18px",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 24px 60px rgba(0,0,0,0.34)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "14px",
              alignItems: "center",
              marginBottom: "14px",
            }}
          >
            <div>
              <div className="pill">Booking Details</div>
              <h3 style={{ margin: "10px 0 0" }}>{selectedBooking.riderName}</h3>
              <p style={{ margin: "6px 0 0", color: "var(--text-soft)" }}>
                {selectedBooking.pickup} → {selectedBooking.drop}
              </p>
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {selectedBooking.paymentStatus === "Paid" && (
                <button
                  type="button"
                  className="secondary-btn small-btn"
                  onClick={() => openReceipt(selectedBooking)}
                >
                  View Receipt
                </button>
              )}

              <button
                type="button"
                className="secondary-btn small-btn"
                onClick={closeBookingDetails}
              >
                Close
              </button>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: "12px",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              marginBottom: "14px",
            }}
          >
            <article className="glass info-card">
              <div className="info-icon">📱</div>
              <div>
                <p className="info-label">Phone</p>
                <h3 className="info-value">{selectedBooking.riderPhone}</h3>
                <p className="info-note">Rider contact</p>
              </div>
            </article>

            <article className="glass info-card">
              <div className="info-icon">💰</div>
              <div>
                <p className="info-label">Fare</p>
                <h3 className="info-value">
                  ₹{Number(selectedBooking.fare || 0).toLocaleString()}
                </h3>
                <p className="info-note">{selectedBooking.paymentMethod}</p>
              </div>
            </article>

            <article className="glass info-card">
              <div className="info-icon">🛵</div>
              <div>
                <p className="info-label">Ride Type</p>
                <h3 className="info-value">{selectedBooking.rideType}</h3>
                <p className="info-note">{selectedBooking.status}</p>
              </div>
            </article>

            <article className="glass info-card">
              <div className="info-icon">👨‍✈️</div>
              <div>
                <p className="info-label">Driver</p>
                <h3 className="info-value">
                  {selectedBooking.assignedDriverName || "Not assigned yet"}
                </h3>
                <p className="info-note">
                  {selectedBooking.assignmentMode || "Unassigned"}
                </p>
              </div>
            </article>
          </div>

          <section className="glass panel" style={{ marginBottom: "14px" }}>
            <div className="panel-head">
              <h3>Ride progress</h3>
              <span className="panel-tag">
                {selectedBooking.rideStage || "Waiting"}
              </span>
            </div>

            <div
              style={{
                height: "10px",
                borderRadius: "999px",
                background: "rgba(255,255,255,0.08)",
                overflow: "hidden",
                marginBottom: "12px",
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: "100%",
                  borderRadius: "999px",
                  background:
                    "linear-gradient(135deg, var(--accent), var(--accent-2))",
                }}
              />
            </div>

            <div
              style={{
                display: "grid",
                gap: "10px",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              }}
            >
              <div className="booking-meta-item">
                <span className="booking-meta-label">Current Status</span>
                <strong>{selectedBooking.status}</strong>
              </div>

              <div className="booking-meta-item">
                <span className="booking-meta-label">Ride Stage</span>
                <strong>{selectedBooking.rideStage || "Waiting"}</strong>
              </div>

              <div className="booking-meta-item">
                <span className="booking-meta-label">Payment Status</span>
                <strong>{selectedBooking.paymentStatus || "Pending"}</strong>
              </div>

              <div className="booking-meta-item">
                <span className="booking-meta-label">Refund Status</span>
                <strong>{selectedBooking.refundStatus || "Not Required"}</strong>
              </div>

              <div className="booking-meta-item">
                <span className="booking-meta-label">Created At</span>
                <strong>{selectedBooking.createdAt || "N/A"}</strong>
              </div>
            </div>
          </section>

          <section className="glass panel" style={{ marginBottom: "14px" }}>
            <div className="panel-head">
              <h3>Full booking summary</h3>
              <span className="panel-tag">Review</span>
            </div>

            <div
              style={{
                display: "grid",
                gap: "10px",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              }}
            >
              <div className="booking-meta-item">
                <span className="booking-meta-label">Pickup</span>
                <strong>{selectedBooking.pickup}</strong>
              </div>

              <div className="booking-meta-item">
                <span className="booking-meta-label">Drop</span>
                <strong>{selectedBooking.drop}</strong>
              </div>

              <div className="booking-meta-item">
                <span className="booking-meta-label">Payment Method</span>
                <strong>{selectedBooking.paymentMethod}</strong>
              </div>

              <div className="booking-meta-item">
                <span className="booking-meta-label">Assigned Driver ID</span>
                <strong>{selectedBooking.assignedDriverId || "Not assigned"}</strong>
              </div>

              <div className="booking-meta-item">
                <span className="booking-meta-label">Requested By</span>
                <strong>{selectedBooking.requestedByRole || "customer"}</strong>
              </div>

              <div className="booking-meta-item">
                <span className="booking-meta-label">Assignment Mode</span>
                <strong>{selectedBooking.assignmentMode || "Unassigned"}</strong>
              </div>
            </div>
          </section>

          <section className="glass panel">
            <div className="panel-head">
              <h3>Audit Trail</h3>
              <span className="panel-tag">{bookingAuditTrail.length} entries</span>
            </div>

            <div className="dashboard-list">
              {bookingAuditTrail.length === 0 ? (
                <article className="dashboard-list-card">
                  <div className="dashboard-list-top">
                    <div>
                      <h4>No audit history yet</h4>
                      <p>This booking has no change history recorded yet.</p>
                    </div>
                  </div>
                </article>
              ) : (
                bookingAuditTrail.map((entry) => (
                  <article className="dashboard-list-card" key={entry.id}>
                    <div className="dashboard-list-top">
                      <div>
                        <h4>{entry.action}</h4>
                        <p>{entry.createdAt}</p>
                      </div>
                      <span className="wallet-type-badge income">
                        {String(entry.actorRole || "system").toUpperCase()}
                      </span>
                    </div>

                    <div className="dashboard-mini-meta">
                      <span>{entry.riderName}</span>
                      <span>{entry.details}</span>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    );
  }

  function renderEditBookingModal() {
    if (!editingBooking) return null;

    return (
      <div
        onClick={closeEditBooking}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "18px",
        }}
      >
        <div
          className="glass"
          onClick={(event) => event.stopPropagation()}
          style={{
            width: "min(760px, 100%)",
            maxHeight: "90vh",
            overflowY: "auto",
            borderRadius: "24px",
            padding: "18px",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 24px 60px rgba(0,0,0,0.34)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "14px",
              alignItems: "center",
              marginBottom: "14px",
            }}
          >
            <div>
              <div className="pill">Edit Booking</div>
              <h3 style={{ margin: "10px 0 0" }}>{editingBooking.riderName}</h3>
              <p style={{ margin: "6px 0 0", color: "var(--text-soft)" }}>
                Update the booking safely without recreating it.
              </p>
            </div>

            <button
              type="button"
              className="secondary-btn small-btn"
              onClick={closeEditBooking}
            >
              Close
            </button>
          </div>

          <form onSubmit={handleSaveEdit} className="booking-form">
            <div className="form-grid">
              <label className="form-field">
                <span>Rider name</span>
                <input
                  type="text"
                  name="riderName"
                  value={editForm.riderName}
                  onChange={handleEditChange}
                  placeholder="Enter rider name"
                />
              </label>

              <label className="form-field">
                <span>Rider phone</span>
                <input
                  type="text"
                  name="riderPhone"
                  value={editForm.riderPhone}
                  onChange={handleEditChange}
                  placeholder="Enter phone number"
                />
              </label>

              <label className="form-field form-field-full">
                <span>Pickup location</span>
                <input
                  type="text"
                  name="pickup"
                  value={editForm.pickup}
                  onChange={handleEditChange}
                  placeholder="Enter pickup point"
                />
              </label>

              <label className="form-field form-field-full">
                <span>Drop location</span>
                <input
                  type="text"
                  name="drop"
                  value={editForm.drop}
                  onChange={handleEditChange}
                  placeholder="Enter destination"
                />
              </label>

              <label className="form-field">
                <span>Ride type</span>
                <select
                  name="rideType"
                  value={editForm.rideType}
                  onChange={handleEditChange}
                >
                  {rideTypeOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field">
                <span>Payment method</span>
                <select
                  name="paymentMethod"
                  value={editForm.paymentMethod}
                  onChange={handleEditChange}
                >
                  {paymentOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <div className="fare-preview-card form-field-full">
                <p className="fare-preview-label">Updated fare preview</p>
                <h3 className="fare-preview-value">
                  ₹
                  {recalculateFare(
                    editForm.rideType,
                    editingBooking.fare
                  ).toLocaleString()}
                </h3>
                <p className="fare-preview-note">
                  Existing driver: {editingBooking.assignedDriverName || "Not assigned yet"}
                </p>
                <p className="fare-preview-note">
                  Status remains: {editingBooking.status}
                </p>
              </div>
            </div>

            <div className="form-actions">
              <button className="primary-btn" type="submit">
                Save Changes
              </button>
              <button
                className="secondary-btn"
                type="button"
                onClick={closeEditBooking}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  function renderDeleteBookingModal() {
    if (!deletingBooking) return null;

    return (
      <div
        onClick={closeDeleteBooking}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          zIndex: 10000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "18px",
        }}
      >
        <div
          className="glass"
          onClick={(event) => event.stopPropagation()}
          style={{
            width: "min(620px, 100%)",
            borderRadius: "24px",
            padding: "18px",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 24px 60px rgba(0,0,0,0.34)",
          }}
        >
          <div className="panel-head" style={{ marginBottom: "14px" }}>
            <h3>Delete booking permanently</h3>
            <span className="panel-tag">Admin only</span>
          </div>

          <div className="settings-preview-list">
            <article className="settings-preview-card">
              <h4>{deletingBooking.riderName}</h4>
              <p>
                <strong>Route:</strong> {deletingBooking.pickup} → {deletingBooking.drop}
              </p>
              <p>
                <strong>Status:</strong> {deletingBooking.status}
              </p>
              <p>
                <strong>Fare:</strong> ₹{Number(deletingBooking.fare || 0).toLocaleString()}
              </p>
            </article>
          </div>

          <div
            style={{
              marginTop: "14px",
              color: "var(--text-soft)",
              lineHeight: 1.6,
            }}
          >
            This action will remove the booking permanently from the current app
            data. Completed, cancelled, pending, or assigned bookings can be
            deleted. In-progress rides cannot be deleted.
          </div>

          <div className="form-actions" style={{ marginTop: "18px" }}>
            <button
              type="button"
              className="danger-btn"
              onClick={handlePermanentDelete}
              disabled={deletingBooking.status === "In Progress"}
            >
              Confirm Permanent Delete
            </button>

            <button
              type="button"
              className="secondary-btn"
              onClick={closeDeleteBooking}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderReceiptModal() {
    if (!showReceipt || !receiptBooking) return null;

    const receiptTransaction =
      transactions.find(
        (item) =>
          String(item.bookingId) === String(receiptBooking.id) &&
          (item.source === "Google Pay Payment" ||
            item.source === "Auto Ride Completion")
      ) || null;

    return (
      <div
        onClick={closeReceipt}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          zIndex: 10001,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "18px",
        }}
      >
        <div
          className="glass receipt-print-area"
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "min(520px, 100%)",
            borderRadius: "24px",
            padding: "22px",
            border: "1px solid rgba(255,255,255,0.14)",
            boxShadow: "0 24px 60px rgba(0,0,0,0.34)",
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "12px",
              alignItems: "flex-start",
              marginBottom: "18px",
            }}
          >
            <div>
              <div className="pill">Receipt</div>
              <h3 style={{ margin: "10px 0 0" }}>Ride Payment Receipt</h3>
              <p style={{ margin: "6px 0 0", color: "var(--text-soft)" }}>
                Proof of payment for completed or paid booking
              </p>
            </div>

            <div style={{ textAlign: "right" }}>
              <strong style={{ display: "block" }}>#{receiptBooking.id}</strong>
              <span style={{ color: "var(--text-soft)", fontSize: "0.9rem" }}>
                {receiptTransaction?.createdAt || receiptBooking.createdAt || "Just now"}
              </span>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: "10px",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              marginBottom: "16px",
            }}
          >
            <div className="booking-meta-item">
              <span className="booking-meta-label">Rider</span>
              <strong>{receiptBooking.riderName}</strong>
            </div>

            <div className="booking-meta-item">
              <span className="booking-meta-label">Phone</span>
              <strong>{receiptBooking.riderPhone}</strong>
            </div>

            <div className="booking-meta-item">
              <span className="booking-meta-label">Pickup</span>
              <strong>{receiptBooking.pickup}</strong>
            </div>

            <div className="booking-meta-item">
              <span className="booking-meta-label">Drop</span>
              <strong>{receiptBooking.drop}</strong>
            </div>

            <div className="booking-meta-item">
              <span className="booking-meta-label">Ride Type</span>
              <strong>{receiptBooking.rideType}</strong>
            </div>

            <div className="booking-meta-item">
              <span className="booking-meta-label">Driver</span>
              <strong>{receiptBooking.assignedDriverName || "Not assigned yet"}</strong>
            </div>
          </div>

          <section className="glass panel" style={{ marginBottom: "16px" }}>
            <div className="panel-head">
              <h3>Payment Summary</h3>
              <span className="panel-tag">
                {receiptBooking.paymentStatus || "Pending"}
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gap: "10px",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              }}
            >
              <div className="booking-meta-item">
                <span className="booking-meta-label">Payment Method</span>
                <strong>{receiptBooking.paymentMethod}</strong>
              </div>

              <div className="booking-meta-item">
                <span className="booking-meta-label">Transaction Type</span>
                <strong>{receiptTransaction?.type || "Income"}</strong>
              </div>

              <div className="booking-meta-item">
                <span className="booking-meta-label">Source</span>
                <strong>{receiptTransaction?.source || "Booking Payment"}</strong>
              </div>

              <div className="booking-meta-item">
                <span className="booking-meta-label">Amount</span>
                <strong>₹{Number(receiptBooking.fare || 0).toLocaleString()}</strong>
              </div>
            </div>
          </section>

          <div
            style={{
              borderTop: "1px dashed rgba(255,255,255,0.16)",
              paddingTop: "14px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ color: "var(--text-soft)", fontSize: "0.9rem" }}>
                Status
              </div>
              <strong>Paid ✅</strong>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ color: "var(--text-soft)", fontSize: "0.9rem" }}>
                Total Paid
              </div>
              <strong style={{ fontSize: "1.1rem" }}>
                ₹{Number(receiptBooking.fare || 0).toLocaleString()}
              </strong>
            </div>
          </div>

          <div
            className="form-actions"
            style={{ marginTop: "18px", justifyContent: "flex-end" }}
          >
            <button
              type="button"
              className="primary-btn"
              onClick={printReceipt}
            >
              Print Receipt
            </button>

            <button
              type="button"
              className="secondary-btn"
              onClick={closeReceipt}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderAuditPanel() {
    if (role !== "admin") return null;

    return (
      <section className="glass panel">
        <div className="panel-head">
          <h3>Recent Audit Trail</h3>
          <span className="panel-tag">{recentAuditLogs.length} entries</span>
        </div>

        <div className="dashboard-list">
          {recentAuditLogs.length === 0 ? (
            <article className="dashboard-list-card">
              <div className="dashboard-list-top">
                <div>
                  <h4>No audit logs yet</h4>
                  <p>Booking changes will appear here automatically.</p>
                </div>
              </div>
            </article>
          ) : (
            recentAuditLogs.map((entry) => (
              <article className="dashboard-list-card" key={entry.id}>
                <div className="dashboard-list-top">
                  <div>
                    <h4>{entry.action}</h4>
                    <p>{entry.createdAt}</p>
                  </div>
                  <span className="wallet-type-badge income">
                    {String(entry.actorRole || "system").toUpperCase()}
                  </span>
                </div>

                <div className="dashboard-mini-meta">
                  <span>#{entry.bookingId}</span>
                  <span>{entry.riderName}</span>
                  <span>{entry.details}</span>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    );
  }

  return (
    <div className="page-stack">
      {toast.show ? (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            zIndex: 9999,
            width: "min(360px, calc(100% - 24px))",
            borderRadius: "18px",
            padding: "14px 16px",
            background:
              toast.type === "success"
                ? "linear-gradient(135deg, rgba(34,197,94,0.22), rgba(16,185,129,0.16))"
                : toast.type === "warning"
                ? "linear-gradient(135deg, rgba(245,158,11,0.22), rgba(251,191,36,0.14))"
                : toast.type === "error"
                ? "linear-gradient(135deg, rgba(239,68,68,0.22), rgba(248,113,113,0.14))"
                : "linear-gradient(135deg, rgba(59,130,246,0.22), rgba(99,102,241,0.14))",
            border: "1px solid rgba(255,255,255,0.14)",
            boxShadow: "0 18px 50px rgba(0,0,0,0.25)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "12px",
              alignItems: "flex-start",
            }}
          >
            <div>
              <div style={{ fontWeight: 700, marginBottom: "4px" }}>
                {toast.title}
              </div>
              <div style={{ color: "var(--text-soft)", lineHeight: 1.5 }}>
                {toast.message}
              </div>
            </div>

            <button
              type="button"
              onClick={closeToast}
              style={{
                border: "0",
                background: "transparent",
                color: "var(--text)",
                cursor: "pointer",
                fontSize: "1rem",
              }}
            >
              ✕
            </button>
          </div>
        </div>
      ) : null}

      {renderBookingDetailsModal()}
      {renderEditBookingModal()}
      {renderDeleteBookingModal()}
      {renderReceiptModal()}

      <section className="glass page-hero-small">
        <div>
          <div className="pill">Bookings Module</div>
          <h2 className="section-title">
            {role === "admin"
              ? "Create, assign, manage, and audit bookings"
              : role === "captain"
              ? "Captain ride queue and assignment flow"
              : "Request and track your rides"}
          </h2>
          <p className="section-text">
            {role === "admin"
              ? "Admin can create, review, edit, delete, assign, and manage bookings with smart auto-assignment, live ride engine, Google Pay ledger, printable receipts, and full audit trail."
              : role === "captain"
              ? "Captain gets ride workflow, live updates, and all key actions are now tracked in audit history."
              : "Customer ride requests now support payment tracking, receipts, and stronger booking history."}
          </p>
        </div>
      </section>

      <section className="mini-grid">
        {bookingStats.map((item) => (
          <article className="glass info-card" key={item.id}>
            <div className="info-icon">{item.icon}</div>
            <div>
              <p className="info-label">{item.title}</p>
              <h3 className="info-value">{item.value}</h3>
              <p className="info-note">{item.note}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="booking-layout">
        {role === "admin"
          ? renderAdminForm()
          : role === "captain"
          ? renderCaptainPanel()
          : renderCustomerForm()}

        {role === "captain" ? renderCaptainActiveRidePanel() : renderMapPanel()}
      </section>

      {renderAuditPanel()}

      {role === "captain" ? (
        <section className="glass panel">
          <div className="panel-head">
            <h3>Captain ride queue</h3>
            <span className="panel-tag">{captainQueueBookings.length} shown</span>
          </div>

          <div
            style={{
              marginBottom: "16px",
              display: "grid",
              gap: "10px",
            }}
          >
            <input
              type="text"
              placeholder="Search by name, phone, pickup, drop, driver..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />

            <div
              style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              {["All", "Pending", "Assigned", "Completed"].map((status) => (
                <button
                  key={status}
                  type="button"
                  className={
                    filterStatus === status
                      ? "primary-btn small-btn"
                      : "secondary-btn small-btn"
                  }
                  onClick={() => setFilterStatus(status)}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="booking-list">
            {captainQueueBookings.length === 0 ? (
              <div className="empty-state">
                <div>
                  <div className="empty-icon">📭</div>
                  <h4>No captain queue items</h4>
                  <p>Pending, assigned, or completed rides will appear here.</p>
                </div>
              </div>
            ) : (
              captainQueueBookings.map((booking) => (
                <article className="booking-card" key={booking.id}>
                  <div className="booking-card-top">
                    <div>
                      <h4>{booking.riderName}</h4>
                      <p>
                        {booking.pickup} → {booking.drop}
                      </p>
                    </div>

                    <span
                      className={`booking-status ${
                        booking.status === "Pending"
                          ? "pending"
                          : booking.status === "Assigned"
                          ? "assigned"
                          : booking.status === "Completed"
                          ? "completed"
                          : "cancelled"
                      }`}
                    >
                      {booking.status}
                    </span>
                  </div>

                  <div className="booking-meta-grid">
                    <div className="booking-meta-item">
                      <span className="booking-meta-label">Phone</span>
                      <strong>{booking.riderPhone}</strong>
                    </div>

                    <div className="booking-meta-item">
                      <span className="booking-meta-label">Ride</span>
                      <strong>{booking.rideType}</strong>
                    </div>

                    <div className="booking-meta-item">
                      <span className="booking-meta-label">Payment</span>
                      <strong>{booking.paymentMethod}</strong>
                    </div>

                    <div className="booking-meta-item">
                      <span className="booking-meta-label">Fare</span>
                      <strong>₹{booking.fare}</strong>
                    </div>
                  </div>

                  <div className="booking-driver-line">
                    <span className="booking-driver-label">Assigned driver:</span>
                    <strong>{booking.assignedDriverName || "Not assigned yet"}</strong>
                  </div>

                  <div className="booking-driver-line">
                    <span className="booking-driver-label">Ride stage:</span>
                    <strong>{booking.rideStage || "Waiting"}</strong>
                  </div>

                  <div className="booking-driver-line">
                    <span className="booking-driver-label">Payment status:</span>
                    <strong>{booking.paymentStatus || "Pending"}</strong>
                  </div>

                  <div className="booking-driver-line">
                    <span className="booking-driver-label">Refund status:</span>
                    <strong>{booking.refundStatus || "Not Required"}</strong>
                  </div>

                  {renderActionsForBooking(booking)}

                  <div className="booking-footer">
                    <span>{booking.createdAt}</span>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      ) : (
        <section className="glass panel">
          <div className="panel-head">
            <h3>{role === "admin" ? "Booking list" : "My ride requests"}</h3>
            <span className="panel-tag">{filteredBookings.length} shown</span>
          </div>

          <div
            style={{
              marginBottom: "16px",
              display: "grid",
              gap: "10px",
            }}
          >
            <input
              type="text"
              placeholder="Search by name, phone, pickup, drop, driver..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />

            <div
              style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              {["All", "Pending", "Assigned", "In Progress", "Completed", "Cancelled"].map(
                (status) => (
                  <button
                    key={status}
                    type="button"
                    className={
                      filterStatus === status
                        ? "primary-btn small-btn"
                        : "secondary-btn small-btn"
                    }
                    onClick={() => setFilterStatus(status)}
                  >
                    {status}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="booking-list">
            {filteredBookings.length === 0 ? (
              <div className="empty-state">
                <div>
                  <div className="empty-icon">🔎</div>
                  <h4>No bookings found</h4>
                  <p>Try another search or change the status filter.</p>
                </div>
              </div>
            ) : (
              filteredBookings.map((booking) => (
                <article className="booking-card" key={booking.id}>
                  <div className="booking-card-top">
                    <div>
                      <h4>{booking.riderName}</h4>
                      <p>
                        {booking.pickup} → {booking.drop}
                      </p>
                    </div>

                    <span
                      className={`booking-status ${
                        booking.status === "Pending"
                          ? "pending"
                          : booking.status === "Assigned"
                          ? "assigned"
                          : booking.status === "In Progress"
                          ? "assigned"
                          : booking.status === "Completed"
                          ? "completed"
                          : "cancelled"
                      }`}
                    >
                      {booking.status}
                    </span>
                  </div>

                  <div className="booking-meta-grid">
                    <div className="booking-meta-item">
                      <span className="booking-meta-label">Phone</span>
                      <strong>{booking.riderPhone}</strong>
                    </div>

                    <div className="booking-meta-item">
                      <span className="booking-meta-label">Ride</span>
                      <strong>{booking.rideType}</strong>
                    </div>

                    <div className="booking-meta-item">
                      <span className="booking-meta-label">Payment</span>
                      <strong>{booking.paymentMethod}</strong>
                    </div>

                    <div className="booking-meta-item">
                      <span className="booking-meta-label">Fare</span>
                      <strong>₹{booking.fare}</strong>
                    </div>
                  </div>

                  <div className="booking-driver-line">
                    <span className="booking-driver-label">Assigned driver:</span>
                    <strong>{booking.assignedDriverName || "Not assigned yet"}</strong>
                  </div>

                  <div className="booking-driver-line">
                    <span className="booking-driver-label">Ride stage:</span>
                    <strong>{booking.rideStage || "Waiting"}</strong>
                  </div>

                  <div className="booking-driver-line">
                    <span className="booking-driver-label">Assignment mode:</span>
                    <strong>{booking.assignmentMode || "Unassigned"}</strong>
                  </div>

                  <div className="booking-driver-line">
                    <span className="booking-driver-label">Payment status:</span>
                    <strong>{booking.paymentStatus || "Pending"}</strong>
                  </div>

                  <div className="booking-driver-line">
                    <span className="booking-driver-label">Refund status:</span>
                    <strong>{booking.refundStatus || "Not Required"}</strong>
                  </div>

                  {renderActionsForBooking(booking)}

                  <div className="booking-footer">
                    <span>{booking.createdAt}</span>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}

export default BookingsPage;
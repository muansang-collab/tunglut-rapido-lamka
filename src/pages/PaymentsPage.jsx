import { useMemo, useState } from "react";

function PaymentsPage({ appData, setAppData, role, user }) {
  const {
    bookings = [],
    transactions = [],
    notifications = [],
    auditLogs = [],
  } = appData || {};

  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const paymentBookings = useMemo(() => {
    return [...bookings].sort((a, b) => Number(b.id) - Number(a.id));
  }, [bookings]);

  const selectedBooking = useMemo(() => {
    return paymentBookings.find(
      (item) => String(item.id) === String(selectedBookingId)
    );
  }, [paymentBookings, selectedBookingId]);

  const paidCount = useMemo(() => {
    return bookings.filter((item) => item.paymentStatus === "Paid").length;
  }, [bookings]);

  const requestedCount = useMemo(() => {
    return bookings.filter((item) => item.paymentStatus === "Requested").length;
  }, [bookings]);

  const failedCount = useMemo(() => {
    return bookings.filter((item) => item.paymentStatus === "Failed").length;
  }, [bookings]);

  const pendingCount = useMemo(() => {
    return bookings.filter(
      (item) =>
        !item.paymentStatus ||
        item.paymentStatus === "Pending" ||
        item.paymentStatus === ""
    ).length;
  }, [bookings]);

  const totalCollected = useMemo(() => {
    return transactions
      .filter((item) => item.type === "Income")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [transactions]);

  function createNotification(type, title, text) {
    return {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      title,
      message: text,
      role: role || "system",
      read: false,
      createdAt: new Date().toLocaleString(),
    };
  }

  function createAudit(action, booking, details) {
    return {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      bookingId: booking?.id ?? "",
      riderName: booking?.riderName || "Unknown",
      action,
      actorRole: role || "system",
      details,
      createdAt: new Date().toLocaleString(),
    };
  }

  function updateBookingWithAudit(booking, auditEntry, updates) {
    return {
      ...booking,
      ...updates,
      auditTrail: [auditEntry, ...(booking.auditTrail || [])],
    };
  }

  async function loadRazorpayScript() {
    if (window.Razorpay) return true;

    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  async function handleRazorpayPay() {
    if (!selectedBooking) {
      setMessage("Please choose a booking first.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded) {
        setMessage("Razorpay SDK failed to load.");
        setLoading(false);
        return;
      }

      const createOrderResponse = await fetch("/api/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: Number(selectedBooking.fare || 0),
          receipt: `booking_${selectedBooking.id}`,
          notes: {
            bookingId: String(selectedBooking.id),
            riderName: selectedBooking.riderName || "",
          },
        }),
      });

      const createOrderData = await createOrderResponse.json();

      if (!createOrderResponse.ok || !createOrderData?.success) {
        setMessage(createOrderData?.error || "Failed to create order.");
        setLoading(false);
        return;
      }

      const order = createOrderData.order;
      const key = createOrderData.key;

      const options = {
        key,
        amount: order.amount,
        currency: order.currency,
        name: "Tunglut Rapido Lamka",
        description: `Booking #${selectedBooking.id}`,
        order_id: order.id,
        prefill: {
          name: selectedBooking.riderName || user?.name || "",
          email: user?.email || "",
          contact: selectedBooking.riderPhone || "",
        },
        notes: {
          bookingId: String(selectedBooking.id),
        },
        handler: async function (response) {
          try {
            const verifyResponse = await fetch("/api/verify-payment", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                order_id: order.id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyResponse.json();

            if (!verifyResponse.ok || !verifyData?.verified) {
              const auditEntry = createAudit(
                "Payment Verification Failed",
                selectedBooking,
                "Razorpay payment returned but signature verification failed."
              );

              const nextBookings = bookings.map((booking) => {
                if (String(booking.id) !== String(selectedBooking.id)) return booking;

                return updateBookingWithAudit(booking, auditEntry, {
                  paymentMethod: "Razorpay",
                  paymentStatus: "Failed",
                });
              });

              const nextNotifications = [
                createNotification(
                  "warning",
                  "Payment Verification Failed",
                  `${selectedBooking.riderName} payment could not be verified`
                ),
                ...notifications,
              ];

              setAppData((prev) => ({
                ...prev,
                bookings: nextBookings,
                notifications: nextNotifications,
                auditLogs: [auditEntry, ...(prev.auditLogs || [])],
              }));

              setMessage("Payment verification failed.");
              return;
            }

            const alreadyRecorded = transactions.some(
              (item) =>
                String(item.bookingId) === String(selectedBooking.id) &&
                item.source === "Razorpay Payment"
            );

            const auditEntry = createAudit(
              "Razorpay Payment Completed",
              selectedBooking,
              `Verified Razorpay payment for ₹${Number(
                selectedBooking.fare || 0
              ).toLocaleString()}. Payment ID: ${verifyData.paymentId}`
            );

            const nextBookings = bookings.map((booking) => {
              if (String(booking.id) !== String(selectedBooking.id)) return booking;

              return updateBookingWithAudit(booking, auditEntry, {
                paymentMethod: "Razorpay",
                paymentStatus: "Paid",
                paymentGateway: "Razorpay",
                paymentGatewayOrderId: verifyData.orderId,
                paymentGatewayPaymentId: verifyData.paymentId,
              });
            });

            const nextTransactions = alreadyRecorded
              ? transactions
              : [
                  {
                    id: `razorpay-pay-${selectedBooking.id}`,
                    bookingId: selectedBooking.id,
                    paymentId: verifyData.paymentId,
                    orderId: verifyData.orderId,
                    type: "Income",
                    title: `Razorpay payment • ${selectedBooking.riderName}`,
                    amount: Number(selectedBooking.fare || 0),
                    method: "Razorpay",
                    source: "Razorpay Payment",
                    createdAt: new Date().toLocaleString(),
                  },
                  ...transactions,
                ];

            const nextNotifications = [
              createNotification(
                "success",
                "Payment Received",
                `₹${Number(selectedBooking.fare || 0).toLocaleString()} received from ${selectedBooking.riderName} via Razorpay`
              ),
              ...notifications,
            ];

            setAppData((prev) => ({
              ...prev,
              bookings: nextBookings,
              transactions: nextTransactions,
              notifications: nextNotifications,
              auditLogs: [auditEntry, ...(prev.auditLogs || [])],
            }));

            setMessage("Payment verified and booking marked as Paid.");
          } catch (error) {
            setMessage(error?.message || "Verification step failed.");
          }
        },
        modal: {
          ondismiss: function () {
            setMessage((current) =>
              current ? current : "Payment popup closed."
            );
          },
        },
        theme: {
          color: "#6ee7ff",
        },
      };

      const paymentObject = new window.Razorpay(options);

      paymentObject.on("payment.failed", function () {
        const auditEntry = createAudit(
          "Razorpay Payment Failed",
          selectedBooking,
          "Customer attempted payment but it failed at checkout."
        );

        const nextBookings = bookings.map((booking) => {
          if (String(booking.id) !== String(selectedBooking.id)) return booking;

          return updateBookingWithAudit(booking, auditEntry, {
            paymentMethod: "Razorpay",
            paymentStatus: "Failed",
          });
        });

        const nextNotifications = [
          createNotification(
            "warning",
            "Payment Failed",
            `${selectedBooking.riderName} payment failed in Razorpay`
          ),
          ...notifications,
        ];

        setAppData((prev) => ({
          ...prev,
          bookings: nextBookings,
          notifications: nextNotifications,
          auditLogs: [auditEntry, ...(prev.auditLogs || [])],
        }));

        setMessage("Payment failed.");
      });

      paymentObject.open();
    } catch (error) {
      setMessage(error?.message || "Payment failed to start.");
    } finally {
      setLoading(false);
    }
  }

  const summaryCards = [
    {
      id: 1,
      title: "Pending",
      value: String(pendingCount).padStart(2, "0"),
      icon: "🕒",
      note: "No payment request yet",
    },
    {
      id: 2,
      title: "Requested",
      value: String(requestedCount).padStart(2, "0"),
      icon: "📨",
      note: "Request already raised",
    },
    {
      id: 3,
      title: "Paid",
      value: String(paidCount).padStart(2, "0"),
      icon: "✅",
      note: "Payment completed",
    },
    {
      id: 4,
      title: "Failed",
      value: String(failedCount).padStart(2, "0"),
      icon: "❌",
      note: "Payment failure cases",
    },
  ];

  return (
    <div className="page-stack">
      <section className="glass page-hero-small">
        <div>
          <div className="pill">Step 53 • Payment Success Save</div>
          <h2 className="section-title">Verified Payment Save Flow</h2>
          <p className="section-text">
            Successful Razorpay payments now update your booking, transaction list,
            notifications, and audit trail inside the app.
          </p>
        </div>
      </section>

      <section className="mini-grid">
        {summaryCards.map((card) => (
          <article className="glass info-card" key={card.id}>
            <div className="info-icon">{card.icon}</div>
            <div>
              <p className="info-label">{card.title}</p>
              <h3 className="info-value">{card.value}</h3>
              <p className="info-note">{card.note}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="content-grid">
        <section className="glass panel">
          <div className="panel-head">
            <h3>Razorpay Payment Panel</h3>
            <span className="panel-tag">
              Total Collected ₹{totalCollected.toLocaleString()}
            </span>
          </div>

          <div className="booking-form">
            <div className="form-grid">
              <label className="form-field form-field-full">
                <span>Select booking</span>
                <select
                  value={selectedBookingId}
                  onChange={(e) => {
                    setSelectedBookingId(e.target.value);
                    setMessage("");
                  }}
                >
                  <option value="">Choose booking</option>
                  {paymentBookings.map((booking) => (
                    <option key={booking.id} value={booking.id}>
                      #{booking.id} • {booking.riderName} • ₹
                      {Number(booking.fare || 0).toLocaleString()} •{" "}
                      {booking.paymentStatus || "Pending"}
                    </option>
                  ))}
                </select>
              </label>

              <div className="fare-preview-card form-field-full">
                <p className="fare-preview-label">Logged in user</p>
                <h3 className="fare-preview-value" style={{ fontSize: "1.2rem" }}>
                  {user?.name || "Unknown"}
                </h3>
                <p className="fare-preview-note">
                  {String(role || "guest").toUpperCase()}
                </p>
              </div>
            </div>

            {selectedBooking ? (
              <div className="settings-preview-list">
                <article className="settings-preview-card">
                  <h4>Selected Booking</h4>
                  <p>
                    <strong>Rider:</strong> {selectedBooking.riderName}
                  </p>
                  <p>
                    <strong>Route:</strong> {selectedBooking.pickup} → {selectedBooking.drop}
                  </p>
                  <p>
                    <strong>Fare:</strong> ₹{Number(selectedBooking.fare || 0).toLocaleString()}
                  </p>
                  <p>
                    <strong>Status:</strong> {selectedBooking.paymentStatus || "Pending"}
                  </p>
                  {selectedBooking.paymentGatewayPaymentId ? (
                    <p>
                      <strong>Payment ID:</strong> {selectedBooking.paymentGatewayPaymentId}
                    </p>
                  ) : null}
                </article>
              </div>
            ) : null}

            {message ? <div className="form-success">{message}</div> : null}

            <div className="booking-actions">
              <button
                type="button"
                className="primary-btn"
                onClick={handleRazorpayPay}
                disabled={loading}
              >
                {loading ? "Starting..." : "Pay with Razorpay"}
              </button>
            </div>
          </div>
        </section>

        <section className="glass panel">
          <div className="panel-head">
            <h3>Gateway Notes</h3>
            <span className="panel-tag">Live Ready</span>
          </div>

          <div className="wallet-guide-list">
            <article className="wallet-guide-card">
              <div className="fare-guide-icon">🧱</div>
              <div>
                <h4>Server order</h4>
                <p>Each payment starts with a backend order creation step.</p>
              </div>
            </article>

            <article className="wallet-guide-card">
              <div className="fare-guide-icon">🔐</div>
              <div>
                <h4>Verified payment</h4>
                <p>Only verified Razorpay payments are saved as paid in the app.</p>
              </div>
            </article>

            <article className="wallet-guide-card">
              <div className="fare-guide-icon">🧾</div>
              <div>
                <h4>Records connected</h4>
                <p>Verified payments update bookings, transactions, alerts, and audit logs.</p>
              </div>
            </article>
          </div>
        </section>
      </section>

      <section className="glass panel">
        <div className="panel-head">
          <h3>Booking Payment Status List</h3>
          <span className="panel-tag">{paymentBookings.length} bookings</span>
        </div>

        <div className="booking-list">
          {paymentBookings.map((booking) => (
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
                    booking.paymentStatus === "Paid"
                      ? "completed"
                      : booking.paymentStatus === "Requested"
                      ? "assigned"
                      : booking.paymentStatus === "Failed"
                      ? "cancelled"
                      : "pending"
                  }`}
                >
                  {booking.paymentStatus || "Pending"}
                </span>
              </div>

              <div className="booking-meta-grid">
                <div className="booking-meta-item">
                  <span className="booking-meta-label">Booking ID</span>
                  <strong>#{booking.id}</strong>
                </div>

                <div className="booking-meta-item">
                  <span className="booking-meta-label">Method</span>
                  <strong>{booking.paymentMethod || "N/A"}</strong>
                </div>

                <div className="booking-meta-item">
                  <span className="booking-meta-label">Fare</span>
                  <strong>₹{Number(booking.fare || 0).toLocaleString()}</strong>
                </div>

                <div className="booking-meta-item">
                  <span className="booking-meta-label">Ride Status</span>
                  <strong>{booking.status}</strong>
                </div>
              </div>

              {booking.paymentGatewayPaymentId ? (
                <div className="booking-driver-line">
                  <span className="booking-driver-label">Gateway Payment ID:</span>
                  <strong>{booking.paymentGatewayPaymentId}</strong>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default PaymentsPage;
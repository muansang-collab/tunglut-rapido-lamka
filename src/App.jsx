import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import BookingsPage from "./pages/BookingsPage.jsx";
import DriversPage from "./pages/DriversPage.jsx";
import WalletPage from "./pages/WalletPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import ReportsPage from "./pages/ReportsPage.jsx";
import RoleEntryPage from "./pages/RoleEntryPage.jsx";
import NotificationsPage from "./pages/NotificationsPage.jsx";
import { firebaseStatus } from "./firebase";
import {
  loadBookingsFromFirestore,
  loadSettingsFromFirestore,
  saveBookingsToFirestore,
  saveSettingsToFirestore,
} from "./firebaseService";

const THEME_STORAGE_KEY = "tunglut-theme";
const APP_DATA_STORAGE_KEY = "tunglut-rapido-lamka-data";
const ROLE_STORAGE_KEY = "tunglut-role";

const defaultAppData = {
  bookings: [
    {
      id: 1,
      riderName: "Muan",
      riderPhone: "7000000001",
      pickup: "Lamka Bazar",
      drop: "Zenhang",
      rideType: "Bike",
      paymentMethod: "Cash",
      assignedDriverId: "",
      assignedDriverName: "",
      fare: 99,
      status: "Pending",
      rideStage: "Waiting",
      createdAt: "Today • 10:15 AM",
      requestedByRole: "customer",
      assignmentMode: "Unassigned",
      refundStatus: "Not Required",
      paymentStatus: "Pending",
      auditTrail: [],
    },
    {
      id: 2,
      riderName: "Paokholal",
      riderPhone: "7000000002",
      pickup: "Tuibuang",
      drop: "Mission Veng",
      rideType: "Auto",
      paymentMethod: "Google Pay",
      assignedDriverId: "DRV-002",
      assignedDriverName: "L. Thangboi",
      fare: 169,
      status: "Assigned",
      rideStage: "Driver Assigned",
      createdAt: "Today • 09:40 AM",
      requestedByRole: "admin",
      assignmentMode: "Manual",
      refundStatus: "Not Required",
      paymentStatus: "Paid",
      auditTrail: [],
    },
    {
      id: 3,
      riderName: "Thangboi",
      riderPhone: "7000000003",
      pickup: "New Lamka",
      drop: "Rengkai",
      rideType: "Cab",
      paymentMethod: "Wallet",
      assignedDriverId: "DRV-003",
      assignedDriverName: "C. Nehkholun",
      fare: 289,
      status: "Completed",
      rideStage: "Completed",
      createdAt: "Yesterday • 06:20 PM",
      requestedByRole: "customer",
      assignmentMode: "Manual",
      refundStatus: "Not Required",
      paymentStatus: "Paid",
      auditTrail: [],
    },
  ],
  drivers: [
    {
      id: 1,
      name: "M. Paokholal",
      phone: "7000001001",
      status: "Online",
      vehicle: "Bike",
      area: "Lamka Bazar",
    },
    {
      id: 2,
      name: "L. Thangboi",
      phone: "7000001002",
      status: "Busy",
      vehicle: "Auto",
      area: "Tuibuang",
    },
    {
      id: 3,
      name: "C. Nehkholun",
      phone: "7000001003",
      status: "Offline",
      vehicle: "Cab",
      area: "Zenhang",
    },
  ],
  transactions: [
    {
      id: 1,
      type: "Income",
      title: "Ride payment received",
      amount: 420,
      method: "Cash",
      createdAt: "Today • 09:10 AM",
    },
    {
      id: 2,
      type: "Income",
      title: "Online booking payment",
      amount: 860,
      method: "Google Pay",
      createdAt: "Today • 11:45 AM",
      source: "Google Pay Payment",
    },
    {
      id: 3,
      type: "Expense",
      title: "Driver settlement",
      amount: 300,
      method: "Wallet",
      createdAt: "Today • 01:20 PM",
    },
    {
      id: 4,
      type: "Expense",
      title: "Promotional discount support",
      amount: 120,
      method: "Online",
      createdAt: "Yesterday • 06:00 PM",
    },
  ],
  notifications: [
    {
      id: "notif-demo-1",
      type: "success",
      title: "Booking Created",
      message: "Muan booking created successfully",
      role: "admin",
      read: false,
      createdAt: "Today • 10:20 AM",
    },
    {
      id: "notif-demo-2",
      type: "success",
      title: "Payment Received",
      message: "₹169 received via Google Pay",
      role: "admin",
      read: false,
      createdAt: "Today • 11:45 AM",
    },
  ],
  auditLogs: [],
  settings: {
    appName: "Tunglut Rapido Lamka",
    supportPhone: "+91 7000000000",
    supportEmail: "support@tunglutlamka.app",
    currency: "INR (₹)",
    baseFareBike: "79",
    baseFareAuto: "129",
    baseFareCab: "219",
    perKmFare: "10",
    waitingCharge: "2",
    nightCharge: "25",
    primaryZone: "Lamka Bazar",
    secondaryZone: "Zenhang",
    tertiaryZone: "Tuibuang",
    serviceStart: "06:00",
    serviceEnd: "22:00",
  },
  systemMeta: {
    lastLocalSyncAt: "",
    lastCloudSyncAt: "",
    syncMode: "Local + Firebase",
  },
};

function safeMergeAppData(parsed) {
  return {
    ...defaultAppData,
    ...parsed,
    notifications: Array.isArray(parsed?.notifications)
      ? parsed.notifications
      : defaultAppData.notifications,
    auditLogs: Array.isArray(parsed?.auditLogs)
      ? parsed.auditLogs
      : defaultAppData.auditLogs,
    settings: {
      ...defaultAppData.settings,
      ...(parsed?.settings || {}),
    },
    systemMeta: {
      ...defaultAppData.systemMeta,
      ...(parsed?.systemMeta || {}),
    },
    bookings: Array.isArray(parsed?.bookings)
      ? parsed.bookings
      : defaultAppData.bookings,
    drivers: Array.isArray(parsed?.drivers)
      ? parsed.drivers
      : defaultAppData.drivers,
    transactions: Array.isArray(parsed?.transactions)
      ? parsed.transactions
      : defaultAppData.transactions,
  };
}

function loadAppDataFromLocalStorage() {
  try {
    const saved = localStorage.getItem(APP_DATA_STORAGE_KEY);
    if (!saved) return defaultAppData;
    return safeMergeAppData(JSON.parse(saved));
  } catch {
    return defaultAppData;
  }
}

function App() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved === "light" || saved === "dark" ? saved : "dark";
  });

  const [role, setRole] = useState(() => localStorage.getItem(ROLE_STORAGE_KEY) || "");

  const [appData, setAppData] = useState(() => loadAppDataFromLocalStorage());
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);
  const [canInstallApp, setCanInstallApp] = useState(false);

  const didLoadCloudRef = useRef(false);
  const settingsSyncTimerRef = useRef(null);
  const bookingsSyncTimerRef = useRef(null);
  const autoRefreshTimerRef = useRef(null);
  const lastSeenStorageSnapshotRef = useRef("");

  function refreshFromLocalStorage() {
    try {
      const raw = localStorage.getItem(APP_DATA_STORAGE_KEY);
      if (!raw) return;

      if (raw === lastSeenStorageSnapshotRef.current) return;

      const parsed = JSON.parse(raw);
      const merged = safeMergeAppData(parsed);

      lastSeenStorageSnapshotRef.current = raw;
      setAppData(merged);
    } catch {
      // ignore malformed storage safely
    }
  }

  async function handleInstallApp() {
    if (!deferredInstallPrompt) return false;

    try {
      deferredInstallPrompt.prompt();
      const choiceResult = await deferredInstallPrompt.userChoice;

      if (choiceResult?.outcome === "accepted") {
        setCanInstallApp(false);
      }

      setDeferredInstallPrompt(null);
      return true;
    } catch {
      return false;
    }
  }

  useEffect(() => {
    function handleBeforeInstallPrompt(event) {
      event.preventDefault();
      setDeferredInstallPrompt(event);
      setCanInstallApp(true);
    }

    function handleAppInstalled() {
      setDeferredInstallPrompt(null);
      setCanInstallApp(false);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    async function loadCloudData() {
      const [cloudSettings, cloudBookings] = await Promise.all([
        loadSettingsFromFirestore(),
        loadBookingsFromFirestore(),
      ]);

      setAppData((prev) => {
        const next = {
          ...prev,
          settings: cloudSettings
            ? { ...prev.settings, ...cloudSettings }
            : prev.settings,
          bookings: Array.isArray(cloudBookings) ? cloudBookings : prev.bookings,
          systemMeta: {
            ...(prev.systemMeta || {}),
            lastCloudSyncAt: new Date().toLocaleString(),
          },
        };

        try {
          const nextRaw = JSON.stringify(next);
          localStorage.setItem(APP_DATA_STORAGE_KEY, nextRaw);
          lastSeenStorageSnapshotRef.current = nextRaw;
        } catch {
          // ignore local save issues safely
        }

        return next;
      });

      didLoadCloudRef.current = true;
    }

    loadCloudData();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (role) {
      localStorage.setItem(ROLE_STORAGE_KEY, role);
    } else {
      localStorage.removeItem(ROLE_STORAGE_KEY);
    }
  }, [role]);

  useEffect(() => {
    const nextAppData = {
      ...appData,
      systemMeta: {
        ...(appData.systemMeta || {}),
        lastLocalSyncAt: new Date().toLocaleString(),
      },
    };

    const raw = JSON.stringify(nextAppData);
    localStorage.setItem(APP_DATA_STORAGE_KEY, raw);
    lastSeenStorageSnapshotRef.current = raw;
  }, [appData]);

  useEffect(() => {
    function handleStorage(event) {
      if (event.key !== APP_DATA_STORAGE_KEY) return;
      refreshFromLocalStorage();
    }

    function handleFocus() {
      refreshFromLocalStorage();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        refreshFromLocalStorage();
      }
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    autoRefreshTimerRef.current = setInterval(() => {
      refreshFromLocalStorage();
    }, 4000);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!didLoadCloudRef.current) return;
    if (!firebaseStatus?.connected) return;

    if (settingsSyncTimerRef.current) {
      clearTimeout(settingsSyncTimerRef.current);
    }

    settingsSyncTimerRef.current = setTimeout(() => {
      saveSettingsToFirestore(appData.settings);
    }, 700);

    return () => {
      if (settingsSyncTimerRef.current) {
        clearTimeout(settingsSyncTimerRef.current);
      }
    };
  }, [appData.settings]);

  useEffect(() => {
    if (!didLoadCloudRef.current) return;
    if (!firebaseStatus?.connected) return;

    if (bookingsSyncTimerRef.current) {
      clearTimeout(bookingsSyncTimerRef.current);
    }

    bookingsSyncTimerRef.current = setTimeout(() => {
      saveBookingsToFirestore(appData.bookings);
    }, 700);

    return () => {
      if (bookingsSyncTimerRef.current) {
        clearTimeout(bookingsSyncTimerRef.current);
      }
    };
  }, [appData.bookings]);

  const unreadNotificationsCount = useMemo(() => {
    return (appData.notifications || []).filter((item) => !item.read).length;
  }, [appData.notifications]);

  const sharedProps = useMemo(
    () => ({
      appData,
      setAppData,
      firebaseStatus,
      role,
      setRole,
    }),
    [appData, role]
  );

  return (
    <Routes>
      <Route
        path="/role"
        element={<RoleEntryPage role={role} setRole={setRole} />}
      />

      <Route
        path="/"
        element={
          role ? (
            <AppLayout
              theme={theme}
              setTheme={setTheme}
              appName={appData?.settings?.appName || "Tunglut Rapido Lamka"}
              role={role}
              setRole={setRole}
              unreadNotificationsCount={unreadNotificationsCount}
              canInstallApp={canInstallApp}
              onInstallApp={handleInstallApp}
            />
          ) : (
            <Navigate to="/role" replace />
          )
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage {...sharedProps} />} />
        <Route path="bookings" element={<BookingsPage {...sharedProps} />} />
        <Route path="drivers" element={<DriversPage {...sharedProps} />} />
        <Route path="wallet" element={<WalletPage {...sharedProps} />} />
        <Route path="reports" element={<ReportsPage {...sharedProps} />} />
        <Route
          path="notifications"
          element={<NotificationsPage appData={appData} setAppData={setAppData} />}
        />
        <Route path="settings" element={<SettingsPage {...sharedProps} />} />
      </Route>

      <Route
        path="*"
        element={<Navigate to={role ? "/dashboard" : "/role"} replace />}
      />
    </Routes>
  );
}

export default App;
import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

const navByRole = {
  admin: [
    { to: "/dashboard", label: "Dashboard", icon: "🏠" },
    { to: "/bookings", label: "Bookings", icon: "🛵" },
    { to: "/drivers", label: "Drivers", icon: "👨‍✈️" },
    { to: "/wallet", label: "Wallet", icon: "💰" },
    { to: "/reports", label: "Reports", icon: "📊" },
    { to: "/notifications", label: "Notifications", icon: "🔔" },
    { to: "/settings", label: "Settings", icon: "⚙️" },
  ],
  captain: [
    { to: "/dashboard", label: "Dashboard", icon: "🏠" },
    { to: "/bookings", label: "My Rides", icon: "🛵" },
    { to: "/wallet", label: "Earnings", icon: "💰" },
    { to: "/reports", label: "Reports", icon: "📊" },
    { to: "/notifications", label: "Notifications", icon: "🔔" },
  ],
  customer: [
    { to: "/dashboard", label: "Dashboard", icon: "🏠" },
    { to: "/bookings", label: "My Bookings", icon: "📱" },
    { to: "/wallet", label: "Payments", icon: "💳" },
    { to: "/reports", label: "Reports", icon: "📊" },
    { to: "/notifications", label: "Notifications", icon: "🔔" },
  ],
};

function AppLayout({
  theme,
  setTheme,
  appName,
  role,
  setRole,
  unreadNotificationsCount = 0,
  canInstallApp = false,
  onInstallApp,
}) {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const currentRole = role || "guest";
  const navItems = navByRole[currentRole] || [];
  const roleLabel =
    currentRole === "admin"
      ? "Admin"
      : currentRole === "captain"
      ? "Captain"
      : currentRole === "customer"
      ? "Customer"
      : "Guest";

  function toggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }

  function logoutRole() {
    setRole("");
    navigate("/role", { replace: true });
  }

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  function toggleMobileMenu() {
    setMobileMenuOpen((prev) => !prev);
  }

  function goToNotifications() {
    navigate("/notifications");
    closeMobileMenu();
  }

  async function handleInstallClick() {
    if (!onInstallApp) return;
    await onInstallApp();
  }

  useEffect(() => {
    function handleResize() {
      const mobile = window.innerWidth <= 980;
      setIsMobile(mobile);

      if (!mobile) {
        setMobileMenuOpen(false);
      }
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    closeMobileMenu();
  }, [role]);

  return (
    <div className="app-shell">
      <style>{`
        .app-layout-mobile-topbar {
          display: none;
        }

        .notification-bell-btn,
        .install-app-btn {
          position: relative;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.06);
          color: var(--text);
          min-width: 44px;
          min-height: 44px;
          border-radius: 14px;
          cursor: pointer;
          font-size: 1rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding-inline: 14px;
        }

        .install-app-btn {
          font-weight: 700;
        }

        .notification-badge {
          position: absolute;
          top: -6px;
          right: -6px;
          min-width: 20px;
          height: 20px;
          padding: 0 6px;
          border-radius: 999px;
          background: linear-gradient(135deg, #ef4444, #f97316);
          color: white;
          font-size: 0.72rem;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 18px rgba(0,0,0,0.22);
        }

        .topbar-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        @media (max-width: 980px) {
          .app-layout-mobile-topbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 14px;
            padding: 12px 14px;
            border-radius: 20px;
          }

          .app-layout-mobile-topbar-title {
            min-width: 0;
          }

          .app-layout-mobile-topbar-title h3 {
            margin: 0;
            font-size: 1rem;
            line-height: 1.2;
            word-break: break-word;
          }

          .app-layout-mobile-topbar-title p {
            margin: 4px 0 0;
            color: var(--text-soft);
            font-size: 0.84rem;
          }

          .app-layout-mobile-actions {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-shrink: 0;
          }

          .app-layout-mobile-menu-btn {
            border: 1px solid rgba(255,255,255,0.12);
            background: rgba(255,255,255,0.06);
            color: var(--text);
            min-width: 44px;
            min-height: 44px;
            border-radius: 14px;
            cursor: pointer;
            font-size: 1.1rem;
            flex-shrink: 0;
          }

          .app-frame {
            display: block !important;
          }

          .main-area {
            min-width: 0 !important;
            width: 100% !important;
          }

          .content-area {
            min-width: 0 !important;
            overflow-x: hidden !important;
          }

          .sidebar {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            bottom: 0 !important;
            width: min(320px, 88vw) !important;
            z-index: 60 !important;
            border-radius: 0 24px 24px 0 !important;
            transform: translateX(-104%);
            transition: transform 0.28s ease;
            overflow-y: auto !important;
            padding-bottom: 28px !important;
          }

          .sidebar.mobile-open {
            transform: translateX(0);
          }

          .topbar {
            padding: 14px !important;
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 12px !important;
          }

          .topbar-title {
            font-size: 1.08rem !important;
            line-height: 1.25 !important;
            word-break: break-word;
          }

          .status-pill {
            align-self: stretch;
            justify-content: center;
            text-align: center;
          }

          .topbar-actions {
            width: 100%;
            justify-content: space-between;
          }

          .install-app-btn.desktop-only {
            display: none !important;
          }
        }

        @media (min-width: 981px) {
          .install-app-btn.mobile-only {
            display: none !important;
          }
        }

        @media (max-width: 640px) {
          .content-area {
            padding: 0 !important;
          }

          .topbar {
            border-radius: 18px !important;
          }
        }
      `}</style>

      <div className="bg-orb orb-1" />
      <div className="bg-orb orb-2" />
      <div className="bg-grid" />

      {isMobile && mobileMenuOpen ? (
        <div
          onClick={closeMobileMenu}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            zIndex: 50,
          }}
        />
      ) : null}

      <div className="app-frame">
        <aside className={`glass sidebar ${mobileMenuOpen ? "mobile-open" : ""}`}>
          <div className="sidebar-brand">
            <div className="brand-logo">T</div>
            <div>
              <h3 className="sidebar-title">{appName}</h3>
              <p className="sidebar-subtitle">{roleLabel} access</p>
            </div>
          </div>

          <div className="sidebar-footer glass-inner">
            <p className="sidebar-footer-label">Current role</p>
            <strong>{roleLabel}</strong>
          </div>

          <nav className="sidebar-nav">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={closeMobileMenu}
                className={({ isActive }) =>
                  isActive ? "nav-item active" : "nav-item"
                }
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
                {item.to === "/notifications" && unreadNotificationsCount > 0 ? (
                  <span
                    style={{
                      marginLeft: "auto",
                      minWidth: "22px",
                      height: "22px",
                      borderRadius: "999px",
                      background: "linear-gradient(135deg, #ef4444, #f97316)",
                      color: "white",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      padding: "0 6px",
                    }}
                  >
                    {unreadNotificationsCount}
                  </span>
                ) : null}
              </NavLink>
            ))}
          </nav>

          <div className="sidebar-footer">
            <p className="sidebar-footer-label">Theme mode</p>

            <button className="theme-toggle" onClick={toggleTheme} type="button">
              <span className="toggle-track">
                <span className={`toggle-thumb ${theme}`} />
              </span>
              <span className="toggle-text">
                {theme === "dark" ? "Dark" : "Light"}
              </span>
            </button>

            {canInstallApp ? (
              <button
                className="secondary-btn small-btn"
                style={{ marginTop: "10px" }}
                onClick={handleInstallClick}
                type="button"
              >
                Install App
              </button>
            ) : null}

            <button
              className="secondary-btn small-btn"
              style={{ marginTop: "10px" }}
              onClick={logoutRole}
              type="button"
            >
              Logout Role
            </button>
          </div>
        </aside>

        <main
          className="main-area"
          style={{
            minWidth: 0,
            width: "100%",
          }}
        >
          <div className="glass app-layout-mobile-topbar">
            <div className="app-layout-mobile-topbar-title">
              <h3>{appName}</h3>
              <p>{roleLabel} mode</p>
            </div>

            <div className="app-layout-mobile-actions">
              {canInstallApp ? (
                <button
                  type="button"
                  className="install-app-btn mobile-only"
                  onClick={handleInstallClick}
                  aria-label="Install app"
                  title="Install app"
                >
                  ⬇️
                </button>
              ) : null}

              <button
                type="button"
                className="notification-bell-btn"
                onClick={goToNotifications}
                aria-label="Open notifications"
                title="Notifications"
              >
                🔔
                {unreadNotificationsCount > 0 ? (
                  <span className="notification-badge">
                    {unreadNotificationsCount}
                  </span>
                ) : null}
              </button>

              <button
                type="button"
                className="app-layout-mobile-menu-btn"
                onClick={toggleMobileMenu}
                aria-label="Open menu"
              >
                ☰
              </button>
            </div>
          </div>

          <header className="glass topbar">
            <div style={{ minWidth: 0 }}>
              <p className="topbar-label">Welcome back</p>
              <h2 className="topbar-title">{appName} Control Panel</h2>
            </div>

            <div className="topbar-actions">
              {canInstallApp ? (
                <button
                  type="button"
                  className="install-app-btn desktop-only"
                  onClick={handleInstallClick}
                  aria-label="Install app"
                  title="Install app"
                >
                  ⬇️ Install App
                </button>
              ) : null}

              <button
                type="button"
                className="notification-bell-btn"
                onClick={goToNotifications}
                aria-label="Open notifications"
                title="Notifications"
              >
                🔔
                {unreadNotificationsCount > 0 ? (
                  <span className="notification-badge">
                    {unreadNotificationsCount}
                  </span>
                ) : null}
              </button>

              <div className="status-pill glass-inner">
                <span className="status-dot" />
                <span>{roleLabel.toUpperCase()} MODE</span>
              </div>
            </div>
          </header>

          <div
            className="content-area"
            style={{
              minWidth: 0,
              overflowX: "hidden",
            }}
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
import { useMemo } from "react";

function NotificationsPage({ appData, setAppData }) {
  const notifications = appData.notifications || [];

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  function markAsRead(id) {
    setAppData((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    }));
  }

  function clearAll() {
    setAppData((prev) => ({
      ...prev,
      notifications: [],
    }));
  }

  return (
    <div className="page-stack">
      <section className="glass page-hero-small">
        <div>
          <div className="pill">Notifications</div>
          <h2 className="section-title">
            Alerts & System Activity Center
          </h2>
          <p className="section-text">
            All booking, payment, and system alerts appear here.
          </p>
        </div>

        <div className="status-pill glass-inner">
          🔔 {unreadCount} unread
        </div>
      </section>

      <section className="glass panel">
        <div className="panel-head">
          <h3>Recent Notifications</h3>
          <button
            className="secondary-btn small-btn"
            onClick={clearAll}
          >
            Clear All
          </button>
        </div>

        <div className="dashboard-list">
          {notifications.length === 0 ? (
            <div className="empty-state">
              <div>
                <div className="empty-icon">🔔</div>
                <h4>No notifications yet</h4>
                <p>Activity alerts will appear here.</p>
              </div>
            </div>
          ) : (
            notifications.map((n) => (
              <article
                key={n.id}
                className="dashboard-list-card"
                style={{
                  opacity: n.read ? 0.6 : 1,
                  borderLeft: `4px solid ${
                    n.type === "success"
                      ? "#22c55e"
                      : n.type === "error"
                      ? "#ef4444"
                      : n.type === "warning"
                      ? "#f59e0b"
                      : "#3b82f6"
                  }`,
                }}
              >
                <div className="dashboard-list-top">
                  <div>
                    <h4>{n.title}</h4>
                    <p>{n.createdAt}</p>
                  </div>

                  {!n.read && (
                    <button
                      className="secondary-btn small-btn"
                      onClick={() => markAsRead(n.id)}
                    >
                      Mark Read
                    </button>
                  )}
                </div>

                <div className="dashboard-mini-meta">
                  <span>{n.message}</span>
                  <span>{n.role.toUpperCase()}</span>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

export default NotificationsPage;
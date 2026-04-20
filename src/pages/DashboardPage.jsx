import { useMemo } from "react";

function DashboardPage({ appData, role }) {
  const { bookings = [], drivers = [], transactions = [], settings = {} } = appData || {};

  const totalIncome = useMemo(() => {
    return transactions
      .filter((item) => item.type === "Income")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [transactions]);

  const totalExpense = useMemo(() => {
    return transactions
      .filter((item) => item.type === "Expense")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [transactions]);

  const totalRefunds = useMemo(() => {
    return transactions
      .filter((item) => item.source === "Auto Ride Refund")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [transactions]);

  const walletBalance = totalIncome - totalExpense;

  const onlineDrivers = useMemo(() => {
    return drivers.filter((item) => item.status === "Online").length;
  }, [drivers]);

  const busyDrivers = useMemo(() => {
    return drivers.filter((item) => item.status === "Busy").length;
  }, [drivers]);

  const offlineDrivers = useMemo(() => {
    return drivers.filter((item) => item.status === "Offline").length;
  }, [drivers]);

  const activeBookings = useMemo(() => {
    return bookings.filter(
      (item) =>
        item.status === "Pending" ||
        item.status === "Assigned" ||
        item.status === "In Progress"
    ).length;
  }, [bookings]);

  const completedBookings = useMemo(() => {
    return bookings.filter((item) => item.status === "Completed").length;
  }, [bookings]);

  const cancelledBookings = useMemo(() => {
    return bookings.filter((item) => item.status === "Cancelled").length;
  }, [bookings]);

  const pendingBookings = useMemo(() => {
    return bookings.filter((item) => item.status === "Pending").length;
  }, [bookings]);

  const assignedBookings = useMemo(() => {
    return bookings.filter((item) => item.status === "Assigned").length;
  }, [bookings]);

  const inProgressBookings = useMemo(() => {
    return bookings.filter((item) => item.status === "In Progress").length;
  }, [bookings]);

  const recentBookings = useMemo(() => bookings.slice(0, 4), [bookings]);
  const recentTransactions = useMemo(() => transactions.slice(0, 4), [transactions]);

  const completionRate = useMemo(() => {
    if (bookings.length === 0) return 0;
    return Math.round((completedBookings / bookings.length) * 100);
  }, [bookings.length, completedBookings]);

  const cancellationRate = useMemo(() => {
    if (bookings.length === 0) return 0;
    return Math.round((cancelledBookings / bookings.length) * 100);
  }, [bookings.length, cancelledBookings]);

  const todayIncome = useMemo(() => {
    return transactions
      .filter((item) => item.type === "Income" && String(item.createdAt || "").includes("Today"))
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [transactions]);

  const todayExpense = useMemo(() => {
    return transactions
      .filter((item) => item.type === "Expense" && String(item.createdAt || "").includes("Today"))
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [transactions]);

  const paymentBreakdown = useMemo(() => {
    const result = { Cash: 0, Wallet: 0, Online: 0 };

    bookings.forEach((booking) => {
      const method = booking.paymentMethod || "Cash";
      if (!result[method]) {
        result[method] = 0;
      }
      result[method] += 1;
    });

    return result;
  }, [bookings]);

  const driverPerformance = useMemo(() => {
    const map = {};

    bookings.forEach((booking) => {
      if (booking.status !== "Completed") return;

      const driverName = booking.assignedDriverName || "Unassigned";
      if (!map[driverName]) {
        map[driverName] = {
          name: driverName,
          earnings: 0,
          rides: 0,
        };
      }

      map[driverName].earnings += Number(booking.fare || 0);
      map[driverName].rides += 1;
    });

    return Object.values(map).sort((a, b) => {
      if (b.earnings !== a.earnings) return b.earnings - a.earnings;
      return b.rides - a.rides;
    });
  }, [bookings]);

  const topDriver = useMemo(() => {
    return driverPerformance[0] || { name: "N/A", earnings: 0, rides: 0 };
  }, [driverPerformance]);

  const captainEarnings = useMemo(() => {
    if (role !== "captain") return 0;

    return bookings
      .filter((item) => item.status === "Completed" && item.assignedDriverName)
      .reduce((sum, item) => sum + Number(item.fare || 0), 0);
  }, [bookings, role]);

  const captainTodayEarnings = useMemo(() => {
    if (role !== "captain") return 0;

    return bookings
      .filter(
        (item) =>
          item.status === "Completed" &&
          item.assignedDriverName &&
          String(item.createdAt || "").includes("Today")
      )
      .reduce((sum, item) => sum + Number(item.fare || 0), 0);
  }, [bookings, role]);

  const adminCards = [
    {
      label: "Active bookings",
      value: String(activeBookings).padStart(2, "0"),
      icon: "🛵",
      note: `Pending ${pendingBookings} • Assigned ${assignedBookings} • Live ${inProgressBookings}`,
    },
    {
      label: "Revenue today",
      value: `₹${todayIncome.toLocaleString()}`,
      icon: "📈",
      note: `Expense today ₹${todayExpense.toLocaleString()}`,
    },
    {
      label: "Refund total",
      value: `₹${totalRefunds.toLocaleString()}`,
      icon: "💸",
      note: `${cancelledBookings} cancelled rides`,
    },
    {
      label: "Top driver",
      value: topDriver.name,
      icon: "🏆",
      note: `₹${topDriver.earnings.toLocaleString()} • ${topDriver.rides} rides`,
    },
  ];

  const captainCards = [
    {
      label: "Assigned rides",
      value: String(assignedBookings).padStart(2, "0"),
      icon: "🛵",
      note: `${inProgressBookings} in progress`,
    },
    {
      label: "Completed rides",
      value: String(completedBookings).padStart(2, "0"),
      icon: "✅",
      note: `${cancellationRate}% cancellation rate`,
    },
    {
      label: "Today earnings",
      value: `₹${captainTodayEarnings.toLocaleString()}`,
      icon: "📅",
      note: "Today ride earnings",
    },
    {
      label: "Total earnings",
      value: `₹${captainEarnings.toLocaleString()}`,
      icon: "💰",
      note: `${completionRate}% completion rate`,
    },
  ];

  const customerCards = [
    {
      label: "My booking view",
      value: String(bookings.length).padStart(2, "0"),
      icon: "📱",
      note: `${activeBookings} active rides`,
    },
    {
      label: "Completed rides",
      value: String(completedBookings).padStart(2, "0"),
      icon: "✅",
      note: `${cancelledBookings} cancelled`,
    },
    {
      label: "Payment mix",
      value: `${paymentBreakdown.Online || 0}`,
      icon: "💳",
      note: `Online bookings • Wallet ${paymentBreakdown.Wallet || 0}`,
    },
    {
      label: "Net payment view",
      value: `₹${walletBalance.toLocaleString()}`,
      icon: "📊",
      note: `Refunds ₹${totalRefunds.toLocaleString()}`,
    },
  ];

  const dashboardCards =
    role === "admin"
      ? adminCards
      : role === "captain"
      ? captainCards
      : customerCards;

  const heroTitle =
    role === "admin"
      ? "dashboard PRO MAX is ready"
      : role === "captain"
      ? "captain analytics are ready"
      : "customer overview is ready";

  const heroText =
    role === "admin"
      ? "You are now inside the admin panel with stronger KPI visibility, ride performance tracking, refunds, and revenue intelligence."
      : role === "captain"
      ? "You are now inside the captain panel with stronger ride and earnings visibility."
      : "You are now inside the customer panel with clearer booking and payment visibility.";

  const heroButtons =
    role === "admin"
      ? ["admin KPI Mode", "Live Business View"]
      : role === "captain"
      ? ["captain KPI Mode", "Ride Operations Ready"]
      : ["customer View Active", "Booking View Ready"];

  return (
    <div className="page-stack">
      <section className="hero glass">
        <div className="hero-left">
          <div className="pill">{role} • Live Local Overview</div>
          <h2 className="hero-title">
            Your ride platform
            <span className="gradient-text">{heroTitle}</span>
          </h2>
          <p className="hero-text">{heroText}</p>

          <div className="hero-actions">
            <button className="primary-btn" type="button">
              {heroButtons[0]}
            </button>
            <button className="secondary-btn" type="button">
              {heroButtons[1]}
            </button>
          </div>
        </div>

        <div className="hero-right">
          <div className="dashboard-highlight glass-inner">
            <div className="dashboard-highlight-row">
              <span className="dashboard-highlight-label">Role</span>
              <strong>{role}</strong>
            </div>
            <div className="dashboard-highlight-row">
              <span className="dashboard-highlight-label">Primary Zone</span>
              <strong>{settings.primaryZone || "Lamka Bazar"}</strong>
            </div>
            <div className="dashboard-highlight-row">
              <span className="dashboard-highlight-label">Support</span>
              <strong>{settings.supportPhone || "+91 7000000000"}</strong>
            </div>
            <div className="dashboard-highlight-row">
              <span className="dashboard-highlight-label">Service Hours</span>
              <strong>
                {(settings.serviceStart || "06:00") + " - " + (settings.serviceEnd || "22:00")}
              </strong>
            </div>
          </div>
        </div>
      </section>

      <section className="stats-grid">
        {dashboardCards.map((item) => (
          <article className="stat-card glass" key={item.label}>
            <div className="stat-icon">{item.icon}</div>
            <div>
              <p className="stat-label">{item.label}</p>
              <h3 className="stat-value">{item.value}</h3>
              {item.note ? <p className="stat-note">{item.note}</p> : null}
            </div>
          </article>
        ))}
      </section>

      <section className="content-grid">
        <section className="glass panel">
          <div className="panel-head">
            <h3>
              {role === "admin"
                ? "Recent bookings"
                : role === "captain"
                ? "Ride overview"
                : "Booking overview"}
            </h3>
            <span className="panel-tag">{bookings.length} total</span>
          </div>

          <div className="dashboard-list">
            {recentBookings.length === 0 ? (
              <article className="dashboard-list-card">
                <div className="dashboard-list-top">
                  <div>
                    <h4>No bookings yet</h4>
                    <p>Create rides to populate the dashboard.</p>
                  </div>
                </div>
              </article>
            ) : (
              recentBookings.map((booking) => (
                <article className="dashboard-list-card" key={booking.id}>
                  <div className="dashboard-list-top">
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
                          : booking.status === "Assigned" || booking.status === "In Progress"
                          ? "assigned"
                          : booking.status === "Completed"
                          ? "completed"
                          : "cancelled"
                      }`}
                    >
                      {booking.status}
                    </span>
                  </div>

                  <div className="dashboard-mini-meta">
                    <span>{booking.rideType}</span>
                    <span>{booking.paymentMethod}</span>
                    <span>₹{Number(booking.fare || 0).toLocaleString()}</span>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="glass panel">
          <div className="panel-head">
            <h3>
              {role === "admin"
                ? "Recent wallet activity"
                : role === "captain"
                ? "Earnings snapshot"
                : "Payment snapshot"}
            </h3>
            <span className="panel-tag">{transactions.length} total</span>
          </div>

          <div className="dashboard-list">
            {recentTransactions.length === 0 ? (
              <article className="dashboard-list-card">
                <div className="dashboard-list-top">
                  <div>
                    <h4>No transactions yet</h4>
                    <p>Ride income and refunds will appear here.</p>
                  </div>
                </div>
              </article>
            ) : (
              recentTransactions.map((item) => (
                <article className="dashboard-list-card" key={item.id}>
                  <div className="dashboard-list-top">
                    <div>
                      <h4>{item.title}</h4>
                      <p>{item.createdAt}</p>
                    </div>
                    <span
                      className={`wallet-type-badge ${
                        item.type === "Income" ? "income" : "expense"
                      }`}
                    >
                      {item.type}
                    </span>
                  </div>

                  <div className="dashboard-mini-meta">
                    <span>{item.method}</span>
                    <span
                      className={
                        item.type === "Income"
                          ? "wallet-amount-income"
                          : "wallet-amount-expense"
                      }
                    >
                      {item.type === "Income" ? "+" : "-"}₹{Number(item.amount || 0).toLocaleString()}
                    </span>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </section>

      <section className="dashboard-bottom-grid">
        <section className="glass panel">
          <div className="panel-head">
            <h3>
              {role === "admin"
                ? "Driver overview"
                : role === "captain"
                ? "Captain operation view"
                : "Service overview"}
            </h3>
            <span className="panel-tag">{drivers.length} drivers</span>
          </div>

          <div className="dashboard-driver-grid">
            {drivers.slice(0, 4).map((driver) => (
              <article className="dashboard-driver-card" key={driver.id}>
                <div className="driver-avatar">{driver.name.charAt(0)}</div>
                <div>
                  <h4>{driver.name}</h4>
                  <p>
                    {driver.vehicle} • {driver.area}
                  </p>
                </div>
                <span
                  className={`driver-status ${
                    driver.status === "Online"
                      ? "online"
                      : driver.status === "Busy"
                      ? "busy"
                      : "offline"
                  }`}
                >
                  {driver.status}
                </span>
              </article>
            ))}
          </div>

          <div className="settings-preview-list" style={{ marginTop: "14px" }}>
            <article className="settings-preview-card">
              <h4>Driver status totals</h4>
              <p><strong>Online:</strong> {onlineDrivers}</p>
              <p><strong>Busy:</strong> {busyDrivers}</p>
              <p><strong>Offline:</strong> {offlineDrivers}</p>
            </article>
          </div>
        </section>

        <section className="glass panel">
          <div className="panel-head">
            <h3>
              {role === "admin"
                ? "KPI snapshot"
                : role === "captain"
                ? "Captain quick info"
                : "Customer quick info"}
            </h3>
            <span className="panel-tag">
              {role === "admin" ? "Live business view" : "From system"}
            </span>
          </div>

          {role === "admin" ? (
            <div className="settings-preview-list">
              <article className="settings-preview-card">
                <h4>Business snapshot</h4>
                <p><strong>Total Income:</strong> ₹{totalIncome.toLocaleString()}</p>
                <p><strong>Total Expense:</strong> ₹{totalExpense.toLocaleString()}</p>
                <p><strong>Total Refunds:</strong> ₹{totalRefunds.toLocaleString()}</p>
                <p><strong>Wallet Balance:</strong> ₹{walletBalance.toLocaleString()}</p>
              </article>

              <article className="settings-preview-card">
                <h4>Ride performance</h4>
                <p><strong>Completion Rate:</strong> {completionRate}%</p>
                <p><strong>Cancellation Rate:</strong> {cancellationRate}%</p>
                <p><strong>Top Driver:</strong> {topDriver.name}</p>
              </article>
            </div>
          ) : role === "captain" ? (
            <div className="settings-preview-list">
              <article className="settings-preview-card">
                <h4>Captain earnings</h4>
                <p><strong>Today Earnings:</strong> ₹{captainTodayEarnings.toLocaleString()}</p>
                <p><strong>Total Earnings:</strong> ₹{captainEarnings.toLocaleString()}</p>
                <p><strong>Completed Rides:</strong> {completedBookings}</p>
              </article>

              <article className="settings-preview-card">
                <h4>Ride pipeline</h4>
                <p><strong>Pending:</strong> {pendingBookings}</p>
                <p><strong>Assigned:</strong> {assignedBookings}</p>
                <p><strong>In Progress:</strong> {inProgressBookings}</p>
              </article>
            </div>
          ) : (
            <div className="settings-preview-list">
              <article className="settings-preview-card">
                <h4>Base fares</h4>
                <p>
                  <strong>Bike:</strong> {(settings.currency || "INR (₹)") + " " + (settings.baseFareBike || "79")}
                </p>
                <p>
                  <strong>Auto:</strong> {(settings.currency || "INR (₹)") + " " + (settings.baseFareAuto || "129")}
                </p>
                <p>
                  <strong>Cab:</strong> {(settings.currency || "INR (₹)") + " " + (settings.baseFareCab || "219")}
                </p>
              </article>

              <article className="settings-preview-card">
                <h4>Service zones</h4>
                <p><strong>Primary:</strong> {settings.primaryZone || "Lamka Bazar"}</p>
                <p><strong>Secondary:</strong> {settings.secondaryZone || "Zenhang"}</p>
                <p><strong>Tertiary:</strong> {settings.tertiaryZone || "Tuibuang"}</p>
              </article>
            </div>
          )}
        </section>
      </section>

      <section className="content-grid">
        <section className="glass panel">
          <div className="panel-head">
            <h3>Payment method split</h3>
            <span className="panel-tag">Live booking mix</span>
          </div>

          <div className="settings-preview-list">
            <article className="settings-preview-card">
              <h4>Payment methods</h4>
              <p><strong>Cash:</strong> {paymentBreakdown.Cash || 0}</p>
              <p><strong>Wallet:</strong> {paymentBreakdown.Wallet || 0}</p>
              <p><strong>Online:</strong> {paymentBreakdown.Online || 0}</p>
            </article>

            <article className="settings-preview-card">
              <h4>Quick read</h4>
              <p><strong>Pending:</strong> {pendingBookings}</p>
              <p><strong>Completed:</strong> {completedBookings}</p>
              <p><strong>Cancelled:</strong> {cancelledBookings}</p>
            </article>
          </div>
        </section>

        <section className="glass panel">
          <div className="panel-head">
            <h3>Top driver performance</h3>
            <span className="panel-tag">{driverPerformance.length} tracked</span>
          </div>

          <div className="dashboard-list">
            {driverPerformance.length === 0 ? (
              <article className="dashboard-list-card">
                <div className="dashboard-list-top">
                  <div>
                    <h4>No completed driver data yet</h4>
                    <p>Complete rides to populate performance ranking.</p>
                  </div>
                </div>
              </article>
            ) : (
              driverPerformance.slice(0, 4).map((item, index) => (
                <article className="dashboard-list-card" key={item.name}>
                  <div className="dashboard-list-top">
                    <div>
                      <h4>
                        #{index + 1} {item.name}
                      </h4>
                      <p>Completed ride performance</p>
                    </div>
                    <span className="wallet-type-badge income">
                      ₹{item.earnings.toLocaleString()}
                    </span>
                  </div>

                  <div className="dashboard-mini-meta">
                    <span>{item.rides} rides</span>
                    <span>Top ranking</span>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </section>
    </div>
  );
}

export default DashboardPage;
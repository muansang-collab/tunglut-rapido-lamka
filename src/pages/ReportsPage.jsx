import { useMemo } from "react";

function ReportsPage({ appData, role }) {
  const { bookings = [], drivers = [], transactions = [] } = appData || {};

  const totalBookings = bookings.length;

  const pendingBookings = useMemo(() => {
    return bookings.filter((item) => item.status === "Pending").length;
  }, [bookings]);

  const assignedBookings = useMemo(() => {
    return bookings.filter((item) => item.status === "Assigned").length;
  }, [bookings]);

  const inProgressBookings = useMemo(() => {
    return bookings.filter((item) => item.status === "In Progress").length;
  }, [bookings]);

  const completedBookings = useMemo(() => {
    return bookings.filter((item) => item.status === "Completed").length;
  }, [bookings]);

  const cancelledBookings = useMemo(() => {
    return bookings.filter((item) => item.status === "Cancelled").length;
  }, [bookings]);

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

  const netBalance = totalIncome - totalExpense;

  const completionRate = useMemo(() => {
    if (totalBookings === 0) return 0;
    return Math.round((completedBookings / totalBookings) * 100);
  }, [completedBookings, totalBookings]);

  const cancellationRate = useMemo(() => {
    if (totalBookings === 0) return 0;
    return Math.round((cancelledBookings / totalBookings) * 100);
  }, [cancelledBookings, totalBookings]);

  const paymentBreakdown = useMemo(() => {
    const result = {
      Cash: 0,
      Wallet: 0,
      "Google Pay": 0,
    };

    bookings.forEach((booking) => {
      const method = booking.paymentMethod || "Cash";
      if (!result[method]) {
        result[method] = 0;
      }
      result[method] += 1;
    });

    return result;
  }, [bookings]);

  const rideTypeBreakdown = useMemo(() => {
    const result = {
      Bike: 0,
      Auto: 0,
      Cab: 0,
    };

    bookings.forEach((booking) => {
      const rideType = booking.rideType || "Bike";
      if (!result[rideType]) {
        result[rideType] = 0;
      }
      result[rideType] += 1;
    });

    return result;
  }, [bookings]);

  const driverEarnings = useMemo(() => {
    const map = {};

    bookings.forEach((booking) => {
      if (booking.status !== "Completed") return;

      const driverName = booking.assignedDriverName || "Unassigned";
      if (!map[driverName]) {
        map[driverName] = 0;
      }

      map[driverName] += Number(booking.fare || 0);
    });

    return map;
  }, [bookings]);

  const driverRideCounts = useMemo(() => {
    const map = {};

    bookings.forEach((booking) => {
      if (booking.status !== "Completed") return;

      const driverName = booking.assignedDriverName || "Unassigned";
      if (!map[driverName]) {
        map[driverName] = 0;
      }

      map[driverName] += 1;
    });

    return map;
  }, [bookings]);

  const driverPerformance = useMemo(() => {
    return Object.keys(driverEarnings)
      .map((driverName) => ({
        name: driverName,
        earnings: Number(driverEarnings[driverName] || 0),
        rides: Number(driverRideCounts[driverName] || 0),
      }))
      .sort((a, b) => {
        if (b.earnings !== a.earnings) return b.earnings - a.earnings;
        return b.rides - a.rides;
      });
  }, [driverEarnings, driverRideCounts]);

  const topDriver = useMemo(() => {
    if (driverPerformance.length === 0) {
      return { name: "N/A", earnings: 0, rides: 0 };
    }
    return driverPerformance[0];
  }, [driverPerformance]);

  const onlineDrivers = useMemo(() => {
    return drivers.filter((item) => item.status === "Online").length;
  }, [drivers]);

  const busyDrivers = useMemo(() => {
    return drivers.filter((item) => item.status === "Busy").length;
  }, [drivers]);

  const offlineDrivers = useMemo(() => {
    return drivers.filter((item) => item.status === "Offline").length;
  }, [drivers]);

  const paidBookings = useMemo(() => {
    return bookings.filter((item) => item.paymentStatus === "Paid").length;
  }, [bookings]);

  const pendingPayments = useMemo(() => {
    return bookings.filter(
      (item) => !item.paymentStatus || item.paymentStatus === "Pending"
    ).length;
  }, [bookings]);

  const googlePayTransactions = useMemo(() => {
    return transactions.filter((item) => item.method === "Google Pay").length;
  }, [transactions]);

  const reportCards = [
    {
      id: 1,
      title: "Total bookings",
      value: String(totalBookings).padStart(2, "0"),
      icon: "📋",
      note: "All ride requests",
    },
    {
      id: 2,
      title: "Total income",
      value: `₹${totalIncome.toLocaleString()}`,
      icon: "💰",
      note: "All income transactions",
    },
    {
      id: 3,
      title: "Refund total",
      value: `₹${totalRefunds.toLocaleString()}`,
      icon: "💸",
      note: "Wallet and online refunds",
    },
    {
      id: 4,
      title: "Net balance",
      value: `₹${netBalance.toLocaleString()}`,
      icon: "📊",
      note: "Income minus expense",
    },
  ];

  const recentReportBookings = useMemo(() => bookings.slice(0, 6), [bookings]);
  const recentTransactions = useMemo(() => transactions.slice(0, 6), [transactions]);

  const bookingStatusChartData = [
    { label: "Pending", value: pendingBookings },
    { label: "Assigned", value: assignedBookings },
    { label: "In Progress", value: inProgressBookings },
    { label: "Completed", value: completedBookings },
    { label: "Cancelled", value: cancelledBookings },
  ];

  const paymentChartData = [
    { label: "Cash", value: paymentBreakdown.Cash || 0 },
    { label: "Wallet", value: paymentBreakdown.Wallet || 0 },
    { label: "Google Pay", value: paymentBreakdown["Google Pay"] || 0 },
    { label: "Paid", value: paidBookings },
    { label: "Pending", value: pendingPayments },
  ];

  const rideTypeChartData = [
    { label: "Bike", value: rideTypeBreakdown.Bike || 0 },
    { label: "Auto", value: rideTypeBreakdown.Auto || 0 },
    { label: "Cab", value: rideTypeBreakdown.Cab || 0 },
  ];

  const financialChartData = [
    { label: "Income", value: totalIncome },
    { label: "Expense", value: totalExpense },
    { label: "Refunds", value: totalRefunds },
    { label: "Net", value: netBalance < 0 ? 0 : netBalance },
  ];

  function handlePrint() {
    window.print();
  }

  function escapeCsvValue(value) {
    const stringValue = String(value ?? "");
    if (
      stringValue.includes(",") ||
      stringValue.includes('"') ||
      stringValue.includes("\n")
    ) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  }

  function downloadCsv(filename, rows) {
    const csvContent = rows.map((row) => row.map(escapeCsvValue).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  function exportBookingsCsv() {
    const rows = [
      [
        "Booking ID",
        "Rider Name",
        "Phone",
        "Pickup",
        "Drop",
        "Ride Type",
        "Payment Method",
        "Payment Status",
        "Assigned Driver",
        "Fare",
        "Status",
        "Ride Stage",
        "Assignment Mode",
        "Refund Status",
        "Created At",
      ],
      ...bookings.map((booking) => [
        booking.id,
        booking.riderName,
        booking.riderPhone,
        booking.pickup,
        booking.drop,
        booking.rideType,
        booking.paymentMethod,
        booking.paymentStatus || "Pending",
        booking.assignedDriverName || "Not assigned yet",
        Number(booking.fare || 0),
        booking.status,
        booking.rideStage || "Waiting",
        booking.assignmentMode || "Unassigned",
        booking.refundStatus || "Not Required",
        booking.createdAt,
      ]),
    ];

    downloadCsv("tunglut-bookings-report.csv", rows);
  }

  function exportTransactionsCsv() {
    const rows = [
      [
        "Transaction ID",
        "Type",
        "Title",
        "Amount",
        "Method",
        "Source",
        "Booking ID",
        "Created At",
      ],
      ...transactions.map((item) => [
        item.id,
        item.type,
        item.title,
        Number(item.amount || 0),
        item.method || "",
        item.source || "Manual",
        item.bookingId || "",
        item.createdAt || "",
      ]),
    ];

    downloadCsv("tunglut-transactions-report.csv", rows);
  }

  function getMaxChartValue(items) {
    const max = Math.max(...items.map((item) => Number(item.value || 0)), 0);
    return max === 0 ? 1 : max;
  }

  function renderBarChart(title, tag, items, formatter = (value) => value) {
    const maxValue = getMaxChartValue(items);

    return (
      <section className="glass panel report-page-break-avoid">
        <div className="panel-head">
          <h3>{title}</h3>
          <span className="panel-tag">{tag}</span>
        </div>

        <div style={{ display: "grid", gap: "12px" }}>
          {items.map((item) => {
            const width = `${Math.max(8, (Number(item.value || 0) / maxValue) * 100)}%`;

            return (
              <div key={item.label} style={{ display: "grid", gap: "6px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "12px",
                    fontSize: "0.92rem",
                    color: "var(--text-soft)",
                  }}
                >
                  <span>{item.label}</span>
                  <strong style={{ color: "var(--text)" }}>
                    {formatter(item.value)}
                  </strong>
                </div>

                <div
                  style={{
                    height: "12px",
                    borderRadius: "999px",
                    background: "rgba(255,255,255,0.08)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width,
                      height: "100%",
                      borderRadius: "999px",
                      background:
                        "linear-gradient(135deg, var(--accent), var(--accent-2))",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <div className="page-stack">
      <style>{`
        @media print {
          .report-print-hide {
            display: none !important;
          }

          .report-print-root {
            background: white !important;
            color: black !important;
          }

          .report-print-root .glass,
          .report-print-root .panel,
          .report-print-root .info-card,
          .report-print-root .settings-preview-card,
          .report-print-root .dashboard-list-card {
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: 1px solid #d1d5db !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
          }

          .report-print-root .info-label,
          .report-print-root .info-note,
          .report-print-root .section-text,
          .report-print-root .dashboard-list-card p,
          .report-print-root .dashboard-mini-meta span,
          .report-print-root .panel-tag {
            color: #374151 !important;
          }

          .report-print-root .section-title,
          .report-print-root .info-value,
          .report-print-root h3,
          .report-print-root h4,
          .report-print-root strong {
            color: black !important;
          }

          .report-print-grid-two {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 16px !important;
          }

          .report-print-grid-four {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 12px !important;
          }

          .report-page-break-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          body {
            background: white !important;
          }
        }
      `}</style>

      <div className="report-print-root">
        <section className="glass page-hero-small report-page-break-avoid">
          <div>
            <div className="pill">Reports Module</div>
            <h2 className="section-title">
              {role === "admin"
                ? "Business and visual reports"
                : role === "captain"
                ? "Ride and earnings reports"
                : "Booking and payment reports"}
            </h2>
            <p className="section-text">
              Reports PRO MAX now includes visual charts for bookings, payments,
              ride mix, and money flow while keeping print and CSV export.
            </p>
          </div>
        </section>

        <section
          className="glass panel report-print-hide"
          style={{ marginTop: "12px" }}
        >
          <div className="panel-head">
            <h3>Report actions</h3>
            <span className="panel-tag">Step 41</span>
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <button className="primary-btn" type="button" onClick={handlePrint}>
              Print Report
            </button>

            <button
              className="secondary-btn"
              type="button"
              onClick={exportBookingsCsv}
            >
              Export Bookings CSV
            </button>

            <button
              className="secondary-btn"
              type="button"
              onClick={exportTransactionsCsv}
            >
              Export Transactions CSV
            </button>

            <button
              className="secondary-btn"
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              Back to Top
            </button>
          </div>
        </section>

        <section
          className="glass panel report-page-break-avoid"
          style={{ marginTop: "12px" }}
        >
          <div className="panel-head">
            <h3>Print header</h3>
            <span className="panel-tag">Business summary</span>
          </div>

          <div className="settings-preview-list">
            <article className="settings-preview-card">
              <h4>Tunglut Rapido Lamka</h4>
              <p><strong>Report Type:</strong> Operational and Financial Summary</p>
              <p><strong>Role View:</strong> {role || "N/A"}</p>
              <p><strong>Total Bookings:</strong> {totalBookings}</p>
            </article>

            <article className="settings-preview-card">
              <h4>Quick totals</h4>
              <p><strong>Total Income:</strong> ₹{totalIncome.toLocaleString()}</p>
              <p><strong>Total Refunds:</strong> ₹{totalRefunds.toLocaleString()}</p>
              <p><strong>Net Balance:</strong> ₹{netBalance.toLocaleString()}</p>
            </article>
          </div>
        </section>

        <section className="mini-grid report-print-grid-four report-page-break-avoid">
          {reportCards.map((item) => (
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

        <section className="content-grid report-print-grid-two">
          {renderBarChart("Financial chart", "₹ values", financialChartData, (value) => `₹${Number(value || 0).toLocaleString()}`)}
          {renderBarChart("Booking status chart", "Ride flow", bookingStatusChartData)}
        </section>

        <section className="content-grid report-print-grid-two">
          {renderBarChart("Payment method chart", "Payment mix", paymentChartData)}
          {renderBarChart("Ride type chart", "Vehicle mix", rideTypeChartData)}
        </section>

        <section className="content-grid report-print-grid-two">
          <section className="glass panel report-page-break-avoid">
            <div className="panel-head">
              <h3>Ride status analytics</h3>
              <span className="panel-tag">Live totals</span>
            </div>

            <div className="settings-preview-list">
              <article className="settings-preview-card">
                <h4>Status breakdown</h4>
                <p><strong>Pending:</strong> {pendingBookings}</p>
                <p><strong>Assigned:</strong> {assignedBookings}</p>
                <p><strong>In Progress:</strong> {inProgressBookings}</p>
                <p><strong>Completed:</strong> {completedBookings}</p>
                <p><strong>Cancelled:</strong> {cancelledBookings}</p>
              </article>

              <article className="settings-preview-card">
                <h4>Performance rates</h4>
                <p><strong>Completion Rate:</strong> {completionRate}%</p>
                <p><strong>Cancellation Rate:</strong> {cancellationRate}%</p>
                <p><strong>Total Bookings:</strong> {totalBookings}</p>
              </article>
            </div>
          </section>

          <section className="glass panel report-page-break-avoid">
            <div className="panel-head">
              <h3>Money analytics</h3>
              <span className="panel-tag">Finance view</span>
            </div>

            <div className="settings-preview-list">
              <article className="settings-preview-card">
                <h4>Income and expense</h4>
                <p><strong>Total Income:</strong> ₹{totalIncome.toLocaleString()}</p>
                <p><strong>Total Expense:</strong> ₹{totalExpense.toLocaleString()}</p>
                <p><strong>Total Refunds:</strong> ₹{totalRefunds.toLocaleString()}</p>
                <p><strong>Net Balance:</strong> ₹{netBalance.toLocaleString()}</p>
              </article>

              <article className="settings-preview-card">
                <h4>Top driver result</h4>
                <p><strong>Name:</strong> {topDriver.name}</p>
                <p><strong>Earnings:</strong> ₹{topDriver.earnings.toLocaleString()}</p>
                <p><strong>Completed Rides:</strong> {topDriver.rides}</p>
              </article>
            </div>
          </section>
        </section>

        <section className="content-grid report-print-grid-two">
          <section className="glass panel report-page-break-avoid">
            <div className="panel-head">
              <h3>Payment method insights</h3>
              <span className="panel-tag">Booking split</span>
            </div>

            <div className="settings-preview-list">
              <article className="settings-preview-card">
                <h4>Payment methods</h4>
                <p><strong>Cash:</strong> {paymentBreakdown.Cash || 0}</p>
                <p><strong>Wallet:</strong> {paymentBreakdown.Wallet || 0}</p>
                <p><strong>Google Pay:</strong> {paymentBreakdown["Google Pay"] || 0}</p>
              </article>

              <article className="settings-preview-card">
                <h4>Payment status</h4>
                <p><strong>Paid:</strong> {paidBookings}</p>
                <p><strong>Pending:</strong> {pendingPayments}</p>
                <p><strong>Google Pay Txns:</strong> {googlePayTransactions}</p>
              </article>
            </div>
          </section>

          <section className="glass panel report-page-break-avoid">
            <div className="panel-head">
              <h3>Driver availability insight</h3>
              <span className="panel-tag">{drivers.length} drivers</span>
            </div>

            <div className="settings-preview-list">
              <article className="settings-preview-card">
                <h4>Driver status</h4>
                <p><strong>Online:</strong> {onlineDrivers}</p>
                <p><strong>Busy:</strong> {busyDrivers}</p>
                <p><strong>Offline:</strong> {offlineDrivers}</p>
              </article>

              <article className="settings-preview-card">
                <h4>Dispatch quick read</h4>
                <p><strong>Available pool:</strong> {onlineDrivers}</p>
                <p><strong>Currently occupied:</strong> {busyDrivers}</p>
                <p><strong>Unavailable:</strong> {offlineDrivers}</p>
              </article>
            </div>
          </section>
        </section>

        <section className="glass panel report-page-break-avoid">
          <div className="panel-head">
            <h3>Driver performance ranking</h3>
            <span className="panel-tag">{driverPerformance.length} drivers</span>
          </div>

          <div className="dashboard-list">
            {driverPerformance.length === 0 ? (
              <article className="dashboard-list-card">
                <div className="dashboard-list-top">
                  <div>
                    <h4>No driver performance yet</h4>
                    <p>Complete rides to generate ranking data.</p>
                  </div>
                </div>
              </article>
            ) : (
              driverPerformance.map((item, index) => (
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
                    <span>Completed rides: {item.rides}</span>
                    <span>Total earnings</span>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="content-grid report-print-grid-two">
          <section className="glass panel report-page-break-avoid">
            <div className="panel-head">
              <h3>Recent bookings report</h3>
              <span className="panel-tag">{recentReportBookings.length} shown</span>
            </div>

            <div className="dashboard-list">
              {recentReportBookings.length === 0 ? (
                <article className="dashboard-list-card">
                  <div className="dashboard-list-top">
                    <div>
                      <h4>No bookings yet</h4>
                      <p>Create rides to populate this report.</p>
                    </div>
                  </div>
                </article>
              ) : (
                recentReportBookings.map((booking) => (
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
                      <span>{booking.paymentStatus || "Pending"}</span>
                      <span>₹{Number(booking.fare || 0).toLocaleString()}</span>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="glass panel report-page-break-avoid">
            <div className="panel-head">
              <h3>Recent transaction report</h3>
              <span className="panel-tag">{recentTransactions.length} shown</span>
            </div>

            <div className="dashboard-list">
              {recentTransactions.length === 0 ? (
                <article className="dashboard-list-card">
                  <div className="dashboard-list-top">
                    <div>
                      <h4>No transactions yet</h4>
                      <p>Complete rides or refunds to populate this report.</p>
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
                      <span>{item.source || "Manual"}</span>
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
      </div>
    </div>
  );
}

export default ReportsPage;
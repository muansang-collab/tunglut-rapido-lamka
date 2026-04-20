import { useMemo, useState } from "react";

const typeOptions = ["Income", "Expense"];
const methodOptions = ["Cash", "Wallet", "Online"];

function WalletPage({ appData, setAppData, role }) {
  const { transactions = [] } = appData || {};

  const [form, setForm] = useState({
    type: "Income",
    title: "",
    amount: "",
    method: "Cash",
  });

  const [error, setError] = useState("");

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

  const balance = totalIncome - totalExpense;

  const captainRideIncome = useMemo(() => {
    return transactions
      .filter((item) => item.source === "Auto Ride Completion")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [transactions]);

  const captainRideCount = useMemo(() => {
    return transactions.filter((item) => item.source === "Auto Ride Completion").length;
  }, [transactions]);

  const customerPaymentCount = useMemo(() => {
    return transactions.filter((item) => item.type === "Income").length;
  }, [transactions]);

  const visibleTransactions = useMemo(() => {
    if (role === "captain") {
      return transactions.filter(
        (item) => item.source === "Auto Ride Completion" || item.type === "Income"
      );
    }

    if (role === "customer") {
      return transactions.filter((item) => item.type === "Income");
    }

    return transactions;
  }, [transactions, role]);

  const walletStats = useMemo(() => {
    if (role === "captain") {
      return [
        {
          id: 1,
          label: "Captain earnings",
          value: `₹${captainRideIncome.toLocaleString()}`,
          icon: "💰",
          note: "From completed rides",
        },
        {
          id: 2,
          label: "Completed ride income",
          value: String(captainRideCount).padStart(2, "0"),
          icon: "🛵",
          note: "Auto-added ride earnings",
        },
        {
          id: 3,
          label: "Income entries",
          value: String(
            transactions.filter((item) => item.type === "Income").length
          ).padStart(2, "0"),
          icon: "📈",
          note: "Visible income records",
        },
      ];
    }

    if (role === "customer") {
      return [
        {
          id: 1,
          label: "Payment view",
          value: `₹${totalIncome.toLocaleString()}`,
          icon: "💳",
          note: "Visible completed payment records",
        },
        {
          id: 2,
          label: "Payment entries",
          value: String(customerPaymentCount).padStart(2, "0"),
          icon: "📱",
          note: "Ride-linked payment history",
        },
        {
          id: 3,
          label: "Wallet preview",
          value: `₹${balance.toLocaleString()}`,
          icon: "📊",
          note: "Shared wallet snapshot",
        },
      ];
    }

    return [
      {
        id: 1,
        label: "Wallet balance",
        value: `₹${balance.toLocaleString()}`,
        icon: "💰",
        note: "Income minus expense",
      },
      {
        id: 2,
        label: "Total income",
        value: `₹${totalIncome.toLocaleString()}`,
        icon: "📈",
        note: "All income entries",
      },
      {
        id: 3,
        label: "Total expense",
        value: `₹${totalExpense.toLocaleString()}`,
        icon: "📉",
        note: "All expense entries",
      },
    ];
  }, [
    role,
    balance,
    totalIncome,
    totalExpense,
    captainRideIncome,
    captainRideCount,
    customerPaymentCount,
    transactions,
  ]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const parsedAmount = Number(form.amount);

    if (!form.title.trim() || !form.amount) {
      setError("Please fill all wallet fields before adding a transaction.");
      return;
    }

    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid amount greater than zero.");
      return;
    }

    const newTransaction = {
      id: Date.now(),
      type: form.type,
      title: form.title.trim(),
      amount: parsedAmount,
      method: form.method,
      createdAt: "Just now",
    };

    setAppData((current) => ({
      ...current,
      transactions: [newTransaction, ...(current.transactions || [])],
    }));

    setForm({
      type: "Income",
      title: "",
      amount: "",
      method: "Cash",
    });
  }

  function renderAdminForm() {
    return (
      <section className="glass panel">
        <div className="panel-head">
          <h3>Add wallet transaction</h3>
          <span className="panel-tag">Step 18</span>
        </div>

        <form className="wallet-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label className="form-field">
              <span>Transaction type</span>
              <select name="type" value={form.type} onChange={handleChange}>
                {typeOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span>Payment method</span>
              <select name="method" value={form.method} onChange={handleChange}>
                {methodOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field form-field-full">
              <span>Title / Note</span>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="Example: Ride payment, fuel, driver settlement"
              />
            </label>

            <label className="form-field form-field-full">
              <span>Amount</span>
              <input
                type="number"
                min="1"
                name="amount"
                value={form.amount}
                onChange={handleChange}
                placeholder="Enter amount"
              />
            </label>
          </div>

          {error ? <div className="form-error">{error}</div> : null}

          <div className="form-actions">
            <button className="primary-btn" type="submit">
              Add Transaction
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
          <h3>Captain earnings panel</h3>
          <span className="panel-tag">Step 18</span>
        </div>

        <div className="wallet-guide-list">
          <article className="wallet-guide-card">
            <div className="fare-guide-icon">💰</div>
            <div>
              <h4>Auto ride earnings</h4>
              <p>Completed rides are now creating income automatically</p>
            </div>
          </article>

          <article className="wallet-guide-card">
            <div className="fare-guide-icon">🛵</div>
            <div>
              <h4>Ride-linked revenue</h4>
              <p>Your captain view highlights income from completed rides</p>
            </div>
          </article>

          <article className="wallet-guide-card">
            <div className="fare-guide-icon">📈</div>
            <div>
              <h4>Earnings dashboard</h4>
              <p>This wallet now behaves like a captain earnings console</p>
            </div>
          </article>
        </div>
      </section>
    );
  }

  function renderCustomerPanel() {
    return (
      <section className="glass panel">
        <div className="panel-head">
          <h3>Customer payment view</h3>
          <span className="panel-tag">Step 18</span>
        </div>

        <div className="wallet-guide-list">
          <article className="wallet-guide-card">
            <div className="fare-guide-icon">💳</div>
            <div>
              <h4>Ride payment history</h4>
              <p>Customer sees payment-side entries in a simpler form</p>
            </div>
          </article>

          <article className="wallet-guide-card">
            <div className="fare-guide-icon">📱</div>
            <div>
              <h4>Simple transaction view</h4>
              <p>Designed to feel cleaner for customer-side usage</p>
            </div>
          </article>
        </div>
      </section>
    );
  }

  return (
    <div className="page-stack">
      <section className="glass page-hero-small">
        <div>
          <div className="pill">Wallet Module</div>
          <h2 className="section-title">
            {role === "admin"
              ? "Track money flow safely"
              : role === "captain"
              ? "Track captain earnings"
              : "Track ride payment history"}
          </h2>
          <p className="section-text">
            {role === "admin"
              ? "Admin sees the full wallet with manual income and expense control."
              : role === "captain"
              ? "Captain now gets an earnings-focused wallet view based on completed rides."
              : "Customer gets a simpler payment-focused wallet view."}
          </p>
        </div>
      </section>

      <section className="mini-grid">
        {walletStats.map((item) => (
          <article className="glass info-card" key={item.id}>
            <div className="info-icon">{item.icon}</div>
            <div>
              <p className="info-label">{item.label}</p>
              <h3 className="info-value">{item.value}</h3>
              <p className="info-note">{item.note}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="wallet-layout">
        {role === "admin"
          ? renderAdminForm()
          : role === "captain"
          ? renderCaptainPanel()
          : renderCustomerPanel()}

        <section className="glass panel">
          <div className="panel-head">
            <h3>
              {role === "admin"
                ? "Quick guide"
                : role === "captain"
                ? "Captain earnings guide"
                : "Payment guide"}
            </h3>
            <span className="panel-tag">
              {role === "admin" ? "Local preview" : role === "captain" ? "Ride-linked" : "Customer view"}
            </span>
          </div>

          <div className="wallet-guide-list">
            {role === "captain" ? (
              <>
                <article className="wallet-guide-card">
                  <div className="fare-guide-icon">✅</div>
                  <div>
                    <h4>Complete ride</h4>
                    <p>Ride completion creates income automatically</p>
                  </div>
                </article>

                <article className="wallet-guide-card">
                  <div className="fare-guide-icon">💰</div>
                  <div>
                    <h4>Income reflected here</h4>
                    <p>Captain wallet highlights completed ride revenue</p>
                  </div>
                </article>

                <article className="wallet-guide-card">
                  <div className="fare-guide-icon">📊</div>
                  <div>
                    <h4>Shared app wallet</h4>
                    <p>Dashboard and wallet remain connected to booking flow</p>
                  </div>
                </article>
              </>
            ) : role === "customer" ? (
              <>
                <article className="wallet-guide-card">
                  <div className="fare-guide-icon">📱</div>
                  <div>
                    <h4>Simple payment history</h4>
                    <p>Customer sees a cleaner transaction view</p>
                  </div>
                </article>

                <article className="wallet-guide-card">
                  <div className="fare-guide-icon">💳</div>
                  <div>
                    <h4>Ride-linked payments</h4>
                    <p>Wallet reflects ride-related payment records</p>
                  </div>
                </article>
              </>
            ) : (
              <>
                <article className="wallet-guide-card">
                  <div className="fare-guide-icon">📈</div>
                  <div>
                    <h4>Income</h4>
                    <p>Ride payments, booking revenue, fees collected</p>
                  </div>
                </article>

                <article className="wallet-guide-card">
                  <div className="fare-guide-icon">📉</div>
                  <div>
                    <h4>Expense</h4>
                    <p>Driver settlement, support costs, discounts, operations</p>
                  </div>
                </article>

                <article className="wallet-guide-card">
                  <div className="fare-guide-icon">💳</div>
                  <div>
                    <h4>Methods</h4>
                    <p>Track Cash, Wallet, and Online flows separately</p>
                  </div>
                </article>
              </>
            )}
          </div>
        </section>
      </section>

      <section className="glass panel">
        <div className="panel-head">
          <h3>
            {role === "admin"
              ? "Transaction history"
              : role === "captain"
              ? "Captain earnings history"
              : "Payment history"}
          </h3>
          <span className="panel-tag">{visibleTransactions.length} total</span>
        </div>

        <div className="wallet-transaction-list">
          {visibleTransactions.map((item) => (
            <article className="wallet-transaction-card" key={item.id}>
              <div className="wallet-transaction-top">
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

              <div className="wallet-meta-grid">
                <div className="wallet-meta-item">
                  <span className="wallet-meta-label">Method</span>
                  <strong>{item.method}</strong>
                </div>

                <div className="wallet-meta-item">
                  <span className="wallet-meta-label">Amount</span>
                  <strong
                    className={
                      item.type === "Income"
                        ? "wallet-amount-income"
                        : "wallet-amount-expense"
                    }
                  >
                    {item.type === "Income" ? "+" : "-"}₹{Number(item.amount || 0).toLocaleString()}
                  </strong>
                </div>
              </div>

              {item.source ? (
                <div className="booking-footer">
                  <span>{item.source}</span>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default WalletPage;
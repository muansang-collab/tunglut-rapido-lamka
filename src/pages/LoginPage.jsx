import { useMemo, useState } from "react";

const demoUsers = [
  {
    id: 1,
    name: "Admin User",
    email: "admin@tunglut.com",
    password: "admin123",
    role: "admin",
  },
  {
    id: 2,
    name: "Captain User",
    email: "captain@tunglut.com",
    password: "captain123",
    role: "captain",
  },
  {
    id: 3,
    name: "Customer User",
    email: "customer@tunglut.com",
    password: "customer123",
    role: "customer",
  },
];

function LoginPage({ appName, onLogin }) {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");

  const demoCredentials = useMemo(
    () => [
      { role: "Admin", email: "admin@tunglut.com", password: "admin123" },
      { role: "Captain", email: "captain@tunglut.com", password: "captain123" },
      { role: "Customer", email: "customer@tunglut.com", password: "customer123" },
    ],
    []
  );

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

    const matchedUser = demoUsers.find(
      (user) =>
        user.email.toLowerCase() === form.email.trim().toLowerCase() &&
        user.password === form.password
    );

    if (!matchedUser) {
      setError("Invalid email or password.");
      return;
    }

    onLogin({
      id: matchedUser.id,
      name: matchedUser.name,
      email: matchedUser.email,
      role: matchedUser.role,
    });
  }

  function useDemo(credential) {
    setForm({
      email: credential.email,
      password: credential.password,
    });
    setError("");
  }

  return (
    <div className="app-shell">
      <div className="bg-orb orb-1" />
      <div className="bg-orb orb-2" />
      <div className="bg-grid" />

      <div className="role-entry-page">
        <section className="glass role-entry-card">
          <div className="pill">Step 50 • Login System</div>
          <h1 className="section-title">Login to {appName}</h1>
          <p className="section-text">
            Enter your account to continue into the platform. This login foundation
            is now replacing direct role entry.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.1fr 0.9fr",
              gap: "18px",
              marginTop: "20px",
            }}
          >
            <section className="glass panel">
              <div className="panel-head">
                <h3>Sign In</h3>
                <span className="panel-tag">Protected Access</span>
              </div>

              <form className="booking-form" onSubmit={handleSubmit}>
                <div className="form-grid">
                  <label className="form-field form-field-full">
                    <span>Email</span>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="Enter your email"
                    />
                  </label>

                  <label className="form-field form-field-full">
                    <span>Password</span>
                    <input
                      type="password"
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Enter your password"
                    />
                  </label>
                </div>

                {error ? <div className="form-error">{error}</div> : null}

                <div className="form-actions">
                  <button type="submit" className="primary-btn">
                    Login
                  </button>
                </div>
              </form>
            </section>

            <section className="glass panel">
              <div className="panel-head">
                <h3>Demo Accounts</h3>
                <span className="panel-tag">Quick Access</span>
              </div>

              <div className="dashboard-list">
                {demoCredentials.map((item) => (
                  <article key={item.role} className="dashboard-list-card">
                    <div className="dashboard-list-top">
                      <div>
                        <h4>{item.role}</h4>
                        <p>{item.email}</p>
                      </div>
                      <span className="wallet-type-badge income">
                        {item.role}
                      </span>
                    </div>

                    <div className="dashboard-mini-meta">
                      <span>Password: {item.password}</span>
                    </div>

                    <div style={{ marginTop: "12px" }}>
                      <button
                        type="button"
                        className="secondary-btn small-btn"
                        onClick={() => useDemo(item)}
                      >
                        Use {item.role}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </section>
      </div>
    </div>
  );
}

export default LoginPage;
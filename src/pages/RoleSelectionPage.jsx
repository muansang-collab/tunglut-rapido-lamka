const roleCards = [
  {
    key: "admin",
    title: "Admin",
    icon: "🛡️",
    description: "Manage the full system, drivers, wallet, settings, and monitoring.",
  },
  {
    key: "captain",
    title: "Captain",
    icon: "🛵",
    description: "View ride activity, work on bookings, and track captain-side earnings.",
  },
  {
    key: "customer",
    title: "Customer",
    icon: "🙋",
    description: "Browse the ride experience, booking area, and customer-side dashboard.",
  },
];

function RoleSelectionPage({ appName, onSelectRole }) {
  return (
    <div className="auth-shell">
      <div className="bg-orb orb-1" />
      <div className="bg-orb orb-2" />
      <div className="bg-grid" />

      <div className="auth-container">
        <section className="glass auth-hero">
          <div className="pill">Step 11 • Role System</div>
          <h1 className="auth-title">{appName}</h1>
          <p className="auth-text">
            Choose how you want to enter the app. Each role gets its own access level
            and safe route visibility.
          </p>
        </section>

        <section className="role-card-grid">
          {roleCards.map((role) => (
            <article className="glass role-select-card" key={role.key}>
              <div className="role-select-icon">{role.icon}</div>
              <h3>{role.title}</h3>
              <p>{role.description}</p>
              <button
                className="primary-btn role-select-btn"
                type="button"
                onClick={() => onSelectRole(role.key)}
              >
                Continue as {role.title}
              </button>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}

export default RoleSelectionPage;
import { Navigate, useNavigate } from "react-router-dom";

const roles = [
  {
    key: "admin",
    label: "Admin",
    icon: "🧑‍💼",
    subtitle: "Manage app, bookings, drivers, wallet, and settings",
  },
  {
    key: "captain",
    label: "Captain",
    icon: "🛵",
    subtitle: "Driver-side access for ride operations",
  },
  {
    key: "customer",
    label: "Customer",
    icon: "📱",
    subtitle: "Customer-side access for ride requests",
  },
];

function RoleEntryPage({ role, setRole }) {
  const navigate = useNavigate();

  if (role) {
    return <Navigate to="/dashboard" replace />;
  }

  function handleSelectRole(selectedRole) {
    setRole(selectedRole);
    navigate("/dashboard", { replace: true });
  }

  return (
    <div className="app-shell">
      <div className="bg-orb orb-1" />
      <div className="bg-orb orb-2" />
      <div className="bg-grid" />

      <div className="page role-entry-page">
        <section className="glass role-entry-card">
          <div className="pill">Step 11A • Role Access</div>
          <h2 className="section-title">Choose your role</h2>
          <p className="section-text">
            Select how you want to enter the app. This is the role foundation only.
            Your existing modules remain intact.
          </p>

          <div className="role-grid">
            {roles.map((item) => (
              <button
                key={item.key}
                type="button"
                className="role-card glass-inner"
                onClick={() => handleSelectRole(item.key)}
              >
                <div className="role-card-icon">{item.icon}</div>
                <div className="role-card-content">
                  <h3>{item.label}</h3>
                  <p>{item.subtitle}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default RoleEntryPage;
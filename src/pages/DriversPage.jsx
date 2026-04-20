import { useMemo, useState } from "react";

const vehicleOptions = ["Bike", "Auto", "Cab"];
const statusOptions = ["Online", "Busy", "Offline"];

function DriversPage({ appData, setAppData }) {
  const { drivers = [], bookings = [] } = appData || {};

  const [form, setForm] = useState({
    name: "",
    phone: "",
    vehicle: "Bike",
    area: "",
    status: "Online",
  });

  const [error, setError] = useState("");

  const driverStats = useMemo(() => {
    const online = drivers.filter((item) => item.status === "Online").length;
    const busy = drivers.filter((item) => item.status === "Busy").length;
    const offline = drivers.filter((item) => item.status === "Offline").length;

    return [
      {
        id: 1,
        label: "Online drivers",
        value: String(online).padStart(2, "0"),
        icon: "🟢",
        note: "Ready to accept rides",
      },
      {
        id: 2,
        label: "Busy drivers",
        value: String(busy).padStart(2, "0"),
        icon: "🛵",
        note: "Currently handling rides",
      },
      {
        id: 3,
        label: "Offline drivers",
        value: String(offline).padStart(2, "0"),
        icon: "🌙",
        note: "Not available right now",
      },
    ];
  }, [drivers]);

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

    if (!form.name.trim() || !form.phone.trim() || !form.area.trim()) {
      setError("Please fill all driver details before adding a driver.");
      return;
    }

    const newDriver = {
      id: Date.now(),
      name: form.name.trim(),
      phone: form.phone.trim(),
      vehicle: form.vehicle,
      area: form.area.trim(),
      status: form.status,
    };

    setAppData((current) => ({
      ...current,
      drivers: [newDriver, ...(current.drivers || [])],
    }));

    setForm({
      name: "",
      phone: "",
      vehicle: "Bike",
      area: "",
      status: "Online",
    });
  }

  function setDriverStatus(driverId, nextStatus) {
    setAppData((current) => ({
      ...current,
      drivers: current.drivers.map((driver) => {
        if (driver.id !== driverId) {
          return driver;
        }

        return {
          ...driver,
          status: nextStatus,
        };
      }),
    }));
  }

  function removeDriver(driverId) {
    const hasLinkedRide = bookings.some(
      (booking) =>
        String(booking.assignedDriverId) === String(driverId) &&
        (booking.status === "Assigned" || booking.status === "In Progress")
    );

    if (hasLinkedRide) {
      setError("This driver has an active ride. Complete or cancel that ride before removing the driver.");
      return;
    }

    setError("");

    setAppData((current) => ({
      ...current,
      drivers: current.drivers.filter((driver) => driver.id !== driverId),
    }));
  }

  return (
    <div className="page-stack">
      <section className="glass page-hero-small">
        <div>
          <div className="pill">Drivers Module</div>
          <h2 className="section-title">Manage drivers safely</h2>
          <p className="section-text">
            This page now gives direct control over Online, Busy, and Offline driver states
            so your dispatch engine can be tested more clearly.
          </p>
        </div>
      </section>

      <section className="mini-grid">
        {driverStats.map((item) => (
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

      <section className="drivers-layout">
        <section className="glass panel">
          <div className="panel-head">
            <h3>Add new driver</h3>
            <span className="panel-tag">Step 26</span>
          </div>

          <form className="driver-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <label className="form-field">
                <span>Driver name</span>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter driver name"
                />
              </label>

              <label className="form-field">
                <span>Phone number</span>
                <input
                  type="text"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                />
              </label>

              <label className="form-field">
                <span>Vehicle type</span>
                <select name="vehicle" value={form.vehicle} onChange={handleChange}>
                  {vehicleOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field">
                <span>Availability status</span>
                <select name="status" value={form.status} onChange={handleChange}>
                  {statusOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field form-field-full">
                <span>Service area</span>
                <input
                  type="text"
                  name="area"
                  value={form.area}
                  onChange={handleChange}
                  placeholder="Enter service area"
                />
              </label>
            </div>

            {error ? <div className="form-error">{error}</div> : null}

            <div className="form-actions">
              <button className="primary-btn" type="submit">
                Add Driver
              </button>
            </div>
          </form>
        </section>

        <section className="glass panel">
          <div className="panel-head">
            <h3>Driver types</h3>
            <span className="panel-tag">Dispatch Ready</span>
          </div>

          <div className="fare-guide-list">
            <article className="fare-guide-card">
              <div className="fare-guide-icon">🛵</div>
              <div>
                <h4>Bike Driver</h4>
                <p>Fast short-distance rides</p>
              </div>
            </article>

            <article className="fare-guide-card">
              <div className="fare-guide-icon">🛺</div>
              <div>
                <h4>Auto Driver</h4>
                <p>Comfortable daily trips</p>
              </div>
            </article>

            <article className="fare-guide-card">
              <div className="fare-guide-icon">🚗</div>
              <div>
                <h4>Cab Driver</h4>
                <p>Family and luggage rides</p>
              </div>
            </article>
          </div>
        </section>
      </section>

      <section className="glass panel">
        <div className="panel-head">
          <h3>Driver list</h3>
          <span className="panel-tag">{drivers.length} total</span>
        </div>

        {error ? <div className="form-error" style={{ marginBottom: "14px" }}>{error}</div> : null}

        <div className="driver-list driver-list-page">
          {drivers.map((driver) => (
            <article className="driver-card driver-card-extended" key={driver.id}>
              <div className="driver-avatar">{driver.name.charAt(0)}</div>

              <div className="driver-main">
                <h4>{driver.name}</h4>
                <p>
                  {driver.vehicle} • {driver.area}
                </p>
              </div>

              <div className="driver-extra">
                <div className="driver-meta-line">
                  <span className="driver-meta-label">Phone</span>
                  <strong>{driver.phone}</strong>
                </div>

                <div className="driver-meta-line">
                  <span className="driver-meta-label">Status</span>
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
                </div>
              </div>

              <div
                className="driver-actions"
                style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}
              >
                <button
                  type="button"
                  className="secondary-btn small-btn"
                  onClick={() => setDriverStatus(driver.id, "Online")}
                  disabled={driver.status === "Online"}
                >
                  Set Online
                </button>

                <button
                  type="button"
                  className="secondary-btn small-btn"
                  onClick={() => setDriverStatus(driver.id, "Busy")}
                  disabled={driver.status === "Busy"}
                >
                  Set Busy
                </button>

                <button
                  type="button"
                  className="secondary-btn small-btn"
                  onClick={() => setDriverStatus(driver.id, "Offline")}
                  disabled={driver.status === "Offline"}
                >
                  Set Offline
                </button>

                <button
                  type="button"
                  className="danger-btn small-btn"
                  onClick={() => removeDriver(driver.id)}
                >
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default DriversPage;
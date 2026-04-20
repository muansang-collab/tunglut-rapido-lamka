import { useEffect, useMemo, useState } from "react";
import { saveSettingsToFirestore } from "../firebaseService";

function SettingsPage({ appData, setAppData, firebaseStatus }) {
  const [form, setForm] = useState(appData.settings || {});
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    setForm(appData.settings || {});
  }, [appData.settings]);

  const farePreview = useMemo(() => {
    const bike = Number(form.baseFareBike) || 0;
    const auto = Number(form.baseFareAuto) || 0;
    const cab = Number(form.baseFareCab) || 0;
    const perKm = Number(form.perKmFare) || 0;
    const waiting = Number(form.waitingCharge) || 0;
    const night = Number(form.nightCharge) || 0;

    return {
      bikeTotal: bike + perKm * 2 + waiting,
      autoTotal: auto + perKm * 3 + waiting,
      cabTotal: cab + perKm * 4 + waiting + night,
    };
  }, [form]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((c) => ({ ...c, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    // Save locally
    setAppData((c) => ({
      ...c,
      settings: form,
    }));

    // Save to Firebase
    const success = await saveSettingsToFirestore(form);

    setSaveMessage(
      success
        ? "Saved to Firebase + Local ✅"
        : "Saved locally only (Firebase failed)"
    );
  }

  return (
    <div className="page-stack">
      <section className="glass page-hero-small">
        <div>
          <div className="pill">Settings Module</div>
          <h2 className="section-title">Cloud + Local settings</h2>
          <p className="section-text">
            Your settings now sync safely with Firebase.
          </p>
        </div>
      </section>

      <section className="settings-layout">
        <section className="glass panel">
          <div className="panel-head">
            <h3>Settings</h3>
            <span className="panel-tag">Step 10</span>
          </div>

          <form className="settings-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <label className="form-field form-field-full">
                <span>App name</span>
                <input name="appName" value={form.appName || ""} onChange={handleChange} />
              </label>

              <label className="form-field">
                <span>Bike base fare</span>
                <input name="baseFareBike" value={form.baseFareBike || ""} onChange={handleChange} />
              </label>

              <label className="form-field">
                <span>Auto base fare</span>
                <input name="baseFareAuto" value={form.baseFareAuto || ""} onChange={handleChange} />
              </label>

              <label className="form-field">
                <span>Cab base fare</span>
                <input name="baseFareCab" value={form.baseFareCab || ""} onChange={handleChange} />
              </label>
            </div>

            {saveMessage && <div className="form-success">{saveMessage}</div>}

            <button className="primary-btn">Save</button>
          </form>
        </section>

        <section className="glass panel">
          <div className="panel-head">
            <h3>Preview</h3>
          </div>

          <p>Bike: ₹{farePreview.bikeTotal}</p>
          <p>Auto: ₹{farePreview.autoTotal}</p>
          <p>Cab: ₹{farePreview.cabTotal}</p>
        </section>
      </section>
    </div>
  );
}

export default SettingsPage;
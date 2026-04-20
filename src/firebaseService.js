import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const SETTINGS_DOC_ID = "app_settings";
const BOOKINGS_DOC_ID = "app_bookings";

export async function loadSettingsFromFirestore() {
  try {
    if (!db) return null;

    const ref = doc(db, "settings", SETTINGS_DOC_ID);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      return snap.data();
    }

    return null;
  } catch (error) {
    console.error("Load settings error:", error);
    return null;
  }
}

export async function saveSettingsToFirestore(settings) {
  try {
    if (!db) return false;

    const ref = doc(db, "settings", SETTINGS_DOC_ID);
    await setDoc(ref, settings);

    return true;
  } catch (error) {
    console.error("Save settings error:", error);
    return false;
  }
}

export async function loadBookingsFromFirestore() {
  try {
    if (!db) return null;

    const ref = doc(db, "bookings", BOOKINGS_DOC_ID);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const data = snap.data();
      return Array.isArray(data.items) ? data.items : [];
    }

    return null;
  } catch (error) {
    console.error("Load bookings error:", error);
    return null;
  }
}

export async function saveBookingsToFirestore(bookings) {
  try {
    if (!db) return false;

    const ref = doc(db, "bookings", BOOKINGS_DOC_ID);
    await setDoc(ref, { items: bookings });

    return true;
  } catch (error) {
    console.error("Save bookings error:", error);
    return false;
  }
}
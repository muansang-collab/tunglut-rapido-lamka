import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAcT5jNAsNQCev8NUQr-DlNDdWAkexHOZI",
  authDomain: "tunglut-rapido-lamka.firebaseapp.com",
  projectId: "tunglut-rapido-lamka",
  storageBucket: "tunglut-rapido-lamka.firebasestorage.app",
  messagingSenderId: "938704980046",
  appId: "1:938704980046:web:95b64b50cd5658ad9cdb1f",
};

function hasRealFirebaseConfig(config) {
  return (
    config.apiKey &&
    !config.apiKey.includes("PASTE_YOUR") &&
    config.authDomain &&
    !config.authDomain.includes("PASTE_YOUR") &&
    config.projectId &&
    !config.projectId.includes("PASTE_YOUR") &&
    config.storageBucket &&
    !config.storageBucket.includes("PASTE_YOUR") &&
    config.messagingSenderId &&
    !config.messagingSenderId.includes("PASTE_YOUR") &&
    config.appId &&
    !config.appId.includes("PASTE_YOUR")
  );
}

let app = null;
let db = null;
let auth = null;

const configReady = hasRealFirebaseConfig(firebaseConfig);

if (configReady) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
}

export { app, db, auth };

export const firebaseStatus = {
  connected: configReady,
  mode: configReady ? "Configured" : "Not configured",
  projectId: configReady ? firebaseConfig.projectId : "Not set",
};
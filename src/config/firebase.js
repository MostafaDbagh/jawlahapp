// Firebase Admin initialization for FCM push notifications.
//
// Credentials are loaded from ONE of (in priority order):
//   1. FIREBASE_SERVICE_ACCOUNT_PATH  — path to a service-account JSON file
//   2. FIREBASE_SERVICE_ACCOUNT_JSON  — the service-account JSON inline (one line)
//   3. FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
//
// If none are present (or firebase-admin isn't installed) the module stays
// DISABLED and every send becomes a no-op, so the server still boots and the
// order flow keeps working without Firebase configured — matching the app's
// "degrade, don't crash" startup philosophy (see server.js DB handling).
const path = require('path');
const fs = require('fs');

let messaging = null;
let enabled = false;

function loadServiceAccount() {
  const {
    FIREBASE_SERVICE_ACCOUNT_PATH,
    FIREBASE_SERVICE_ACCOUNT_JSON,
    FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY
  } = process.env;

  if (FIREBASE_SERVICE_ACCOUNT_PATH) {
    const abs = path.isAbsolute(FIREBASE_SERVICE_ACCOUNT_PATH)
      ? FIREBASE_SERVICE_ACCOUNT_PATH
      : path.join(process.cwd(), FIREBASE_SERVICE_ACCOUNT_PATH);
    if (!fs.existsSync(abs)) {
      console.warn(`⚠️ FIREBASE_SERVICE_ACCOUNT_PATH set but file not found: ${abs}`);
      return null;
    }
    return JSON.parse(fs.readFileSync(abs, 'utf8'));
  }
  if (FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(FIREBASE_SERVICE_ACCOUNT_JSON);
  }
  if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
    return {
      project_id: FIREBASE_PROJECT_ID,
      client_email: FIREBASE_CLIENT_EMAIL,
      // Allow the private key to be stored with literal "\n" sequences in .env.
      private_key: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    };
  }
  return null;
}

function init() {
  let serviceAccount;
  try {
    serviceAccount = loadServiceAccount();
  } catch (e) {
    console.warn('⚠️ Failed to parse Firebase service account:', e.message);
    return;
  }
  if (!serviceAccount) {
    console.warn(
      '⚠️ Firebase not configured — push notifications are disabled. ' +
        'Set FIREBASE_SERVICE_ACCOUNT_PATH (or inline creds) to enable FCM.'
    );
    return;
  }
  try {
    const admin = require('firebase-admin');
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    messaging = admin.messaging();
    enabled = true;
    console.log('✅ Firebase Admin initialized — FCM push enabled.');
  } catch (e) {
    console.warn('⚠️ Firebase Admin init failed — push disabled:', e.message);
    messaging = null;
    enabled = false;
  }
}

init();

module.exports = {
  isEnabled: () => enabled,
  getMessaging: () => messaging
};

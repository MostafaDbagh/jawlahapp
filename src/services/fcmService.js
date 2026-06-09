// Low-level FCM sender. Wraps firebase-admin messaging with:
//  - a graceful no-op when Firebase isn't configured (see config/firebase.js),
//  - string-coercion of the data payload (FCM requires all data values to be
//    strings),
//  - automatic cleanup of dead tokens (clears User.fcm_token) so we stop
//    sending to uninstalled/expired apps.
//
// Every function is safe to call fire-and-forget: it never throws.
const firebase = require('../config/firebase');
const User = require('../models/User');

// FCM error codes that mean the token will never work again.
const DEAD_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument'
]);

// FCM `data` values must all be strings; drop null/undefined and stringify rest.
function stringifyData(data = {}) {
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    if (v == null) continue;
    out[k] = typeof v === 'string' ? v : String(v);
  }
  return out;
}

// Send to a single device token. Returns { sent, reason? }. Never throws.
async function sendToToken(token, { title, body, data } = {}) {
  if (!firebase.isEnabled()) return { sent: false, reason: 'disabled' };
  if (!token) return { sent: false, reason: 'no-token' };

  const message = {
    token,
    notification: { title, body },
    data: stringifyData(data),
    android: {
      priority: 'high',
      notification: { sound: 'default', channelId: 'default' }
    },
    apns: {
      payload: { aps: { sound: 'default', badge: 1 } }
    }
  };

  try {
    const id = await firebase.getMessaging().send(message);
    return { sent: true, id };
  } catch (e) {
    if (DEAD_TOKEN_CODES.has(e.code)) {
      // Drop the dead token so we don't keep retrying it on every event.
      await User.updateOne({ fcm_token: token }, { $set: { fcm_token: null } }).catch(() => {});
      return { sent: false, reason: 'dead-token' };
    }
    console.error('FCM send error:', e.code || e.message);
    return { sent: false, reason: e.code || 'error' };
  }
}

module.exports = { sendToToken };

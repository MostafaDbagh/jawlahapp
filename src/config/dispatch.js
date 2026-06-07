// Tunable configuration for the driver-dispatch engine (src/services/dispatchService.js).
// Every knob is overridable via env so behaviour can be tuned without a redeploy.
// See the algorithm overview in dispatchService.js.

const num = (key, def) => {
  const v = Number(process.env[key]);
  return Number.isFinite(v) ? v : def;
};
const bool = (key, def) => {
  const v = process.env[key];
  if (v == null) return def;
  return v === '1' || v.toLowerCase() === 'true';
};

// Score weights — must sum to 1.0. loadScore dominates (spread work / fairness),
// idle is the anti-starvation term, accept rewards reliable responders, rating is
// a small quality nudge, proximity is the reserved GPS slot (neutral until GPS).
const WEIGHTS = {
  load: num('DISPATCH_W_LOAD', 0.45),
  idle: num('DISPATCH_W_IDLE', 0.25),
  accept: num('DISPATCH_W_ACCEPT', 0.15),
  rating: num('DISPATCH_W_RATING', 0.07),
  proximity: num('DISPATCH_W_PROXIMITY', 0.08),
};

module.exports = {
  WEIGHTS,
  // How long an exclusive offer is held for one driver before it expires and
  // cascades to the next-best. 90s balances hot-food latency vs. avoidable declines.
  OFFER_TTL_MS: num('DISPATCH_OFFER_TTL_MS', 90_000),
  // Max concurrent in-progress deliveries (ready+on_the_way) a driver may hold.
  MAX_ACTIVE_ORDERS: num('DISPATCH_MAX_ACTIVE', 3),
  // After declining, a driver is not re-offered the SAME order for this long.
  DECLINE_COOLDOWN_MS: num('DISPATCH_DECLINE_COOLDOWN_MS', 900_000), // 15 min
  // Idle time at which idleScore saturates to 1.0 (anti-starvation cap).
  IDLE_CAP_MS: num('DISPATCH_IDLE_CAP_MS', 3_600_000), // 1 h
  // Once an order has waited this long, relax constraints (drop city filter, +1 cap).
  ESCALATION_AFTER_MS: num('DISPATCH_ESCALATION_AFTER_MS', 480_000), // 8 min
  // Optional background sweep cadence (best-effort; lazy expiry is the real guarantee).
  SWEEP_MS: num('DISPATCH_SWEEP_MS', 10_000),
  // Advisory window suppressing duplicate dispatch attempts for the same order.
  DISPATCH_GATE_MS: num('DISPATCH_GATE_MS', 2_000),
  // Below this many lifetime offers, acceptScore uses a neutral 0.5 floor.
  ACCEPT_FLOOR_MIN_SAMPLES: num('DISPATCH_ACCEPT_MIN_SAMPLES', 5),
  // --- GPS slot (off in v1; no schema migration needed to enable) ---
  GPS_AVAILABLE: bool('DISPATCH_GPS_AVAILABLE', false),
  MAX_RADIUS_KM: num('DISPATCH_MAX_RADIUS_KM', 15),
};

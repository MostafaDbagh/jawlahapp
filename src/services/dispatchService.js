// ===========================================================================
// Driver dispatch engine — "Fair-Load Push Dispatch".
//
// When an order becomes `ready`, it is routed to the single BEST eligible online
// driver via a timed, EXCLUSIVE offer. If that driver declines or the offer
// expires, dispatch cascades to the next-best driver. If no driver remains, the
// offer is cleared and the order falls back to the existing open job board, so an
// order can NEVER be stuck.
//
// Invariants / safety:
//  - Ownership is defined ONLY by Order.driver_user_id (the offer is advisory
//    routing on top of that). Every authoritative mutation is a single-document
//    findOneAndUpdate (no Mongo transactions — dev Mongo is standalone).
//  - Driver load is DERIVED live via countDocuments (never a cached counter), so
//    it self-heals when orders complete/cancel.
//  - Offer expiry is LAZY: the offer-write and accept filters both treat an
//    expired offer as absent, and pending/board queries exclude expired offers.
//    The optional background sweep is best-effort only.
//  - Fallback NEVER writes a status outside ORDER_STATUSES — it just clears the
//    offer, leaving { status:'ready', driver_user_id:null } for the open board.
//
// GPS is a pure drop-in later: flip cfg.GPS_AVAILABLE and proximityScore stops
// returning its neutral 0.5 (branch coords already exist; only a driver coord is
// needed). No schema migration.
// ===========================================================================
const { v4: uuidv4 } = require('uuid');
const Order = require('../models/Order');
const User = require('../models/User');
const Branch = require('../models/Branch');
const cfg = require('../config/dispatch');
const { driverSnapshot } = require('../utils/driverSnapshot');
const notificationService = require('./notificationService');

const ACTIVE_STATUSES = ['ready', 'on_the_way'];

// Mongo clause: order is NOT under a live (non-expired) exclusive offer. Used to
// keep the open board (and legacy claim) from serving/claiming an offered order.
function notLiveOfferClause(now = new Date()) {
  return { $or: [{ assignment_attempt: null }, { 'assignment_attempt.expires_at': { $lt: now } }] };
}

// Live in-progress delivery count for a driver (the authoritative load).
async function activeLoad(driverId) {
  return Order.countDocuments({ driver_user_id: driverId, status: { $in: ACTIVE_STATUSES } });
}

// Great-circle distance (km). Only used when cfg.GPS_AVAILABLE — stub-safe.
function haversine(a, b) {
  if (!a || !b || a.lat == null || b.lat == null) return Infinity;
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

// Eligible online drivers for an order, with their live load. excludeIds removes
// drivers already tried recently in this cascade. escalationRound>0 relaxes the
// service-city constraint and raises the capacity by one.
async function getEligibleDrivers(order, excludeIds, escalationRound) {
  const now = Date.now();
  const q = {
    account_type: 'DRIVER',
    is_active: true,
    'metadata.is_online': true,
    user_id: { $nin: excludeIds },
  };
  // City match only in round 0 (null/empty service_city = serves all cities).
  if (escalationRound === 0 && order.branch && order.branch.city) {
    q.$or = [
      { 'metadata.service_city': order.branch.city },
      { 'metadata.service_city': { $in: [null, ''] } },
      { 'metadata.service_city': { $exists: false } },
    ];
  }
  const candidates = await User.find(q).lean();
  const cap = cfg.MAX_ACTIVE_ORDERS + (escalationRound > 0 ? 1 : 0);

  const out = [];
  for (const d of candidates) {
    const load = await activeLoad(d.user_id);
    if (load >= cap) continue;
    out.push({ d, load });
  }
  return out;
}

// Weighted score in [0,1]. Higher = better fit. See cfg.WEIGHTS for the mix.
function scoreDriver({ d, load }, order, now) {
  const m = d.metadata || {};
  const w = cfg.WEIGHTS;

  const loadScore = 1 - Math.min(load, cfg.MAX_ACTIVE_ORDERS) / cfg.MAX_ACTIVE_ORDERS;
  const lastAssigned = m.last_assigned_at ? new Date(m.last_assigned_at).getTime() : 0;
  const idleScore = Math.min((now - lastAssigned) / cfg.IDLE_CAP_MS, 1);
  const sent = m.offers_sent || 0;
  const acc = m.offers_accepted || 0;
  const acceptScore = sent < cfg.ACCEPT_FLOOR_MIN_SAMPLES ? 0.5 : Math.min(Math.max(acc / sent, 0), 1);
  const ratingScore = Math.min(Math.max((typeof m.rating === 'number' ? m.rating : 5) / 5, 0), 1);
  const proximityScore = cfg.GPS_AVAILABLE && order.branch
    ? Math.max(0, 1 - haversine(m.live_location, { lat: order.branch.lat, lng: order.branch.lng }) / cfg.MAX_RADIUS_KM)
    : 0.5; // GPS slot — neutral until driver coordinates exist.

  const score = w.load * loadScore + w.idle * idleScore + w.accept * acceptScore +
    w.rating * ratingScore + w.proximity * proximityScore;
  return { score, load, d };
}

const acceptRate = (m) => (m && (m.offers_accepted || 0)) / ((m && m.offers_sent) || 1);

// Pick the single best driver. Deterministic tie-breakers (no randomness) so
// behaviour is reproducible/testable: score, then lower load, then longest idle,
// then higher acceptance, then higher rating, then tenure, then user_id.
function pickBest(scored) {
  scored.sort((a, b) =>
    b.score - a.score ||
    a.load - b.load ||
    (new Date(a.d.metadata?.last_assigned_at || 0)) - (new Date(b.d.metadata?.last_assigned_at || 0)) ||
    acceptRate(b.d.metadata) - acceptRate(a.d.metadata) ||
    ((b.d.metadata?.rating ?? 5) - (a.d.metadata?.rating ?? 5)) ||
    (new Date(a.d.created_at || 0)) - (new Date(b.d.created_at || 0)) ||
    (a.d.user_id < b.d.user_id ? -1 : 1));
  return scored[0];
}

// Drivers tried recently for this order (offered/declined/timeout within the
// cooldown window). Time-based so it self-clears — never a permanent exclusion.
function recentlyTried(order, now) {
  const cutoff = now - cfg.DECLINE_COOLDOWN_MS;
  return [...new Set(
    (order.assignment_history || [])
      .filter((h) => h.driver_user_id && h.at && new Date(h.at).getTime() > cutoff)
      .map((h) => h.driver_user_id),
  )];
}

// Core: offer the order to the best eligible driver, or fall back to the board.
async function dispatchOrder(orderId, sequence = 1) {
  const nowMs = Date.now();
  const now = new Date(nowMs);

  const order = await Order.findOne({ order_id: orderId }).lean();
  if (!order || order.status !== 'ready' || order.driver_user_id) return { skipped: true };

  // Advisory gate: suppress duplicate dispatch bursts for the same order.
  if (order.dispatch?.last_attempt_at &&
      new Date(order.dispatch.last_attempt_at).getTime() > nowMs - cfg.DISPATCH_GATE_MS) {
    return { skipped: 'gated' };
  }
  // Don't stomp a still-live offer (a cascade trigger may race the sweep).
  if (order.assignment_attempt && new Date(order.assignment_attempt.expires_at).getTime() > nowMs) {
    return { skipped: 'offer-live' };
  }

  order.branch = order.branch_id
    ? await Branch.findOne({ id: order.branch_id }).select('city lat lng').lean()
    : null;

  const exclude = recentlyTried(order, nowMs);
  const aged = (nowMs - new Date(order.created_at || nowMs).getTime()) > cfg.ESCALATION_AFTER_MS;

  let round = 0;
  let eligible = await getEligibleDrivers(order, exclude, 0);
  if (!eligible.length && aged) {
    round = 1;
    eligible = await getEligibleDrivers(order, exclude, 1);
  }

  if (!eligible.length) {
    // FALLBACK → open board. Never write an invalid status; just clear the offer.
    await Order.findOneAndUpdate(
      { order_id: orderId, status: 'ready', driver_user_id: null },
      { $set: { assignment_attempt: null, 'dispatch.exhausted': true, 'dispatch.last_attempt_at': now } },
    );
    return { fallback: true };
  }

  const best = pickBest(eligible.map((e) => scoreDriver(e, order, nowMs)));
  const offer = {
    offer_id: uuidv4(),
    driver_user_id: best.d.user_id,
    offered_at: now,
    expires_at: new Date(nowMs + cfg.OFFER_TTL_MS),
    sequence,
    score: best.score,
    escalation_round: round,
  };

  // Atomic exclusive offer: only writes if still ready, unclaimed, and no live offer.
  const claimed = await Order.findOneAndUpdate(
    {
      order_id: orderId,
      status: 'ready',
      driver_user_id: null,
      ...notLiveOfferClause(now),
    },
    {
      $set: { assignment_attempt: offer, 'dispatch.last_attempt_at': now, 'dispatch.exhausted': false },
      $push: { assignment_history: { driver_user_id: best.d.user_id, outcome: 'offered', at: now, sequence, score: best.score } },
    },
    { new: true },
  );
  if (!claimed) return { skipped: 'race' }; // a sweep/poll will revisit

  // Best-effort driver bookkeeping (a lost $inc only mildly skews a soft term).
  await User.updateOne(
    { user_id: best.d.user_id },
    { $inc: { 'metadata.offers_sent': 1 }, $set: { 'metadata.last_assigned_at': now } },
  ).catch(() => {});

  // Push the exclusive offer to the chosen driver. Fire-and-forget — a push
  // failure must never affect dispatch (the offer also surfaces via polling).
  notificationService.notifyDriverOffer(best.d, claimed).catch(() => {});

  return { offered: best.d.user_id, offer_id: offer.offer_id, score: best.score, escalation_round: round };
}

// Driver accepts their exclusive offer — single-document atomic claim.
async function acceptOffer(offerId, user) {
  const now = new Date();
  const found = await Order.findOne({ 'assignment_attempt.offer_id': offerId }).select('order_id').lean();
  if (!found) return { code: 404, message: 'Offer not found or already resolved' };

  const order = await Order.findOneAndUpdate(
    {
      order_id: found.order_id,
      status: 'ready',
      driver_user_id: null,
      'assignment_attempt.offer_id': offerId,
      'assignment_attempt.driver_user_id': user.user_id,
      'assignment_attempt.expires_at': { $gt: now },
    },
    {
      $set: { driver_user_id: user.user_id, driver: driverSnapshot(user) },
      $unset: { assignment_attempt: 1 },
      $push: { assignment_history: { driver_user_id: user.user_id, outcome: 'accepted', at: now } },
    },
    { new: true },
  );
  if (!order) return { code: 409, message: 'Offer expired or no longer available' };

  await User.updateOne({ user_id: user.user_id }, { $inc: { 'metadata.offers_accepted': 1 } }).catch(() => {});

  // Let the customer know a driver is now heading to pick up their order.
  notificationService.notifyDriverAssigned(order).catch(() => {});

  return { code: 200, order };
}

// Driver declines — clear the offer, record cooldown, cascade to next-best.
async function declineOffer(offerId, user) {
  const now = new Date();
  const order = await Order.findOneAndUpdate(
    { 'assignment_attempt.offer_id': offerId, 'assignment_attempt.driver_user_id': user.user_id },
    {
      // Reset the double-dispatch gate so the cascade below isn't suppressed.
      $set: { assignment_attempt: null, 'dispatch.last_attempt_at': null },
      $push: {
        assignment_history: { driver_user_id: user.user_id, outcome: 'declined', at: now },
        'dispatch.declines': { driver_user_id: user.user_id, at: now },
      },
    },
    { new: true },
  );
  if (!order) return { code: 404, message: 'Offer not found' };

  const next = await dispatchOrder(order.order_id, (order.assignment_history?.length || 0) + 1);
  return { code: 200, cascaded: true, next };
}

// Lazy timeout: clear expired offers and cascade. Best-effort (lazy filters are
// the real guarantee); safe to call from a poll or an interval.
async function sweepExpired() {
  const now = new Date();
  const stale = await Order.find({
    status: 'ready',
    driver_user_id: null,
    'assignment_attempt.expires_at': { $lt: now },
  }).select('order_id assignment_history').lean();

  for (const o of stale) {
    const cleared = await Order.findOneAndUpdate(
      { order_id: o.order_id, 'assignment_attempt.expires_at': { $lt: now } },
      {
        // Reset the gate so the cascade re-dispatch below isn't suppressed.
        $set: { assignment_attempt: null, 'dispatch.last_attempt_at': null },
        $push: { assignment_history: { driver_user_id: null, outcome: 'timeout', at: now } },
      },
    );
    if (cleared) await dispatchOrder(o.order_id, (o.assignment_history?.length || 0) + 1);
  }
  return { swept: stale.length };
}

module.exports = {
  notLiveOfferClause,
  getEligibleDrivers,
  scoreDriver,
  pickBest,
  dispatchOrder,
  acceptOffer,
  declineOffer,
  sweepExpired,
  activeLoad,
  haversine,
};

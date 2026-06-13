// High-level notification entry point used by the controllers and the dispatch
// engine. A single call both:
//   1. persists a Notification document (so it appears in the in-app
//      notification centre served by notificationController), and
//   2. fires an FCM push to the user's device (best-effort).
//
// Always safe to call fire-and-forget — nothing here throws. Messages are
// localized to the recipient's preferred_language (Arabic is the default, since
// the app targets Syria; English is the fallback).
const Notification = require('../models/Notification');
const User = require('../models/User');
const fcmService = require('./fcmService');

const pickLang = (user) => (user && user.preferred_language === 'en' ? 'en' : 'ar');

// Customer-facing order-status copy, keyed by Order status.
const STATUS_MESSAGES = {
  pending: {
    ar: { title: 'تم استلام طلبك', body: 'طلبك قيد المراجعة الآن.' },
    en: { title: 'Order received', body: 'Your order is being reviewed.' }
  },
  preparing: {
    ar: { title: 'يتم تجهيز طلبك', body: 'المطعم يحضّر طلبك الآن.' },
    en: { title: 'Preparing your order', body: 'The restaurant is preparing your order.' }
  },
  ready: {
    ar: { title: 'طلبك جاهز', body: 'طلبك جاهز وبانتظار السائق.' },
    en: { title: 'Order ready', body: 'Your order is ready and waiting for a driver.' }
  },
  on_the_way: {
    ar: { title: 'طلبك في الطريق', body: 'السائق في طريقه إليك.' },
    en: { title: 'On the way', body: 'Your driver is on the way to you.' }
  },
  delivered: {
    ar: { title: 'تم توصيل طلبك', body: 'بالهنا والشفا! نتمنى لك وجبة شهية.' },
    en: { title: 'Delivered', body: 'Your order has been delivered. Enjoy!' }
  },
  cancelled: {
    ar: { title: 'تم إلغاء طلبك', body: 'تم إلغاء طلبك.' },
    en: { title: 'Order cancelled', body: 'Your order has been cancelled.' }
  }
};

// Persist a Notification row + push to the user's device. `user` must carry
// user_id; fcm_token / preferred_language are optional (push is skipped when no
// token). Internal — callers use the typed helpers below.
async function deliver(user, { type = 'order', title, message, data = {} } = {}) {
  if (!user || !user.user_id || !title || !message) {
    return { ok: false, reason: 'missing-fields' };
  }

  let notification = null;
  try {
    notification = await Notification.create({
      user_id: user.user_id,
      type,
      title,
      message,
      metadata: data
    });
  } catch (e) {
    console.error('Notification persist error:', e.message);
  }

  if (user.fcm_token) {
    await fcmService.sendToToken(user.fcm_token, {
      title,
      body: message,
      data: {
        ...data,
        type,
        notification_id: notification ? notification.notification_id : ''
      }
    });
  }

  return { ok: true, notification_id: notification ? notification.notification_id : null };
}

// Generic: look the user up by id, then deliver. Use when you don't already
// hold the user document.
async function notify(userId, payload = {}) {
  try {
    const user = await User.findOne({ user_id: userId })
      .select('user_id fcm_token preferred_language')
      .lean();
    if (!user) return { ok: false, reason: 'no-user' };
    return await deliver(user, payload);
  } catch (e) {
    console.error('notify error:', e.message);
    return { ok: false, reason: 'error' };
  }
}

// Notify the customer that their order moved to `status`.
async function notifyOrderStatus(order, status) {
  try {
    const copy = STATUS_MESSAGES[status];
    if (!order || !order.user_id || !copy) return { ok: false, reason: 'skip' };
    const user = await User.findOne({ user_id: order.user_id })
      .select('user_id fcm_token preferred_language')
      .lean();
    if (!user) return { ok: false, reason: 'no-user' };
    const m = copy[pickLang(user)];
    return await deliver(user, {
      type: 'order',
      title: m.title,
      message: m.body,
      data: { order_id: order.order_id, status }
    });
  } catch (e) {
    console.error('notifyOrderStatus error:', e.message);
    return { ok: false, reason: 'error' };
  }
}

// Notify a driver that they've received an exclusive delivery offer. `driver`
// is the (lean) user document already held by the dispatcher, and `order` is the
// freshly-offered order (carrying assignment_attempt + vendor_name).
async function notifyDriverOffer(driver, order) {
  try {
    if (!driver || !order) return { ok: false, reason: 'skip' };
    const lang = pickLang(driver);
    const vendor = order.vendor_name || (lang === 'en' ? 'a restaurant' : 'أحد المطاعم');
    const title = lang === 'en' ? 'New delivery offer' : 'طلب توصيل جديد';
    const body = lang === 'en' ? `Ready order from ${vendor}` : `طلب جاهز من ${vendor}`;
    return await deliver(driver, {
      type: 'order',
      title,
      message: body,
      data: {
        order_id: order.order_id,
        offer_id: order.assignment_attempt ? order.assignment_attempt.offer_id : '',
        kind: 'driver_offer'
      }
    });
  } catch (e) {
    console.error('notifyDriverOffer error:', e.message);
    return { ok: false, reason: 'error' };
  }
}

// Notify the customer that a driver has been assigned and is heading to pickup.
async function notifyDriverAssigned(order) {
  try {
    if (!order || !order.user_id) return { ok: false, reason: 'skip' };
    const user = await User.findOne({ user_id: order.user_id })
      .select('user_id fcm_token preferred_language')
      .lean();
    if (!user) return { ok: false, reason: 'no-user' };
    const lang = pickLang(user);
    const driverName = (order.driver && order.driver.name) || (lang === 'en' ? 'A driver' : 'سائق');
    const title = lang === 'en' ? 'Driver assigned' : 'تم تعيين سائق';
    const body = lang === 'en'
      ? `${driverName} is on the way to pick up your order.`
      : `${driverName} في طريقه لاستلام طلبك.`;
    return await deliver(user, {
      type: 'order',
      title,
      message: body,
      data: { order_id: order.order_id, status: order.status, kind: 'driver_assigned' }
    });
  } catch (e) {
    console.error('notifyDriverAssigned error:', e.message);
    return { ok: false, reason: 'error' };
  }
}

// Notify the assigned driver that the order they're holding was cancelled, so
// they stop the delivery instead of driving to a dead order.
async function notifyDriverOrderCancelled(order) {
  try {
    if (!order || !order.driver_user_id) return { ok: false, reason: 'skip' };
    const driver = await User.findOne({ user_id: order.driver_user_id })
      .select('user_id fcm_token preferred_language')
      .lean();
    if (!driver) return { ok: false, reason: 'no-user' };
    const lang = pickLang(driver);
    const title = lang === 'en' ? 'Order cancelled' : 'تم إلغاء الطلب';
    const body = lang === 'en'
      ? 'An order assigned to you was cancelled. You can stop this delivery.'
      : 'تم إلغاء طلب كان معيّناً لك. يمكنك إيقاف هذا التوصيل.';
    return await deliver(driver, {
      type: 'order',
      title,
      message: body,
      data: { order_id: order.order_id, status: 'cancelled', kind: 'driver_order_cancelled' }
    });
  } catch (e) {
    console.error('notifyDriverOrderCancelled error:', e.message);
    return { ok: false, reason: 'error' };
  }
}

// Notify the restaurant owner AND every platform admin that a customer left a
// review (good or bad) for one of the restaurant's branches. Fire-and-forget;
// the review is already persisted by the time this runs. `vendor` is the owning
// Vendor (for owner_user_id + name), `branch` the reviewed Branch.
const REVIEW_ADMIN_TYPES = ['PLATFORM_OWNER', 'PLATFORM_ADMIN'];

async function notifyReviewCreated({ review, branch, vendor }) {
  try {
    if (!review) return { ok: false, reason: 'skip' };
    const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
    const place = (vendor && vendor.name) || (branch && branch.name) || '';
    const snippet = review.comment
      ? (review.comment.length > 80 ? `${review.comment.slice(0, 80)}…` : review.comment)
      : '';

    // Recipients: the restaurant owner + all admins. De-duped by user_id so an
    // owner who is also an admin isn't notified twice.
    const recipientIds = new Set();
    if (vendor && vendor.owner_user_id) recipientIds.add(vendor.owner_user_id);
    const admins = await User.find({ account_type: { $in: REVIEW_ADMIN_TYPES }, is_active: true })
      .select('user_id fcm_token preferred_language')
      .lean();
    admins.forEach((a) => recipientIds.add(a.user_id));
    if (recipientIds.size === 0) return { ok: false, reason: 'no-recipients' };

    const adminById = new Map(admins.map((a) => [a.user_id, a]));
    const results = await Promise.all(
      [...recipientIds].map(async (uid) => {
        const user = adminById.get(uid)
          || (await User.findOne({ user_id: uid }).select('user_id fcm_token preferred_language').lean());
        if (!user) return { ok: false, reason: 'no-user' };
        const lang = pickLang(user);
        const title = lang === 'en'
          ? `New ${review.rating}★ review${place ? ` · ${place}` : ''}`
          : `تقييم جديد ${review.rating}★${place ? ` · ${place}` : ''}`;
        const message = snippet
          ? `${stars}  ${snippet}`
          : (lang === 'en' ? `${stars}  (no comment)` : `${stars}  (بدون تعليق)`);
        return deliver(user, {
          type: 'review',
          title,
          message,
          data: {
            kind: 'review',
            review_id: review.id,
            branch_id: review.branch_id,
            vendor_id: vendor ? vendor.id : '',
            rating: String(review.rating)
          }
        });
      })
    );
    return { ok: true, delivered: results.filter((r) => r && r.ok).length };
  } catch (e) {
    console.error('notifyReviewCreated error:', e.message);
    return { ok: false, reason: 'error' };
  }
}

module.exports = {
  notify,
  notifyOrderStatus,
  notifyDriverOffer,
  notifyDriverAssigned,
  notifyDriverOrderCancelled,
  notifyReviewCreated
};

const Complaint = require('../models/Complaint');
const Order = require('../models/Order');
const User = require('../models/User');
const ResponseHelper = require('../utils/responseHelper');

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Resolve the order a customer attached to a complaint. The app normally sends
// the full order_id (picked from the user's own orders); we also accept a short
// reference the user may type, matching it (case-insensitively) against the
// start of one of THEIR order ids. Returns { orderId, reference } — orderId is
// null when nothing matched, but we still keep whatever reference was supplied.
async function resolveOrderReference(userId, orderId, orderReference) {
  const rawRef = orderReference ? String(orderReference).trim().replace(/^#/, '') : '';

  // A full id was supplied: trust it only if it belongs to this user.
  if (orderId) {
    const owned = await Order.findOne({ order_id: orderId, user_id: userId }).select('order_id').lean();
    if (owned) return { orderId: owned.order_id, reference: rawRef || owned.order_id.slice(0, 8) };
  }

  // Otherwise try to resolve the short reference to one of the user's orders.
  if (rawRef) {
    const match = await Order.findOne({
      user_id: userId,
      order_id: { $regex: `^${escapeRegex(rawRef)}`, $options: 'i' }
    }).select('order_id').lean();
    if (match) return { orderId: match.order_id, reference: rawRef };
    return { orderId: null, reference: rawRef };
  }

  return { orderId: null, reference: null };
}

// Attach the customer ({ name, phone, email }) to a set of complaints so the
// admin portal can show who filed each one. One query for the whole page.
async function withCustomer(rows) {
  const userIds = [...new Set(rows.map((c) => c.user_id).filter(Boolean))];
  const users = userIds.length
    ? await User.find({ user_id: { $in: userIds } })
        .select('user_id full_name username country_code phone_number email')
        .lean()
    : [];
  const byId = new Map(users.map((u) => [u.user_id, u]));
  return rows.map((c) => {
    const u = c.user_id ? byId.get(c.user_id) : null;
    return {
      ...c,
      customer: u
        ? {
            name: u.full_name || u.username,
            phone: u.country_code ? `${u.country_code}${u.phone_number}` : u.phone_number,
            email: u.email
          }
        : null
    };
  });
}

class ComplaintController {
  // POST /complaints — a logged-in customer files a complaint, attaching the
  // reference number of the order it's about.
  async create(req, res) {
    try {
      const { subject, message, category, order_id, order_reference } = req.body;
      if (!subject || !String(subject).trim() || !message || !String(message).trim()) {
        return ResponseHelper.error(res, 'Subject and message are required', 400);
      }

      const user = req.user;
      const { orderId, reference } = await resolveOrderReference(user.user_id, order_id, order_reference);

      const complaint = await Complaint.create({
        user_id: user.user_id,
        order_id: orderId,
        order_reference: reference,
        contact_name: user.full_name || user.username,
        contact_phone: user.country_code ? `${user.country_code}${user.phone_number}` : user.phone_number,
        category: Complaint.COMPLAINT_CATEGORIES.includes(category) ? category : 'other',
        subject: String(subject).trim(),
        message: String(message).trim(),
        status: 'open'
      });

      return ResponseHelper.item(res, complaint, 'Complaint submitted successfully', 201);
    } catch (error) {
      console.error('Create complaint error:', error);
      return ResponseHelper.error(res, 'Failed to submit complaint', 500);
    }
  }

  // GET /complaints/mine — the customer's own complaints.
  async listMine(req, res) {
    try {
      const rows = await Complaint.find({ user_id: req.user.user_id }).sort({ created_at: -1 }).lean();
      return ResponseHelper.list(res, rows, rows.length, 'Your complaints retrieved successfully');
    } catch (error) {
      console.error('List my complaints error:', error);
      return ResponseHelper.error(res, 'Failed to retrieve complaints', 500);
    }
  }

  // GET /complaints — admin: browse complaints with filters.
  async list(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const { status, category, search } = req.query;

      const query = {};
      if (status && Complaint.COMPLAINT_STATUSES.includes(status)) query.status = status;
      if (category && Complaint.COMPLAINT_CATEGORIES.includes(category)) query.category = category;
      if (search) {
        const regex = { $regex: escapeRegex(search), $options: 'i' };
        query.$or = [{ subject: regex }, { message: regex }, { contact_name: regex }, { contact_phone: regex }];
      }

      const offset = (page - 1) * limit;
      const [rows, count, openCount] = await Promise.all([
        Complaint.find(query).sort({ created_at: -1 }).skip(offset).limit(limit).lean(),
        Complaint.countDocuments(query),
        Complaint.countDocuments({ status: 'open' })
      ]);

      const data = await withCustomer(rows);
      return res.status(200).json({
        status: true,
        data,
        message: 'Complaints retrieved successfully',
        count,
        stats: { open: openCount }
      });
    } catch (error) {
      console.error('List complaints error:', error);
      return ResponseHelper.error(res, 'Failed to retrieve complaints', 500);
    }
  }

  // PATCH /complaints/:id — admin: update status / add a note.
  async update(req, res) {
    try {
      const { status, admin_note } = req.body;
      const complaint = await Complaint.findOne({ complaint_id: req.params.id });
      if (!complaint) {
        return ResponseHelper.error(res, 'Complaint not found', 404);
      }

      if (status !== undefined) {
        if (!Complaint.COMPLAINT_STATUSES.includes(status)) {
          return ResponseHelper.error(res, `status must be one of: ${Complaint.COMPLAINT_STATUSES.join(', ')}`, 400);
        }
        complaint.status = status;
        if (status === 'resolved' || status === 'dismissed') {
          complaint.resolved_by = req.user.user_id;
          complaint.resolved_at = new Date();
        }
      }
      if (admin_note !== undefined) complaint.admin_note = admin_note;

      await complaint.save();
      return ResponseHelper.item(res, complaint, 'Complaint updated successfully');
    } catch (error) {
      console.error('Update complaint error:', error);
      return ResponseHelper.error(res, 'Failed to update complaint', 500);
    }
  }
}

module.exports = new ComplaintController();

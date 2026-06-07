const ContactRequest = require('../models/ContactRequest');
const ResponseHelper = require('../utils/responseHelper');

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

class ContactController {
  // POST /contact — submit a "Contact us" message. Works with or without auth;
  // if a token is present we attach the user_id and prefill name/phone.
  async create(req, res) {
    try {
      const { name, phone, email, subject, message } = req.body;
      if (!message || !String(message).trim()) {
        return ResponseHelper.error(res, 'Message is required', 400);
      }

      const user = req.user || null;
      const resolvedName =
        (name && String(name).trim()) ||
        (user ? user.full_name || user.username : null);
      if (!resolvedName) {
        return ResponseHelper.error(res, 'Name is required', 400);
      }

      const contact = await ContactRequest.create({
        user_id: user ? user.user_id : null,
        name: resolvedName,
        phone: (phone && String(phone).trim()) || (user && user.country_code ? `${user.country_code}${user.phone_number}` : null),
        email: (email && String(email).trim()) || (user ? user.email : null) || null,
        subject: subject ? String(subject).trim() : null,
        message: String(message).trim(),
        status: 'new'
      });

      return ResponseHelper.item(res, contact, 'Message sent successfully', 201);
    } catch (error) {
      console.error('Create contact request error:', error);
      return ResponseHelper.error(res, 'Failed to send message', 500);
    }
  }

  // GET /contact — admin: browse contact requests with filters.
  async list(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const { status, search } = req.query;

      const query = {};
      if (status && ContactRequest.CONTACT_STATUSES.includes(status)) query.status = status;
      if (search) {
        const regex = { $regex: escapeRegex(search), $options: 'i' };
        query.$or = [{ name: regex }, { phone: regex }, { email: regex }, { subject: regex }, { message: regex }];
      }

      const offset = (page - 1) * limit;
      const [rows, count, newCount] = await Promise.all([
        ContactRequest.find(query).sort({ created_at: -1 }).skip(offset).limit(limit).lean(),
        ContactRequest.countDocuments(query),
        ContactRequest.countDocuments({ status: 'new' })
      ]);

      return res.status(200).json({
        status: true,
        data: rows,
        message: 'Contact requests retrieved successfully',
        count,
        stats: { new: newCount }
      });
    } catch (error) {
      console.error('List contact requests error:', error);
      return ResponseHelper.error(res, 'Failed to retrieve contact requests', 500);
    }
  }

  // PATCH /contact/:id — admin: update status / add a note.
  async update(req, res) {
    try {
      const { status, admin_note } = req.body;
      const contact = await ContactRequest.findOne({ contact_id: req.params.id });
      if (!contact) {
        return ResponseHelper.error(res, 'Contact request not found', 404);
      }

      if (status !== undefined) {
        if (!ContactRequest.CONTACT_STATUSES.includes(status)) {
          return ResponseHelper.error(res, `status must be one of: ${ContactRequest.CONTACT_STATUSES.join(', ')}`, 400);
        }
        contact.status = status;
        if (status === 'closed') {
          contact.handled_by = req.user.user_id;
          contact.handled_at = new Date();
        }
      }
      if (admin_note !== undefined) contact.admin_note = admin_note;

      await contact.save();
      return ResponseHelper.item(res, contact, 'Contact request updated successfully');
    } catch (error) {
      console.error('Update contact request error:', error);
      return ResponseHelper.error(res, 'Failed to update contact request', 500);
    }
  }
}

module.exports = new ContactController();

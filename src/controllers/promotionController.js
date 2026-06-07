const Promotion = require('../models/Promotion');
const ResponseHelper = require('../utils/responseHelper');

const PROMO_TYPES = ['percentage', 'fixed', 'free_delivery'];
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeCode = (code) => String(code || '').trim().toUpperCase().replace(/\s+/g, '');

class PromotionController {
  // GET /promotions — admin: list promo codes with filters.
  async list(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 50, 100);
      const { search, is_active, status } = req.query;

      const query = {};
      if (is_active !== undefined && is_active !== '') query.is_active = is_active === 'true';
      if (search) {
        const regex = { $regex: escapeRegex(search), $options: 'i' };
        query.$or = [{ code: regex }, { title: regex }];
      }
      // Lifecycle filter relative to now.
      const now = new Date();
      if (status === 'active') {
        query.is_active = true;
        query.start_date = { $lte: now };
        query.end_date = { $gte: now };
      } else if (status === 'scheduled') {
        query.start_date = { $gt: now };
      } else if (status === 'expired') {
        query.end_date = { $lt: now };
      }

      const offset = (page - 1) * limit;
      const [rows, count, activeCount] = await Promise.all([
        Promotion.find(query).sort({ created_at: -1 }).skip(offset).limit(limit).lean(),
        Promotion.countDocuments(query),
        Promotion.countDocuments({ is_active: true, start_date: { $lte: now }, end_date: { $gte: now } })
      ]);

      return res.status(200).json({
        status: true,
        data: rows,
        message: 'Promotions retrieved successfully',
        count,
        stats: { active: activeCount }
      });
    } catch (error) {
      console.error('List promotions error:', error);
      return ResponseHelper.error(res, 'Failed to retrieve promotions', 500);
    }
  }

  // POST /promotions — admin: create a promo code.
  async create(req, res) {
    try {
      const {
        title, code, type, value,
        min_order_amount, max_discount, usage_limit,
        start_date, end_date, is_active
      } = req.body;

      if (!title || !String(title).trim()) {
        return ResponseHelper.error(res, 'Title is required', 400);
      }
      if (!PROMO_TYPES.includes(type)) {
        return ResponseHelper.error(res, `type must be one of: ${PROMO_TYPES.join(', ')}`, 400);
      }
      const normCode = normalizeCode(code);
      if (!normCode) {
        return ResponseHelper.error(res, 'Promo code is required', 400);
      }
      // percentage/fixed need a positive value; free_delivery doesn't.
      if (type !== 'free_delivery') {
        const v = Number(value);
        if (!Number.isFinite(v) || v <= 0) {
          return ResponseHelper.error(res, 'A positive value is required for this promo type', 400);
        }
        if (type === 'percentage' && v > 100) {
          return ResponseHelper.error(res, 'Percentage value cannot exceed 100', 400);
        }
      }
      const start = new Date(start_date);
      const end = new Date(end_date);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return ResponseHelper.error(res, 'Valid start_date and end_date are required', 400);
      }
      if (end < start) {
        return ResponseHelper.error(res, 'end_date must be after start_date', 400);
      }

      const existing = await Promotion.findOne({ code: normCode });
      if (existing) {
        return ResponseHelper.error(res, 'A promo code with this code already exists', 400);
      }

      const promotion = await Promotion.create({
        title: String(title).trim(),
        code: normCode,
        type,
        value: type === 'free_delivery' ? null : Number(value),
        min_order_amount: min_order_amount != null && min_order_amount !== '' ? Number(min_order_amount) : null,
        max_discount: max_discount != null && max_discount !== '' ? Number(max_discount) : null,
        usage_limit: usage_limit != null && usage_limit !== '' ? Number(usage_limit) : null,
        used_count: 0,
        start_date: start,
        end_date: end,
        is_active: is_active === undefined ? true : !!is_active
      });

      return ResponseHelper.item(res, promotion, 'Promo code created successfully', 201);
    } catch (error) {
      console.error('Create promotion error:', error);
      return ResponseHelper.error(res, 'Failed to create promo code', 500);
    }
  }

  // PATCH /promotions/:id — admin: update / toggle a promo code.
  async update(req, res) {
    try {
      const promotion = await Promotion.findOne({ id: req.params.id });
      if (!promotion) {
        return ResponseHelper.error(res, 'Promo code not found', 404);
      }

      const b = req.body || {};
      if (b.code !== undefined) {
        const normCode = normalizeCode(b.code);
        if (!normCode) return ResponseHelper.error(res, 'Promo code cannot be empty', 400);
        if (normCode !== promotion.code) {
          const dupe = await Promotion.findOne({ code: normCode });
          if (dupe) return ResponseHelper.error(res, 'A promo code with this code already exists', 400);
        }
        promotion.code = normCode;
      }
      if (b.title !== undefined) promotion.title = String(b.title).trim();
      if (b.type !== undefined) {
        if (!PROMO_TYPES.includes(b.type)) {
          return ResponseHelper.error(res, `type must be one of: ${PROMO_TYPES.join(', ')}`, 400);
        }
        promotion.type = b.type;
      }
      if (b.value !== undefined) promotion.value = b.value === null || b.value === '' ? null : Number(b.value);
      if (b.min_order_amount !== undefined) promotion.min_order_amount = b.min_order_amount === null || b.min_order_amount === '' ? null : Number(b.min_order_amount);
      if (b.max_discount !== undefined) promotion.max_discount = b.max_discount === null || b.max_discount === '' ? null : Number(b.max_discount);
      if (b.usage_limit !== undefined) promotion.usage_limit = b.usage_limit === null || b.usage_limit === '' ? null : Number(b.usage_limit);
      if (b.start_date !== undefined) {
        const d = new Date(b.start_date);
        if (Number.isNaN(d.getTime())) return ResponseHelper.error(res, 'Invalid start_date', 400);
        promotion.start_date = d;
      }
      if (b.end_date !== undefined) {
        const d = new Date(b.end_date);
        if (Number.isNaN(d.getTime())) return ResponseHelper.error(res, 'Invalid end_date', 400);
        promotion.end_date = d;
      }
      if (promotion.end_date < promotion.start_date) {
        return ResponseHelper.error(res, 'end_date must be after start_date', 400);
      }
      if (b.is_active !== undefined) promotion.is_active = !!b.is_active;

      await promotion.save();
      return ResponseHelper.item(res, promotion, 'Promo code updated successfully');
    } catch (error) {
      console.error('Update promotion error:', error);
      return ResponseHelper.error(res, 'Failed to update promo code', 500);
    }
  }

  // DELETE /promotions/:id — admin: remove a promo code.
  async remove(req, res) {
    try {
      const promotion = await Promotion.findOne({ id: req.params.id });
      if (!promotion) {
        return ResponseHelper.error(res, 'Promo code not found', 404);
      }
      await promotion.deleteOne();
      return ResponseHelper.success(res, null, 'Promo code deleted successfully');
    } catch (error) {
      console.error('Delete promotion error:', error);
      return ResponseHelper.error(res, 'Failed to delete promo code', 500);
    }
  }

  // POST /promotions/validate — any signed-in user: check a code against an
  // order amount and return the computed discount (used by the cart/checkout).
  async validate(req, res) {
    try {
      const { code, order_amount } = req.body;
      const normCode = normalizeCode(code);
      if (!normCode) {
        return ResponseHelper.error(res, 'Promo code is required', 400);
      }
      const amount = Number(order_amount) || 0;

      const promotion = await Promotion.findOne({ code: normCode });
      if (!promotion || !promotion.isValid()) {
        return ResponseHelper.error(res, 'This promo code is invalid or expired', 400);
      }
      if (!promotion.canUse(amount)) {
        const min = promotion.min_order_amount;
        return ResponseHelper.error(
          res,
          min ? `This code requires a minimum order of ${min}` : 'This promo code cannot be used',
          400
        );
      }

      const discount = promotion.calculateDiscount(amount);
      return ResponseHelper.item(res, {
        code: promotion.code,
        title: promotion.title,
        type: promotion.type,
        value: promotion.value,
        discount,
        free_delivery: promotion.type === 'free_delivery'
      }, 'Promo code applied');
    } catch (error) {
      console.error('Validate promotion error:', error);
      return ResponseHelper.error(res, 'Failed to validate promo code', 500);
    }
  }
}

module.exports = new PromotionController();

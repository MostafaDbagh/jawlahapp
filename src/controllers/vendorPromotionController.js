const { Vendor } = require('../models');
const VendorPromotion = require('../models/VendorPromotion');
const ResponseHelper = require('../utils/responseHelper');

const ADMIN_TYPES = ['PLATFORM_OWNER', 'PLATFORM_ADMIN'];

const cleanText = (v) => (v != null && String(v).trim() ? String(v).trim() : null);
const cleanCode = (v) => (v != null && String(v).trim() ? String(v).trim().toUpperCase() : null);

// Resolve the vendor a promotion belongs to and verify the requester may manage
// it — the restaurant's own owner (Vendor.owner_user_id) or a platform admin.
// Returns { vendor } on success or { error, status } to short-circuit.
async function resolveOwnedVendor(req, vendorId) {
  const vendor = await Vendor.findOne({ id: vendorId });
  if (!vendor) return { error: 'Vendor not found', status: 404 };

  const isAdmin = req.user && ADMIN_TYPES.includes(req.user.account_type);
  const isOwner = req.user && vendor.owner_user_id && vendor.owner_user_id === req.user.user_id;
  if (!isAdmin && !isOwner) {
    return { error: 'You are not allowed to manage this restaurant\'s promotions', status: 403 };
  }
  return { vendor };
}

class VendorPromotionController {
  // GET /vendor-promotions/vendor/:vendorId — a restaurant's promo banners.
  // Public (no auth): returns active banners only. The merchant portal passes
  // include_inactive=1 to also see disabled ones (mirrors products' include_unavailable).
  static async listForVendor(req, res) {
    try {
      const { vendorId } = req.params;
      const includeInactive = ['1', 'true'].includes(String(req.query.include_inactive));

      const query = { vendor_id: vendorId };
      if (!includeInactive) query.is_active = true;

      const promotions = await VendorPromotion.find(query).sort({ sort_order: 1, created_at: -1 });
      return ResponseHelper.list(res, promotions, promotions.length, 'Promotions retrieved successfully');
    } catch (error) {
      console.error('List vendor promotions error:', error);
      return ResponseHelper.error(res, 'Failed to retrieve promotions', 500);
    }
  }

  // POST /vendor-promotions/vendor/:vendorId — owner/admin: create a banner.
  static async create(req, res) {
    try {
      const { vendor, error, status } = await resolveOwnedVendor(req, req.params.vendorId);
      if (error) return ResponseHelper.error(res, error, status);

      const { title, description, code, is_active, sort_order } = req.body || {};
      if (!title || !String(title).trim()) {
        return ResponseHelper.error(res, 'Title is required', 400);
      }

      const promotion = await VendorPromotion.create({
        vendor_id: vendor.id,
        title: String(title).trim(),
        description: cleanText(description),
        code: cleanCode(code),
        is_active: is_active === undefined ? true : !!is_active,
        sort_order: Number.isFinite(Number(sort_order)) ? Number(sort_order) : 0
      });

      return ResponseHelper.item(res, promotion, 'Promotion created successfully', 201);
    } catch (error) {
      console.error('Create vendor promotion error:', error);
      return ResponseHelper.error(res, 'Failed to create promotion', 500);
    }
  }

  // PATCH /vendor-promotions/:id — owner/admin: update / toggle a banner.
  static async update(req, res) {
    try {
      const promotion = await VendorPromotion.findOne({ id: req.params.id });
      if (!promotion) return ResponseHelper.error(res, 'Promotion not found', 404);

      const { error, status } = await resolveOwnedVendor(req, promotion.vendor_id);
      if (error) return ResponseHelper.error(res, error, status);

      const b = req.body || {};
      if (b.title !== undefined) {
        if (!String(b.title).trim()) return ResponseHelper.error(res, 'Title cannot be empty', 400);
        promotion.title = String(b.title).trim();
      }
      if (b.description !== undefined) promotion.description = cleanText(b.description);
      if (b.code !== undefined) promotion.code = cleanCode(b.code);
      if (b.is_active !== undefined) promotion.is_active = !!b.is_active;
      if (b.sort_order !== undefined && Number.isFinite(Number(b.sort_order))) {
        promotion.sort_order = Number(b.sort_order);
      }

      await promotion.save();
      return ResponseHelper.item(res, promotion, 'Promotion updated successfully');
    } catch (error) {
      console.error('Update vendor promotion error:', error);
      return ResponseHelper.error(res, 'Failed to update promotion', 500);
    }
  }

  // DELETE /vendor-promotions/:id — owner/admin: remove a banner.
  static async remove(req, res) {
    try {
      const promotion = await VendorPromotion.findOne({ id: req.params.id });
      if (!promotion) return ResponseHelper.error(res, 'Promotion not found', 404);

      const { error, status } = await resolveOwnedVendor(req, promotion.vendor_id);
      if (error) return ResponseHelper.error(res, error, status);

      await promotion.deleteOne();
      return ResponseHelper.success(res, null, 'Promotion deleted successfully');
    } catch (error) {
      console.error('Delete vendor promotion error:', error);
      return ResponseHelper.error(res, 'Failed to delete promotion', 500);
    }
  }
}

module.exports = VendorPromotionController;

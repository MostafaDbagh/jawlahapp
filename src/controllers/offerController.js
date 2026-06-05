const { Offer, Branch, Subcategory, Product, Vendor } = require('../models');
const ResponseHelper = require('../utils/responseHelper');

// Look up the entity a polymorphic offer points to
const getEntityDetails = async (entityType, entityId) => {
  switch (entityType) {
    case 'branch':
      return Branch.findOne({ id: entityId }).select('id name city address');
    case 'subcategory':
      return Subcategory.findOne({ id: entityId }).select('id name image');
    case 'product':
      return Product.findOne({ id: entityId }).select('id name price image');
    case 'vendor':
      return Vendor.findOne({ id: entityId }).select('id name image');
    default:
      return null;
  }
};

class OfferController {
  // GET /offers/active - Get all active offers
  static async getActiveOffers(req, res) {
    try {
      const {
        entity_type,
        entity_id,
        page = 1,
        limit = 20
      } = req.query;

      const offset = (page - 1) * limit;
      const now = new Date();
      const query = {
        is_active: true,
        start_date: { $lte: now },
        end_date: { $gte: now }
      };

      // Filter by entity type and ID
      if (entity_type) {
        query.entity_type = entity_type;
      }
      if (entity_id) {
        query.entity_id = entity_id;
      }

      const [offers, count] = await Promise.all([
        Offer.find(query)
          .sort({ created_at: -1 })
          .skip(parseInt(offset))
          .limit(parseInt(limit)),
        Offer.countDocuments(query)
      ]);

      // Add entity details for each offer
      const offersWithDetails = await Promise.all(
        offers.map(async (offer) => {
          const entityDetails = await getEntityDetails(offer.entity_type, offer.entity_id);

          return {
            ...offer.toJSON(),
            entity_details: entityDetails
          };
        })
      );

      return ResponseHelper.list(res, offersWithDetails, count, 'Active offers retrieved successfully');
    } catch (error) {
      console.error('Error getting active offers:', error);
      return ResponseHelper.error(res, 'Failed to retrieve active offers', 500);
    }
  }

  // POST /branches/:id/offers - Create branch-wide offer
  static async createBranchOffer(req, res) {
    try {
      const { id: branch_id } = req.params;
      const { type, value, title, description, start_date, end_date } = req.body;

      // Verify branch exists
      const branch = await Branch.findOne({ id: branch_id });
      if (!branch) {
        return ResponseHelper.error(res, 'Branch not found', 404);
      }

      const offer = await Offer.create({
        entity_type: 'branch',
        entity_id: branch_id,
        type,
        value,
        title,
        description,
        start_date: new Date(start_date),
        end_date: new Date(end_date)
      });

      return ResponseHelper.item(res, offer, 'Branch offer created successfully', 201);
    } catch (error) {
      console.error('Error creating branch offer:', error);
      return ResponseHelper.error(res, 'Failed to create branch offer', 500);
    }
  }

  // POST /branches/:id/subcategories/:sub_id/offers - Create subcategory offer
  static async createSubcategoryOffer(req, res) {
    try {
      const { id: branch_id, sub_id } = req.params;
      const { type, value, title, description, start_date, end_date } = req.body;

      // Verify subcategory exists for this branch
      const subcategory = await Subcategory.findOne({ id: sub_id, branch_id });
      if (!subcategory) {
        return ResponseHelper.error(res, 'Subcategory not found for this branch', 404);
      }

      const offer = await Offer.create({
        entity_type: 'subcategory',
        entity_id: sub_id,
        type,
        value,
        title,
        description,
        start_date: new Date(start_date),
        end_date: new Date(end_date)
      });

      return ResponseHelper.item(res, offer, 'Subcategory offer created successfully', 201);
    } catch (error) {
      console.error('Error creating subcategory offer:', error);
      return ResponseHelper.error(res, 'Failed to create subcategory offer', 500);
    }
  }

  // POST /products/:id/offers - Create product-specific offer
  static async createProductOffer(req, res) {
    try {
      const { id: product_id } = req.params;
      const { type, value, title, description, start_date, end_date } = req.body;

      // Verify product exists
      const product = await Product.findOne({ id: product_id });
      if (!product) {
        return ResponseHelper.error(res, 'Product not found', 404);
      }

      const offer = await Offer.create({
        entity_type: 'product',
        entity_id: product_id,
        type,
        value,
        title,
        description,
        start_date: new Date(start_date),
        end_date: new Date(end_date)
      });

      return ResponseHelper.item(res, offer, 'Product offer created successfully', 201);
    } catch (error) {
      console.error('Error creating product offer:', error);
      return ResponseHelper.error(res, 'Failed to create product offer', 500);
    }
  }

  // PUT /offers/:id - Update offer
  static async updateOffer(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const offer = await Offer.findOne({ id });
      if (!offer) {
        return ResponseHelper.error(res, 'Offer not found', 404);
      }

      // Convert date strings to Date objects if provided
      if (updateData.start_date) {
        updateData.start_date = new Date(updateData.start_date);
      }
      if (updateData.end_date) {
        updateData.end_date = new Date(updateData.end_date);
      }

      await offer.update(updateData);

      return ResponseHelper.item(res, offer, 'Offer updated successfully');
    } catch (error) {
      console.error('Error updating offer:', error);
      return ResponseHelper.error(res, 'Failed to update offer', 500);
    }
  }

  // DELETE /offers/:id - Delete offer
  static async deleteOffer(req, res) {
    try {
      const { id } = req.params;

      const offer = await Offer.findOne({ id });
      if (!offer) {
        return ResponseHelper.error(res, 'Offer not found', 404);
      }

      await offer.update({ is_active: false });

      return ResponseHelper.success(res, null, 'Offer deactivated successfully');
    } catch (error) {
      console.error('Error deleting offer:', error);
      return ResponseHelper.error(res, 'Failed to delete offer', 500);
    }
  }

  // GET /offers/:id - Get offer details
  static async getOfferById(req, res) {
    try {
      const { id } = req.params;

      const offer = await Offer.findOne({ id });
      if (!offer) {
        return ResponseHelper.error(res, 'Offer not found', 404);
      }

      const entityDetails = await getEntityDetails(offer.entity_type, offer.entity_id);

      const offerData = {
        ...offer.toJSON(),
        entity_details: entityDetails,
        is_valid: offer.isValid()
      };

      return ResponseHelper.item(res, offerData, 'Offer details retrieved successfully');
    } catch (error) {
      console.error('Error getting offer:', error);
      return ResponseHelper.error(res, 'Failed to retrieve offer details', 500);
    }
  }

  // GET /offers/expired - Get expired offers
  static async getExpiredOffers(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;

      const offset = (page - 1) * limit;
      const query = { end_date: { $lt: new Date() } };

      const [offers, count] = await Promise.all([
        Offer.find(query)
          .sort({ end_date: -1 })
          .skip(parseInt(offset))
          .limit(parseInt(limit)),
        Offer.countDocuments(query)
      ]);

      return ResponseHelper.list(res, offers, count, 'Expired offers retrieved successfully');
    } catch (error) {
      console.error('Error getting expired offers:', error);
      return ResponseHelper.error(res, 'Failed to retrieve expired offers', 500);
    }
  }
}

module.exports = OfferController;

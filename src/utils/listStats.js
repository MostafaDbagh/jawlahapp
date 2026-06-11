// Batched stat helpers for list endpoints. They replace the per-item
// `vendor.getAverageRating()` / `branch.getAverageRating()` / `product.getActiveOffers()`
// calls (which each issued their own query, producing N+1 explosions) with a
// fixed number of `$in` queries for the whole page.
const { Branch, Review, Offer } = require('../models');

// Vendor stats keyed by vendor id, in 2 queries total instead of 3 per vendor.
// Semantics match Vendor.getActiveBranchesCount + Vendor.getAverageRating:
//   branch_count = active branches; rating = average over ALL the vendor's branches.
async function buildVendorStats(vendorIds) {
  const stats = {};
  for (const id of vendorIds) stats[id] = { branch_count: 0, sum: 0, count: 0 };
  if (vendorIds.length === 0) return stats;

  const branches = await Branch.find({ vendor_id: { $in: vendorIds } })
    .select('id vendor_id is_active')
    .lean();

  const branchToVendor = {};
  const allBranchIds = [];
  for (const b of branches) {
    branchToVendor[b.id] = b.vendor_id;
    allBranchIds.push(b.id);
    if (b.is_active && stats[b.vendor_id]) stats[b.vendor_id].branch_count += 1;
  }

  if (allBranchIds.length) {
    const rows = await Review.aggregate([
      { $match: { branch_id: { $in: allBranchIds } } },
      { $group: { _id: '$branch_id', sum: { $sum: '$rating' }, count: { $sum: 1 } } }
    ]);
    for (const r of rows) {
      const vid = branchToVendor[r._id];
      if (vid && stats[vid]) {
        stats[vid].sum += r.sum;
        stats[vid].count += r.count;
      }
    }
  }
  return stats;
}

// Read a single vendor's computed stats out of the map from buildVendorStats.
function vendorStat(stats, vendorId) {
  const s = stats[vendorId] || { branch_count: 0, sum: 0, count: 0 };
  return {
    branch_count: s.branch_count,
    average_rating: s.count ? s.sum / s.count : 0,
    total_reviews: s.count
  };
}

// branch_id -> { averageRating, totalReviews } in one aggregation (matches
// Branch.getAverageRating's shape).
async function buildBranchRatings(branchIds) {
  const map = {};
  for (const id of branchIds) map[id] = { averageRating: 0, totalReviews: 0 };
  if (branchIds.length === 0) return map;

  const rows = await Review.aggregate([
    { $match: { branch_id: { $in: branchIds } } },
    { $group: { _id: '$branch_id', avg: { $avg: '$rating' }, count: { $sum: 1 } } }
  ]);
  for (const r of rows) {
    map[r._id] = { averageRating: parseFloat(r.avg) || 0, totalReviews: r.count };
  }
  return map;
}

// entity_id -> [active offer docs], in one query (for pricing a product list).
async function buildActiveOffersByEntity(entityType, entityIds) {
  const map = {};
  for (const id of entityIds) map[id] = [];
  if (entityIds.length === 0) return map;

  const now = new Date();
  const offers = await Offer.find({
    entity_type: entityType,
    entity_id: { $in: entityIds },
    is_active: true,
    start_date: { $lte: now },
    end_date: { $gte: now }
  }).lean();
  for (const o of offers) (map[o.entity_id] = map[o.entity_id] || []).push(o);
  return map;
}

// Set of entity ids that currently have an active offer (for the has_offer filter).
async function buildActiveOfferEntitySet(entityType, entityIds) {
  const set = new Set();
  if (entityIds.length === 0) return set;

  const now = new Date();
  const offers = await Offer.find({
    entity_type: entityType,
    entity_id: { $in: entityIds },
    is_active: true,
    start_date: { $lte: now },
    end_date: { $gte: now }
  }).select('entity_id').lean();
  for (const o of offers) set.add(o.entity_id);
  return set;
}

module.exports = {
  buildVendorStats,
  vendorStat,
  buildBranchRatings,
  buildActiveOffersByEntity,
  buildActiveOfferEntitySet
};

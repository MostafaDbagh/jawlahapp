const express = require('express');
const router = express.Router();
const BranchController = require('../../controllers/branchController');
const { authenticateToken } = require('../../middleware/auth');
const { validateBranchCreate, validateBranchUpdate } = require('../../middleware/validation');

// Public routes
router.get('/', BranchController.getAllBranches);
router.get('/nearby', BranchController.getNearbyBranches);
router.get('/popular', BranchController.getPopularBranches);
router.get('/:id', BranchController.getBranchById);

// Protected routes (require authentication)
router.post('/:id/activate', authenticateToken, BranchController.activateBranch);

// Vendor-specific routes (require vendor authentication)
router.get('/vendor/:vendor_id', authenticateToken, BranchController.getVendorBranches);
router.post('/vendor/:vendor_id', authenticateToken, validateBranchCreate, BranchController.createBranch);
router.put('/:id', authenticateToken, validateBranchUpdate, BranchController.updateBranch);
router.delete('/:id', authenticateToken, BranchController.deleteBranch);

module.exports = router;

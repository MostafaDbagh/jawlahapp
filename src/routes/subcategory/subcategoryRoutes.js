const express = require('express');
const router = express.Router();
const SubcategoryController = require('../../controllers/subcategoryController');
const { authenticateToken } = require('../../middleware/auth');
const { validateSubcategoryCreate, validateSubcategoryUpdate } = require('../../middleware/validation');

// Public routes
router.get('/search', SubcategoryController.searchSubcategories);

// Branch-specific routes
router.get('/branches/:id', SubcategoryController.getBranchSubcategories);
router.get('/branches/:id/:sub_id', SubcategoryController.getSubcategoryById);

// Protected routes (require authentication)
router.post('/branches/:id', authenticateToken, validateSubcategoryCreate, SubcategoryController.createSubcategory);
router.put('/branches/:id/:sub_id', authenticateToken, validateSubcategoryUpdate, SubcategoryController.updateSubcategory);
router.delete('/branches/:id/:sub_id', authenticateToken, SubcategoryController.deleteSubcategory);

module.exports = router;

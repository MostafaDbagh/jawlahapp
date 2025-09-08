const express = require('express');
const router = express.Router();
const categoryController = require('../../controllers/categoryController');
const { authenticateToken } = require('../../middleware/auth');
const {
  validateCategoryCreate,
  validateCategoryUpdate,
  handleValidationErrors
} = require('../../middleware/validation');

// Public routes (no authentication required)
router.get('/', categoryController.getAllCategories);
router.get('/:id', categoryController.getCategoryById);

// Protected routes (authentication required)
router.post('/', authenticateToken, validateCategoryCreate, handleValidationErrors, categoryController.createCategory);
router.put('/:id', authenticateToken, validateCategoryUpdate, handleValidationErrors, categoryController.updateCategory);
router.delete('/:id', authenticateToken, categoryController.deleteCategory);

module.exports = router;

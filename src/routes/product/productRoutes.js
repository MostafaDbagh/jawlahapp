const express = require('express');
const router = express.Router();
const ProductController = require('../../controllers/productController');
const { authenticateToken } = require('../../middleware/auth');
const { validateProductCreate, validateProductUpdate } = require('../../middleware/validation');

// Public routes
router.get('/:id', ProductController.getProductById);

// Branch-specific routes
router.get('/branches/:id', ProductController.getBranchProducts);
router.post('/branches/:id', authenticateToken, validateProductCreate, ProductController.createProduct);

// Subcategory-specific routes
router.get('/branches/:branch_id/subcategories/:sub_id', ProductController.getSubcategoryProducts);

// Protected routes (require authentication)
router.put('/:id', authenticateToken, validateProductUpdate, ProductController.updateProduct);
router.delete('/:id', authenticateToken, ProductController.deleteProduct);

// Product variation routes
router.post('/:id/variations', authenticateToken, ProductController.addProductVariation);
router.put('/variations/:id', authenticateToken, ProductController.updateProductVariation);
router.delete('/variations/:id', authenticateToken, ProductController.deleteProductVariation);

module.exports = router;

const express = require('express');
const router = express.Router();
const authRoutes = require('./auth/authRoutes');
const userRoutes = require('./user/userRoutes');
const categoryRoutes = require('./category/categoryRoutes');
const vendorRoutes = require('./vendor/vendorRoutes');
const branchRoutes = require('./branch/branchRoutes');
const subcategoryRoutes = require('./subcategory/subcategoryRoutes');
const productRoutes = require('./product/productRoutes');
const reviewRoutes = require('./review/reviewRoutes');
const offerRoutes = require('./offer/offerRoutes');
const notificationRoutes = require('./notification/notificationRoutes');
const ResponseHelper = require('../utils/responseHelper');

// Health check route
router.get('/health', (req, res) => {
  const healthData = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  };
  
  res.json(ResponseHelper.success(healthData, 'Server is running', 1));
});

// API version 1 routes
router.use('/api/v1/auth', authRoutes);
router.use('/api/v1/users', userRoutes);
router.use('/api/v1/categories', categoryRoutes);
router.use('/api/v1/vendors', vendorRoutes);
router.use('/api/v1/branches', branchRoutes);
router.use('/api/v1/subcategories', subcategoryRoutes);
router.use('/api/v1/products', productRoutes);
router.use('/api/v1/reviews', reviewRoutes);
router.use('/api/v1/offers', offerRoutes);
router.use('/api/v1/notifications', notificationRoutes);

// 404 handler for undefined routes
router.use('*', (req, res) => {
  res.status(404).json(ResponseHelper.error('Route not found', { path: req.originalUrl }, 0));
});

module.exports = router;

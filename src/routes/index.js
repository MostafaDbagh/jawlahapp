const express = require('express');
const router = express.Router();
const authRoutes = require('./auth/authRoutes');
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

// 404 handler for undefined routes
router.use('*', (req, res) => {
  res.status(404).json(ResponseHelper.error('Route not found', { path: req.originalUrl }, 0));
});

module.exports = router;

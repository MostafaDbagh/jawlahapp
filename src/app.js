const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const ResponseHelper = require('./utils/responseHelper');
require('dotenv').config();

const routes = require('./routes');

const app = express();

// Behind Vercel / a reverse proxy: trust the first proxy hop so req.ip reflects
// the real client address (used by the rate limiters), not the proxy's.
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/', routes);

// Global error handling middleware
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  // Mongoose validation errors
  if (error.name === 'ValidationError') {
    const fieldErrors = Object.values(error.errors || {}).map(err => ({
      field: err.path,
      message: err.message
    }));
    return res.status(400).json(
      ResponseHelper.error('Validation failed', fieldErrors, fieldErrors.length)
    );
  }

  // Mongoose / MongoDB duplicate key errors
  if (error.code === 11000) {
    const fields = Object.keys(error.keyValue || {});
    return res.status(400).json(
      ResponseHelper.error('Duplicate entry', fields.map(field => ({
        field,
        message: `${field} already exists`
      })), fields.length)
    );
  }

  // Mongoose bad ObjectId / cast errors
  if (error.name === 'CastError') {
    return res.status(400).json(
      ResponseHelper.error(`Invalid value for ${error.path}`, null, 0)
    );
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json(
      ResponseHelper.error('Invalid token', null, 0)
    );
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json(
      ResponseHelper.error('Token expired', null, 0)
    );
  }

  // Default error response
  res.status(error.status || 500).json(
    ResponseHelper.error(
      error.message || 'Internal server error',
      process.env.NODE_ENV === 'development' ? { stack: error.stack } : null,
      0
    )
  );
});

module.exports = app;

const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection string. Falls back to a sensible local default.
const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.DATABASE_URL ||
  'mongodb://127.0.0.1:27017/jawla';

// Reuse a single connection across serverless invocations (Vercel)
let connectionPromise = null;

// Lifecycle breadcrumbs — without these a dropped Atlas connection is
// invisible in the logs until queries start buffer-timing out.
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected');
});
mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});

const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      return mongoose.connection;
    }

    mongoose.set('strictQuery', true);

    if (!connectionPromise) {
      connectionPromise = mongoose.connect(MONGO_URI, {
        serverSelectionTimeoutMS: 30000,
        maxPoolSize: 10
      });
    }

    await connectionPromise;
    console.log('✅ Database connection established successfully');
    return mongoose.connection;
  } catch (error) {
    connectionPromise = null;
    console.error('❌ Unable to connect to the database:', error);
    throw error;
  }
};

module.exports = { mongoose, connectDB };

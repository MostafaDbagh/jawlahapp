
const app = require('./app');
const { connectDB } = require('./config/database');
const { initDatabase } = require('./config/initDb');
const otpService = require('./utils/otpService');

// Import models to establish relationships
require('./models');

const PORT = process.env.PORT || 5000;

// Start server function
const startServer = async () => {
  try {
    console.log('🚀 Starting server...');
    console.log('🔧 Environment check:');
    console.log('- NODE_ENV:', process.env.NODE_ENV);
    console.log('- DATABASE_URL exists:', !!process.env.DATABASE_URL);
    console.log('- JWT_SECRET exists:', !!process.env.JWT_SECRET);
    
    // Connect to database
    console.log('📡 Connecting to database...');
    await connectDB();
    
    // Initialize database schema
    console.log('🗄️ Initializing database...');
    await initDatabase();
    
    // Start server
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📧 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`📚 API docs: http://localhost:${PORT}/api/v1/auth`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      server.close(() => {
        console.log('Process terminated');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received, shutting down gracefully');
      server.close(() => {
        console.log('Process terminated');
        process.exit(0);
      });
    });

    // Clean up expired OTPs every hour
    setInterval(async () => {
      try {
        await otpService.cleanupExpiredOTPs();
      } catch (error) {
        console.error('OTP cleanup error:', error);
      }
    }, 60 * 60 * 1000); // 1 hour

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Start the server
startServer();

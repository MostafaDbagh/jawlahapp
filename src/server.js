
const app = require('./app');
const { connectDB } = require('./config/database');
const { initDatabase } = require('./config/initDb');
const otpService = require('./utils/otpService');

// Import models to establish relationships - but don't fail if DB is not available
let modelsLoaded = false;
try {
  require('./models');
  modelsLoaded = true;
  console.log('✅ Models loaded successfully');
} catch (error) {
  console.warn('⚠️ Models could not be loaded:', error.message);
  console.log('🔄 Continuing without database models...');
}

const PORT = process.env.PORT || 5000;

// Start server function
const startServer = async () => {
  try {
    console.log('🚀 Starting server...');
    console.log('🔧 Environment check:');
    console.log('- NODE_ENV:', process.env.NODE_ENV);
    console.log('- DATABASE_URL exists:', !!process.env.DATABASE_URL);
    console.log('- JWT_SECRET exists:', !!process.env.JWT_SECRET);
    
    // Try to connect to database, but don't fail if it doesn't work
    if (modelsLoaded) {
      try {
        console.log('📡 Connecting to database...');
        await connectDB();
        
        // Initialize database schema
        console.log('🗄️ Initializing database...');
        await initDatabase();
        console.log('✅ Database connected and initialized');
      } catch (dbError) {
        console.error('⚠️ Database connection failed:', dbError.message);
        console.log('🔄 Starting server without database connection...');
      }
    } else {
      console.log('🔄 Starting server without database connection (models not loaded)...');
    }
    
    // Start server. Bind explicitly to 0.0.0.0 (IPv4, all interfaces) so the
    // iOS simulator / devices can reach it via localhost (127.0.0.1) and the
    // LAN IP — a default bind ends up IPv6-only (::1) on macOS.
    const server = app.listen(PORT, '0.0.0.0', () => {
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

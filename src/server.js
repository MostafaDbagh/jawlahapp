
const app = require('./app');
const { mongoose, connectDB } = require('./config/database');
const { initDatabase } = require('./config/initDb');
const otpService = require('./utils/otpService');
const dispatchService = require('./services/dispatchService');
const dispatchCfg = require('./config/dispatch');

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

// Fail-fast configuration check. A missing/weak JWT secret means every token
// operation would either throw at request time or be trivially forgeable, so we
// refuse to start rather than boot into a broken/insecure auth state.
const validateConfig = () => {
  const secret = process.env.JWT_SECRET;
  const isProd = process.env.NODE_ENV === 'production';
  const KNOWN_PLACEHOLDERS = [
    'your-super-secret-jwt-key-change-this-in-production',
    'your_jwt_secret_key_here_change_in_production'
  ];

  if (!secret) {
    throw new Error('JWT_SECRET is not set. Refusing to start.');
  }
  if (isProd && (secret.length < 32 || KNOWN_PLACEHOLDERS.includes(secret) || /change/i.test(secret))) {
    throw new Error('JWT_SECRET is using a default/placeholder or is too short for production. Set a strong (32+ char) secret.');
  }
  if (!isProd && (KNOWN_PLACEHOLDERS.includes(secret) || secret.length < 32)) {
    console.warn('⚠️ JWT_SECRET is weak/placeholder — fine for local dev, but MUST be replaced before production.');
  }
};

// Start server function
const startServer = async () => {
  try {
    console.log('🚀 Starting server...');
    validateConfig();
    console.log('🔧 Environment check:');
    console.log('- NODE_ENV:', process.env.NODE_ENV);
    console.log('- DATABASE_URL exists:', !!process.env.DATABASE_URL);
    console.log('- JWT_SECRET exists:', !!process.env.JWT_SECRET);
    
    // Try to connect to database, but don't block startup if it doesn't work.
    // A failed boot-time connect (slow Atlas on a cold start, transient DNS)
    // must NOT leave the instance permanently DB-less — every query would
    // buffer-timeout until the next restart — so keep retrying in the
    // background until the connection lands.
    const ensureDbConnected = async () => {
      try {
        console.log('📡 Connecting to database...');
        await connectDB();

        // Initialize database schema
        console.log('🗄️ Initializing database...');
        await initDatabase();
        console.log('✅ Database connected and initialized');
      } catch (dbError) {
        console.error('⚠️ Database connection failed:', dbError.message);
        console.log('🔄 Serving without DB; retrying connection in 15s...');
        setTimeout(ensureDbConnected, 15000);
      }
    };
    if (modelsLoaded) {
      await ensureDbConnected();
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

    // Periodic jobs only make sense against a live DB connection. When the
    // DB is down (cold start, Atlas blip) skip the tick instead of issuing a
    // query that buffers for 10s and floods the log with timeout errors.
    const dbIsConnected = () => mongoose.connection.readyState === 1;

    // Clean up expired OTPs every hour
    setInterval(async () => {
      if (!dbIsConnected()) return;
      try {
        await otpService.cleanupExpiredOTPs();
      } catch (error) {
        console.error('OTP cleanup error:', error);
      }
    }, 60 * 60 * 1000); // 1 hour

    // Driver dispatch: sweep expired exclusive offers and cascade to the next
    // best driver. BEST-EFFORT only — lazy expiry on the offer/accept/poll
    // filters is the real never-stuck guarantee; this just speeds up cascades.
    setInterval(async () => {
      if (!dbIsConnected()) return;
      try {
        await dispatchService.sweepExpired();
      } catch (error) {
        console.error('Dispatch sweep error:', error);
      }
    }, dispatchCfg.SWEEP_MS);

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

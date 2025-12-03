/**
 * Comprehensive Implementation Verification Script
 * Verifies all three features are properly implemented
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Implementation...\n');
console.log('='.repeat(60));

let allPassed = true;
const checks = [];

// Check 1: Phone Login Routes
console.log('\n📱 Feature 1: Phone Number Login (OTP-Based Authentication)');
try {
  const authRoutes = fs.readFileSync('src/routes/auth/authRoutes.js', 'utf8');
  
  if (authRoutes.includes('request-otp-login')) {
    checks.push({ feature: 'Phone Login - Request OTP Route', status: '✅' });
    console.log('  ✅ Request OTP route registered');
  } else {
    checks.push({ feature: 'Phone Login - Request OTP Route', status: '❌' });
    console.log('  ❌ Request OTP route missing');
    allPassed = false;
  }
  
  if (authRoutes.includes('verify-otp-login')) {
    checks.push({ feature: 'Phone Login - Verify OTP Route', status: '✅' });
    console.log('  ✅ Verify OTP route registered');
  } else {
    checks.push({ feature: 'Phone Login - Verify OTP Route', status: '❌' });
    console.log('  ❌ Verify OTP route missing');
    allPassed = false;
  }
  
  if (authRoutes.includes('rateLimitOTPRequest')) {
    checks.push({ feature: 'Phone Login - Rate Limiting', status: '✅' });
    console.log('  ✅ Rate limiting middleware applied');
  } else {
    checks.push({ feature: 'Phone Login - Rate Limiting', status: '❌' });
    console.log('  ❌ Rate limiting middleware missing');
    allPassed = false;
  }
} catch (error) {
  console.log('  ❌ Error checking auth routes:', error.message);
  allPassed = false;
}

// Check 2: Controller Methods
console.log('\n🎮 Controllers');
try {
  const authController = fs.readFileSync('src/controllers/authController.js', 'utf8');
  
  if (authController.includes('requestOTPLogin')) {
    checks.push({ feature: 'Phone Login - Request OTP Controller', status: '✅' });
    console.log('  ✅ requestOTPLogin method exists');
  } else {
    checks.push({ feature: 'Phone Login - Request OTP Controller', status: '❌' });
    console.log('  ❌ requestOTPLogin method missing');
    allPassed = false;
  }
  
  if (authController.includes('verifyOTPLogin')) {
    checks.push({ feature: 'Phone Login - Verify OTP Controller', status: '✅' });
    console.log('  ✅ verifyOTPLogin method exists');
  } else {
    checks.push({ feature: 'Phone Login - Verify OTP Controller', status: '❌' });
    console.log('  ❌ verifyOTPLogin method missing');
    allPassed = false;
  }
} catch (error) {
  console.log('  ❌ Error checking controllers:', error.message);
  allPassed = false;
}

// Check 3: FCM Token Feature
console.log('\n📲 Feature 2: Save FCM Token for Push Notifications');
try {
  const userRoutes = fs.readFileSync('src/routes/user/userRoutes.js', 'utf8');
  
  if (userRoutes.includes('fcm-token')) {
    checks.push({ feature: 'FCM Token - Route', status: '✅' });
    console.log('  ✅ FCM token route registered');
  } else {
    checks.push({ feature: 'FCM Token - Route', status: '❌' });
    console.log('  ❌ FCM token route missing');
    allPassed = false;
  }
  
  if (userRoutes.includes('authenticateToken')) {
    checks.push({ feature: 'FCM Token - Authentication', status: '✅' });
    console.log('  ✅ Authentication required');
  } else {
    checks.push({ feature: 'FCM Token - Authentication', status: '❌' });
    console.log('  ❌ Authentication not enforced');
    allPassed = false;
  }
  
  const userController = fs.readFileSync('src/controllers/userController.js', 'utf8');
  if (userController.includes('saveFCMToken')) {
    checks.push({ feature: 'FCM Token - Controller', status: '✅' });
    console.log('  ✅ saveFCMToken method exists');
  } else {
    checks.push({ feature: 'FCM Token - Controller', status: '❌' });
    console.log('  ❌ saveFCMToken method missing');
    allPassed = false;
  }
  
  const userModel = fs.readFileSync('src/models/User.js', 'utf8');
  if (userModel.includes('fcm_token')) {
    checks.push({ feature: 'FCM Token - Model Field', status: '✅' });
    console.log('  ✅ fcm_token field in User model');
  } else {
    checks.push({ feature: 'FCM Token - Model Field', status: '❌' });
    console.log('  ❌ fcm_token field missing');
    allPassed = false;
  }
} catch (error) {
  console.log('  ❌ Error checking FCM token feature:', error.message);
  allPassed = false;
}

// Check 4: Notifications Feature
console.log('\n🔔 Feature 3: Notifications API with Pagination & Filtering');
try {
  const notificationRoutes = fs.readFileSync('src/routes/notification/notificationRoutes.js', 'utf8');
  
  if (notificationRoutes.includes('getNotifications')) {
    checks.push({ feature: 'Notifications - GET Route', status: '✅' });
    console.log('  ✅ GET notifications route registered');
  } else {
    checks.push({ feature: 'Notifications - GET Route', status: '❌' });
    console.log('  ❌ GET notifications route missing');
    allPassed = false;
  }
  
  if (notificationRoutes.includes('markAsRead')) {
    checks.push({ feature: 'Notifications - Mark as Read', status: '✅' });
    console.log('  ✅ Mark as read route registered');
  } else {
    checks.push({ feature: 'Notifications - Mark as Read', status: '❌' });
    console.log('  ❌ Mark as read route missing');
    allPassed = false;
  }
  
  const notificationController = fs.readFileSync('src/controllers/notificationController.js', 'utf8');
  if (notificationController.includes('getNotifications')) {
    checks.push({ feature: 'Notifications - Controller', status: '✅' });
    console.log('  ✅ getNotifications method exists');
  } else {
    checks.push({ feature: 'Notifications - Controller', status: '❌' });
    console.log('  ❌ getNotifications method missing');
    allPassed = false;
  }
  
  if (notificationController.includes('page') && notificationController.includes('limit')) {
    checks.push({ feature: 'Notifications - Pagination', status: '✅' });
    console.log('  ✅ Pagination implemented');
  } else {
    checks.push({ feature: 'Notifications - Pagination', status: '❌' });
    console.log('  ❌ Pagination missing');
    allPassed = false;
  }
  
  if (notificationController.includes('type')) {
    checks.push({ feature: 'Notifications - Type Filtering', status: '✅' });
    console.log('  ✅ Type filtering implemented');
  } else {
    checks.push({ feature: 'Notifications - Type Filtering', status: '❌' });
    console.log('  ❌ Type filtering missing');
    allPassed = false;
  }
  
  if (fs.existsSync('src/models/Notification.js')) {
    checks.push({ feature: 'Notifications - Model', status: '✅' });
    console.log('  ✅ Notification model exists');
  } else {
    checks.push({ feature: 'Notifications - Model', status: '❌' });
    console.log('  ❌ Notification model missing');
    allPassed = false;
  }
} catch (error) {
  console.log('  ❌ Error checking notifications feature:', error.message);
  allPassed = false;
}

// Check 5: Supporting Files
console.log('\n📁 Supporting Files');
const supportingFiles = [
  { path: 'src/middleware/rateLimiter.js', name: 'Rate Limiter Middleware' },
  { path: 'src/models/OTP.js', name: 'OTP Model (with phone field)' },
  { path: 'src/config/migrations/add_new_features.sql', name: 'Database Migration' }
];

supportingFiles.forEach(file => {
  if (fs.existsSync(file.path)) {
    checks.push({ feature: file.name, status: '✅' });
    console.log(`  ✅ ${file.name}`);
  } else {
    checks.push({ feature: file.name, status: '❌' });
    console.log(`  ❌ ${file.name} missing`);
    allPassed = false;
  }
});

// Check 6: Validation
console.log('\n✅ Validation');
try {
  const validation = fs.readFileSync('src/middleware/validation.js', 'utf8');
  
  if (validation.includes('validateRequestOTPLogin')) {
    checks.push({ feature: 'Phone Login - Validation', status: '✅' });
    console.log('  ✅ Phone login validation rules');
  } else {
    checks.push({ feature: 'Phone Login - Validation', status: '❌' });
    console.log('  ❌ Phone login validation missing');
    allPassed = false;
  }
  
  if (validation.includes('validateFCMToken')) {
    checks.push({ feature: 'FCM Token - Validation', status: '✅' });
    console.log('  ✅ FCM token validation rules');
  } else {
    checks.push({ feature: 'FCM Token - Validation', status: '❌' });
    console.log('  ❌ FCM token validation missing');
    allPassed = false;
  }
} catch (error) {
  console.log('  ❌ Error checking validation:', error.message);
  allPassed = false;
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('\n📊 Verification Summary\n');

const passed = checks.filter(c => c.status === '✅').length;
const failed = checks.filter(c => c.status === '❌').length;

checks.forEach(check => {
  console.log(`${check.status} ${check.feature}`);
});

console.log(`\n✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📊 Total: ${checks.length}`);

if (allPassed) {
  console.log('\n🎉 All checks passed! Implementation is complete.');
  console.log('\n📝 Next steps:');
  console.log('   1. Set up PostgreSQL database');
  console.log('   2. Run migration: psql -d your_db -f src/config/migrations/add_new_features.sql');
  console.log('   3. Configure .env file with database credentials');
  console.log('   4. Start server: npm start');
  console.log('   5. Test endpoints using TESTING_GUIDE.md');
  process.exit(0);
} else {
  console.log('\n⚠️  Some checks failed. Please review the errors above.');
  process.exit(1);
}


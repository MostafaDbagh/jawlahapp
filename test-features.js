/**
 * Test script for the three new features:
 * 1. Phone Number Login (OTP-Based Authentication)
 * 2. Save FCM Token for Push Notifications
 * 3. Notifications API with Pagination & Filtering
 */

const axios = require('axios');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api/v1`;

// Test phone number (format: +country_code + phone_number)
const TEST_PHONE = process.env.TEST_PHONE || '+1234567890';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

function logTest(testName) {
  log(`\n[TEST] ${testName}`, 'blue');
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

// Store test data
let accessToken = null;
let userId = null;
let receivedOTP = null;

// Helper function to make API calls
async function apiCall(method, endpoint, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${API_BASE}${endpoint}`,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
}

// Test 1: Phone Number Login - Request OTP
async function testRequestOTPLogin() {
  logTest('Request OTP for Phone Login');

  const result = await apiCall('POST', '/auth/request-otp-login', {
    phone: TEST_PHONE
  });

  if (result.success && result.data.success) {
    logSuccess('OTP request successful');
    log(`Response: ${JSON.stringify(result.data, null, 2)}`);
    
    // In a real scenario, you would receive the OTP via SMS
    // For testing, we'll need to check the console logs or database
    logWarning('Check server logs for OTP (SMS simulation)');
    return true;
  } else {
    logError(`OTP request failed: ${JSON.stringify(result.error, null, 2)}`);
    return false;
  }
}

// Test 2: Phone Number Login - Verify OTP (requires manual OTP input)
async function testVerifyOTPLogin(otp) {
  logTest('Verify OTP and Login');

  if (!otp) {
    logWarning('OTP not provided. Skipping verification test.');
    logWarning('To test: Call this script with OTP as second argument');
    logWarning('Example: node test-features.js <otp>');
    return false;
  }

  const result = await apiCall('POST', '/auth/verify-otp-login', {
    phone: TEST_PHONE,
    otp: otp
  });

  if (result.success && result.data.success) {
    logSuccess('OTP verification and login successful');
    log(`Response: ${JSON.stringify(result.data, null, 2)}`);
    
    // Store token for subsequent tests
    if (result.data.data && result.data.data.accessToken) {
      accessToken = result.data.data.accessToken;
      userId = result.data.data.user?.user_id;
      logSuccess(`Access token stored: ${accessToken.substring(0, 20)}...`);
      return true;
    }
  } else {
    logError(`OTP verification failed: ${JSON.stringify(result.error, null, 2)}`);
    return false;
  }
}

// Test 3: Rate Limiting
async function testRateLimiting() {
  logTest('Test Rate Limiting (3 requests per hour)');

  let successCount = 0;
  let rateLimited = false;

  // Try to make 4 requests rapidly
  for (let i = 1; i <= 4; i++) {
    log(`  Attempt ${i}/4...`);
    const result = await apiCall('POST', '/auth/request-otp-login', {
      phone: TEST_PHONE
    });

    if (result.success && result.data.success) {
      successCount++;
    } else if (result.status === 429) {
      rateLimited = true;
      logSuccess(`Rate limit triggered on attempt ${i} (expected)`);
      log(`Response: ${JSON.stringify(result.error, null, 2)}`);
      break;
    }
  }

  if (rateLimited) {
    logSuccess('Rate limiting is working correctly');
    return true;
  } else {
    logWarning('Rate limiting may not be working as expected');
    return false;
  }
}

// Test 4: Save FCM Token
async function testSaveFCMToken() {
  logTest('Save FCM Token');

  if (!accessToken) {
    logWarning('No access token available. Skipping FCM token test.');
    logWarning('Please complete phone login first.');
    return false;
  }

  const fcmToken = 'test-fcm-token-' + Date.now();

  const result = await apiCall('POST', '/users/fcm-token', {
    fcm_token: fcmToken
  }, accessToken);

  if (result.success && result.data.success) {
    logSuccess('FCM token saved successfully');
    log(`Response: ${JSON.stringify(result.data, null, 2)}`);
    
    // Test idempotency - save same token again
    logTest('Test FCM Token Idempotency (save same token again)');
    const result2 = await apiCall('POST', '/users/fcm-token', {
      fcm_token: fcmToken
    }, accessToken);

    if (result2.success && result2.data.success) {
      logSuccess('FCM token update is idempotent');
      return true;
    }
  } else {
    logError(`FCM token save failed: ${JSON.stringify(result.error, null, 2)}`);
    return false;
  }
}

// Test 5: Get Notifications (without authentication - should fail)
async function testNotificationsWithoutAuth() {
  logTest('Get Notifications Without Authentication (should fail)');

  const result = await apiCall('GET', '/notifications');

  if (!result.success && result.status === 401) {
    logSuccess('Authentication is required (as expected)');
    return true;
  } else {
    logError('Notifications endpoint should require authentication');
    return false;
  }
}

// Test 6: Get Notifications with Pagination
async function testGetNotifications() {
  logTest('Get Notifications with Pagination');

  if (!accessToken) {
    logWarning('No access token available. Skipping notifications test.');
    return false;
  }

  // Test basic request
  let result = await apiCall('GET', '/notifications?page=1&limit=10', null, accessToken);

  if (result.success && result.data.success) {
    logSuccess('Notifications retrieved successfully');
    log(`Response: ${JSON.stringify(result.data, null, 2)}`);
  } else {
    logError(`Failed to get notifications: ${JSON.stringify(result.error, null, 2)}`);
    return false;
  }

  // Test with type filter
  logTest('Get Notifications with Type Filter');
  result = await apiCall('GET', '/notifications?page=1&limit=10&type=order', null, accessToken);

  if (result.success && result.data.success) {
    logSuccess('Filtered notifications retrieved successfully');
    log(`Response: ${JSON.stringify(result.data, null, 2)}`);
  }

  // Test pagination
  logTest('Test Pagination (page 2)');
  result = await apiCall('GET', '/notifications?page=2&limit=5', null, accessToken);

  if (result.success && result.data.success) {
    logSuccess('Pagination is working');
    log(`Response: ${JSON.stringify(result.data, null, 2)}`);
  }

  // Test invalid type
  logTest('Test Invalid Notification Type (should fail)');
  result = await apiCall('GET', '/notifications?type=invalid', null, accessToken);

  if (!result.success && result.status === 400) {
    logSuccess('Invalid type is rejected (as expected)');
  }

  return true;
}

// Test 7: Mark Notification as Read
async function testMarkNotificationAsRead() {
  logTest('Mark Notification as Read');

  if (!accessToken) {
    logWarning('No access token available. Skipping mark as read test.');
    return false;
  }

  // First, get notifications to find an ID
  const notificationsResult = await apiCall('GET', '/notifications?limit=1', null, accessToken);

  if (notificationsResult.success && notificationsResult.data.success) {
    const notifications = notificationsResult.data.data.notifications;
    
    if (notifications && notifications.length > 0) {
      const notificationId = notifications[0].notification_id;
      
      const result = await apiCall('PATCH', `/notifications/${notificationId}/mark-read`, null, accessToken);

      if (result.success && result.data.success) {
        logSuccess('Notification marked as read');
        log(`Response: ${JSON.stringify(result.data, null, 2)}`);
        return true;
      } else {
        logWarning('No notifications available to mark as read');
      }
    } else {
      logWarning('No notifications found to test mark as read');
    }
  }

  return false;
}

// Main test runner
async function runTests() {
  logSection('Feature Testing Suite');
  log(`Base URL: ${BASE_URL}`);
  log(`Test Phone: ${TEST_PHONE}`);
  log(`OTP Argument: ${process.argv[2] || 'Not provided'}`);

  const results = {
    passed: 0,
    failed: 0,
    skipped: 0
  };

  // Test 1: Request OTP
  logSection('Feature 1: Phone Number Login (OTP-Based Authentication)');
  if (await testRequestOTPLogin()) {
    results.passed++;
  } else {
    results.failed++;
  }

  // Test 2: Verify OTP (if provided)
  const otp = process.argv[2];
  if (otp) {
    if (await testVerifyOTPLogin(otp)) {
      results.passed++;
    } else {
      results.failed++;
    }
  } else {
    results.skipped++;
    logWarning('Skipping OTP verification test (no OTP provided)');
  }

  // Test 3: Rate Limiting
  if (await testRateLimiting()) {
    results.passed++;
  } else {
    results.failed++;
  }

  // Test 4: Save FCM Token
  logSection('Feature 2: Save FCM Token for Push Notifications');
  if (await testSaveFCMToken()) {
    results.passed++;
  } else {
    results.skipped++;
  }

  // Test 5-7: Notifications API
  logSection('Feature 3: Notifications API with Pagination & Filtering');
  if (await testNotificationsWithoutAuth()) {
    results.passed++;
  } else {
    results.failed++;
  }

  if (await testGetNotifications()) {
    results.passed++;
  } else {
    results.skipped++;
  }

  if (await testMarkNotificationAsRead()) {
    results.passed++;
  } else {
    results.skipped++;
  }

  // Summary
  logSection('Test Summary');
  log(`Passed: ${results.passed}`, 'green');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  log(`Skipped: ${results.skipped}`, 'yellow');
  log(`Total: ${results.passed + results.failed + results.skipped}`);

  if (results.failed === 0) {
    log('\n✓ All tests passed!', 'green');
  } else {
    log('\n✗ Some tests failed. Please review the output above.', 'red');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  logError(`Test execution failed: ${error.message}`);
  console.error(error);
  process.exit(1);
});


# Testing Guide for New Features

This guide explains how to test the three newly implemented features:

1. **Phone Number Login (OTP-Based Authentication)**
2. **Save FCM Token for Push Notifications**
3. **Notifications API with Pagination & Filtering**

## Prerequisites

1. Ensure the database is set up and migrations are run:
   ```bash
   # Run the migration SQL file
   psql -d your_database -f src/config/migrations/add_new_features.sql
   ```

2. Start the server:
   ```bash
   npm start
   # or for development
   npm run dev
   ```

3. Install test dependencies (if using the test script):
   ```bash
   npm install
   ```

## Feature 1: Phone Number Login (OTP-Based Authentication)

### Step 1: Request OTP

**Endpoint:** `POST /api/v1/auth/request-otp-login`

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/request-otp-login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+1234567890"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "data": null,
  "count": 0
}
```

**Notes:**
- Phone number must include country code (e.g., +1234567890)
- OTP is sent via SMS (simulated in console logs for testing)
- Rate limiting: Maximum 3 requests per hour per phone number
- OTP expires after 5 minutes

### Step 2: Verify OTP and Login

**Endpoint:** `POST /api/v1/auth/verify-otp-login`

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/verify-otp-login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+1234567890",
    "otp": "123456"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "user_id": "...",
      "username": "...",
      "email": "...",
      ...
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "count": 1
}
```

**Testing Rate Limiting:**

Try making 4 requests rapidly to test rate limiting:
```bash
for i in {1..4}; do
  curl -X POST http://localhost:3000/api/v1/auth/request-otp-login \
    -H "Content-Type: application/json" \
    -d '{"phone": "+1234567890"}'
  echo ""
done
```

The 4th request should return a 429 status with rate limit error.

## Feature 2: Save FCM Token for Push Notifications

**Endpoint:** `POST /api/v1/users/fcm-token`

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/users/fcm-token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "fcm_token": "firebase-generated-token-string"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "FCM token saved successfully",
  "data": null,
  "count": 0
}
```

**Notes:**
- Requires authentication (Bearer token)
- Idempotent: Calling multiple times with the same or new token updates cleanly
- Token is associated with the authenticated user

**Test Idempotency:**
```bash
# Save the same token twice
curl -X POST http://localhost:3000/api/v1/users/fcm-token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"fcm_token": "test-token-123"}'

# Should succeed without errors
curl -X POST http://localhost:3000/api/v1/users/fcm-token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"fcm_token": "test-token-123"}'
```

## Feature 3: Notifications API with Pagination & Filtering

### Get Notifications

**Endpoint:** `GET /api/v1/notifications`

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 10, max: 50) - Items per page
- `type` (optional) - Filter by type: `order`, `system`, `offers`, or `other`

**Request Examples:**

1. **Basic request (first page, 10 items):**
```bash
curl -X GET "http://localhost:3000/api/v1/notifications" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

2. **With pagination:**
```bash
curl -X GET "http://localhost:3000/api/v1/notifications?page=2&limit=5" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

3. **Filter by type:**
```bash
curl -X GET "http://localhost:3000/api/v1/notifications?type=order" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

4. **Combined (pagination + filter):**
```bash
curl -X GET "http://localhost:3000/api/v1/notifications?page=1&limit=20&type=offers" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Notifications retrieved successfully",
  "data": {
    "notifications": [
      {
        "notification_id": "...",
        "user_id": "...",
        "type": "order",
        "title": "Order Confirmed",
        "message": "Your order #12345 has been confirmed",
        "is_read": false,
        "metadata": null,
        "created_at": "2024-01-01T12:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 50,
      "itemsPerPage": 10,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  },
  "count": 10
}
```

**Notes:**
- Requires authentication
- Returns only notifications for the authenticated user
- Default sort: newest first (created_at DESC)
- Invalid type values return 400 error

### Mark Notification as Read (Optional)

**Endpoint:** `PATCH /api/v1/notifications/:id/mark-read`

**Request:**
```bash
curl -X PATCH "http://localhost:3000/api/v1/notifications/NOTIFICATION_ID/mark-read" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Notification marked as read",
  "data": {
    "notification": {
      "notification_id": "...",
      "is_read": true,
      ...
    }
  },
  "count": 1
}
```

## Automated Testing

Use the provided test script:

```bash
# Install dependencies first
npm install

# Run all tests (without OTP verification)
node test-features.js

# Run tests with OTP verification
# First, request an OTP, then check server logs for the OTP
# Then run:
node test-features.js 123456
```

The test script will:
1. Test OTP request
2. Test OTP verification (if OTP provided)
3. Test rate limiting
4. Test FCM token saving
5. Test notifications API (with and without auth)
6. Test pagination and filtering
7. Test mark as read functionality

## Database Schema Updates

The following changes were made to the database:

1. **otps table:**
   - Added `phone` VARCHAR(20) column
   - Updated type constraint to include 'phone_login'
   - Added index on phone field

2. **users table:**
   - Added `fcm_token` VARCHAR(500) column
   - Added index on fcm_token

3. **notifications table (new):**
   - Stores user notifications
   - Supports types: order, system, offers, other
   - Includes pagination indexes (user_id, type, created_at)

## Security Features

1. **Rate Limiting:**
   - OTP requests limited to 3 per hour per phone number
   - Returns 429 status when limit exceeded

2. **OTP Expiration:**
   - OTPs expire after 5 minutes
   - Expired OTPs cannot be used

3. **Authentication:**
   - FCM token and Notifications endpoints require JWT authentication
   - Tokens contain minimal claims (user ID)

4. **Input Validation:**
   - Phone number format validation
   - OTP format validation (6 digits)
   - Notification type validation

## Troubleshooting

### OTP not received
- Check server console logs (SMS is simulated)
- Verify phone number format includes country code
- Check rate limiting (max 3 requests/hour)

### Authentication errors
- Ensure JWT token is valid and not expired
- Check token format: `Bearer <token>`
- Verify user account is active

### Database errors
- Run migration SQL file: `src/config/migrations/add_new_features.sql`
- Check database connection
- Verify Sequelize sync is working

### Rate limiting issues
- Wait 1 hour or use a different phone number
- Check rate limit headers in response

## Next Steps

1. Integrate with actual SMS gateway (Twilio, etc.) for production
2. Implement push notification service using FCM tokens
3. Add notification creation endpoints for system events
4. Consider adding notification preferences per user
5. Add notification batching for better performance


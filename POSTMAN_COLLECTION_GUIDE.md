# Postman Collection Guide

## 📦 Available Collections

### 1. **JWALA_API_POSTMAN_COLLECTION.json** (Main Collection - Updated)
   - **Location**: `/Users/mostafa/Desktop/jawlahapp/JWALA_API_POSTMAN_COLLECTION.json`
   - **Description**: Complete API collection including all existing endpoints PLUS the new features:
     - Phone Number Login (OTP-Based)
     - FCM Token Management
     - Notifications API
   - **Version**: 2.0.0

### 2. **NEW_FEATURES_POSTMAN_COLLECTION.json** (Standalone Collection)
   - **Location**: `/Users/mostafa/Desktop/jawlahapp/NEW_FEATURES_POSTMAN_COLLECTION.json`
   - **Description**: Standalone collection with only the new features (Phone Login, FCM Token, Notifications)
   - **Version**: 2.0.0
   - **Use Case**: If you only want to test the new features separately

---

## 🚀 How to Import into Postman

### Method 1: Import Main Collection (Recommended)
1. Open Postman
2. Click **Import** button (top left)
3. Select **File** tab
4. Choose `JWALA_API_POSTMAN_COLLECTION.json`
5. Click **Import**

### Method 2: Import Standalone Collection
1. Open Postman
2. Click **Import** button
3. Select **File** tab
4. Choose `NEW_FEATURES_POSTMAN_COLLECTION.json`
5. Click **Import**

---

## ⚙️ Collection Variables

After importing, configure these variables in Postman:

### Base Configuration
- **`baseUrl`**: 
  - Local: `http://localhost:5000`
  - Production: `https://jawlahapp-prod-lasv5kqqi-mostafadbaghs-projects.vercel.app`

### Authentication
- **`accessToken`**: (Auto-populated after login)
- **`refreshToken`**: (Auto-populated after login)

### Phone Login
- **`phone`**: Your phone number (e.g., `+1234567890`)
- **`otp`**: OTP code received (check server logs)

### FCM Token
- **`fcmToken`**: Firebase Cloud Messaging token (e.g., `firebase-generated-token-string`)

### Notifications
- **`notificationId`**: (Auto-populated from Get Notifications response)

---

## 📋 New API Endpoints Added

### 1. Phone Number Login (OTP-Based)

#### Request OTP for Phone Login
- **Method**: `POST`
- **Endpoint**: `/api/v1/auth/request-otp-login`
- **Auth**: Not required
- **Body**:
  ```json
  {
    "phone": "+1234567890"
  }
  ```
- **Rate Limit**: 3 requests per hour per phone number

#### Verify OTP and Login
- **Method**: `POST`
- **Endpoint**: `/api/v1/auth/verify-otp-login`
- **Auth**: Not required
- **Body**:
  ```json
  {
    "phone": "+1234567890",
    "otp": "123456"
  }
  ```
- **Note**: Access token is automatically saved to `accessToken` variable

---

### 2. FCM Token Management

#### Save FCM Token
- **Method**: `POST`
- **Endpoint**: `/api/v1/users/fcm-token`
- **Auth**: Required (Bearer token)
- **Body**:
  ```json
  {
    "fcm_token": "firebase-generated-token-string"
  }
  ```

---

### 3. Notifications API

#### Get Notifications
- **Method**: `GET`
- **Endpoint**: `/api/v1/notifications`
- **Auth**: Required (Bearer token)
- **Query Parameters**:
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Items per page (default: 10, max: 50)
  - `type` (optional): Filter by type (`order`, `system`, `offers`, `other`)

#### Mark Notification as Read
- **Method**: `PATCH`
- **Endpoint**: `/api/v1/notifications/:notificationId/mark-read`
- **Auth**: Required (Bearer token)
- **Path Parameter**: `notificationId` (UUID)

---

## 🧪 Testing Workflow

### Complete Phone Login Flow

1. **Request OTP**
   - Go to: `Authentication` → `Request OTP for Phone Login`
   - Set `phone` variable: `+1234567890`
   - Send request
   - Check server logs for OTP (currently simulated)

2. **Verify OTP**
   - Go to: `Authentication` → `Verify OTP and Login`
   - Set `otp` variable with the OTP from server logs
   - Send request
   - Access token is automatically saved to collection variables

3. **Save FCM Token**
   - Go to: `Users` → `Save FCM Token`
   - Set `fcmToken` variable
   - Send request (uses saved access token)

4. **Get Notifications**
   - Go to: `Notifications` → `Get Notifications`
   - Send request (uses saved access token)
   - Notification IDs are automatically saved for "Mark as Read" requests

---

## 🔧 Postman Features Used

### Automatic Token Management
- The `Verify OTP and Login` request includes a test script that automatically saves the access token to collection variables
- All protected endpoints use `{{accessToken}}` variable automatically

### Test Scripts
- Status code validation
- Response structure validation
- Automatic variable saving
- Console logging for debugging

### Collection-Level Authentication
- Bearer token authentication is set at collection level
- All protected endpoints inherit this authentication
- Token is managed via `{{accessToken}}` variable

---

## 📝 Notes

1. **OTP Simulation**: Currently, OTPs are logged to the server console. Check your server logs to get the OTP code for testing.

2. **Rate Limiting**: Phone OTP requests are limited to 3 per hour per phone number. If you hit the limit, wait or use a different phone number.

3. **Token Auto-Save**: After successful phone login, the access token is automatically saved. You don't need to manually copy it.

4. **Environment Variables**: Consider creating Postman environments (Development, Production) for easier switching between base URLs.

---

## 🐛 Troubleshooting

### "Access token is required" Error
- Make sure you've completed the phone login flow first
- Check that `accessToken` variable is set in the collection
- Verify the token hasn't expired

### "Invalid OTP" Error
- Check server logs for the actual OTP
- Ensure OTP hasn't expired (5 minutes)
- Make sure you're using the correct phone number

### "Rate limit exceeded" Error
- Wait for the rate limit window to reset (1 hour)
- Or use a different phone number for testing

### "Notification not found" Error
- Make sure you're using a valid notification ID
- The notification must belong to the authenticated user

---

## 📚 Additional Resources

- **API Documentation**: See `COMPLETE_API_DOCUMENTATION.md`
- **Testing Guide**: See `TESTING_GUIDE.md`
- **Implementation Summary**: See `IMPLEMENTATION_SUMMARY.md`

---

## ✅ Quick Start Checklist

- [ ] Import collection into Postman
- [ ] Set `baseUrl` variable (local or production)
- [ ] Set `phone` variable with your test phone number
- [ ] Request OTP for phone login
- [ ] Check server logs for OTP
- [ ] Verify OTP and login (token auto-saved)
- [ ] Test FCM token save endpoint
- [ ] Test notifications endpoints
- [ ] Test mark notification as read

---

**Happy Testing! 🚀**


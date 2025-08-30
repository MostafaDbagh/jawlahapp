# 🚀 Jwalah App API Documentation

Complete API reference with examples for all endpoints, authentication, and usage instructions.

## 📋 Table of Contents

- [Authentication](#authentication)
- [Base URL & Headers](#base-url--headers)
- [API Endpoints](#api-endpoints)
- [Error Responses](#error-responses)
- [Testing Examples](#testing-examples)

## 🔐 Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your_access_token>
```

## 🌐 Base URL & Headers

**Base URL:** `http://localhost:3000`

**Common Headers:**
```http
Content-Type: application/json
Authorization: Bearer <token>  # For protected routes
```

## 📡 API Endpoints

### 1. Health Check

#### GET `/health`
Check server status and uptime.

**Request:**
```bash
curl -X GET http://localhost:3000/health
```

**Response:**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600.5
}
```

---

### 2. User Registration

#### POST `/api/v1/auth/register`
Create a new user account.

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "phone_number": "+1234567890",
    "password_hash": "SecurePass123",
    "account_type": "CUSTOMER"
  }'
```

**Request Body:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "phone_number": "+1234567890",
  "password_hash": "SecurePass123",
  "account_type": "CUSTOMER"
}
```

**Response (Success - 201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "john_doe",
      "email": "john@example.com",
      "phone_number": "+1234567890",
      "account_type": "CUSTOMER",
      "is_active": true,
      "is_verified": false,
      "email_verified": false,
      "phone_verified": false,
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "otpSent": true
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "username",
      "message": "Username can only contain letters, numbers, and underscores"
    }
  ]
}
```

---

### 3. User Login

#### POST `/api/v1/auth/login`
Authenticate user and get access tokens.

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password_hash": "SecurePass123"
  }'
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "password_hash": "SecurePass123"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "john_doe",
      "email": "john@example.com",
      "phone_number": "+1234567890",
      "account_type": "CUSTOMER",
      "is_active": true,
      "is_verified": false,
      "email_verified": false,
      "phone_verified": false,
      "last_login": "2024-01-15T10:35:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Response (Error - 401):**
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

---

### 4. Request Password Reset

#### POST `/api/v1/auth/request-password-reset`
Send OTP for password reset.

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/request-password-reset \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com"
  }'
```

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Password reset OTP sent to your email"
}
```

**Response (Error - 404):**
```json
{
  "success": false,
  "message": "User not found"
}
```

---

### 5. Reset Password

#### POST `/api/v1/auth/reset-password`
Reset password using OTP.

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "otp": "123456",
    "newPassword": "NewSecurePass123"
  }'
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "otp": "123456",
  "newPassword": "NewSecurePass123"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "message": "OTP has expired"
}
```

---

### 6. Verify OTP

#### POST `/api/v1/auth/verify-otp`
Verify OTP for various purposes.

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "otp": "123456",
    "type": "email_verification"
  }'
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "otp": "123456",
  "type": "email_verification"
}
```

**OTP Types:**
- `email_verification` - Verify email address
- `phone_verification` - Verify phone number
- `password_reset` - Reset password

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "user": {
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "john_doe",
      "email": "john@example.com",
      "email_verified": true,
      "is_verified": false
    }
  }
}
```

---

### 7. Resend OTP

#### POST `/api/v1/auth/resend-otp`
Resend OTP if expired or not received.

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/resend-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "type": "email_verification"
  }'
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "type": "email_verification"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "OTP resent successfully"
}
```

---

### 8. Refresh Token

#### POST `/api/v1/auth/refresh-token`
Get new access token using refresh token.

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 9. Get User Profile

#### GET `/api/v1/auth/profile`
Get current user's profile (Protected Route).

**Request:**
```bash
curl -X GET http://localhost:3000/api/v1/auth/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "john_doe",
      "email": "john@example.com",
      "phone_number": "+1234567890",
      "account_type": "CUSTOMER",
      "is_active": true,
      "is_verified": false,
      "email_verified": false,
      "phone_verified": false,
      "profile_image": null,
      "preferred_language": "ar",
      "timezone": "Asia/Dubai",
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:35:00.000Z"
    }
  }
}
```

**Response (Error - 401):**
```json
{
  "success": false,
  "message": "Access token is required"
}
```

---

### 10. Update User Profile

#### PUT `/api/v1/auth/profile`
Update current user's profile (Protected Route).

**Request:**
```bash
curl -X PUT http://localhost:3000/api/v1/auth/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_updated",
    "phone_number": "+1987654321",
    "profile_image": "https://example.com/avatar.jpg",
    "preferred_language": "en",
    "timezone": "America/New_York"
  }'
```

**Request Body:**
```json
{
  "username": "john_updated",
  "phone_number": "+1987654321",
  "profile_image": "https://example.com/avatar.jpg",
  "preferred_language": "en",
  "timezone": "America/New_York"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "john_updated",
      "phone_number": "+1987654321",
      "profile_image": "https://example.com/avatar.jpg",
      "preferred_language": "en",
      "timezone": "America/New_York"
    }
  }
}
```

---

### 11. User Logout

#### POST `/api/v1/auth/logout`
Logout current user (Protected Route).

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 12. Email Verification

#### POST `/api/v1/auth/verify-email`
Verify email address using OTP.

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "otp": "123456",
    "type": "email_verification"
  }'
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "otp": "123456",
  "type": "email_verification"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "user": {
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "email_verified": true,
      "is_verified": false
    }
  }
}
```

---

## ❌ Error Responses

### Common Error Status Codes

| Status | Description |
|--------|-------------|
| 400 | Bad Request - Validation errors |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 423 | Locked - Account temporarily locked |
| 500 | Internal Server Error |

### Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "field_name",
      "message": "Field-specific error message"
    }
  ],
  "error": "Technical error details (development only)"
}
```

---

## 🧪 Testing Examples

### Using cURL

#### 1. Complete User Registration Flow
```bash
# 1. Register user
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_user",
    "email": "test@example.com",
    "phone_number": "+1234567890",
    "password_hash": "TestPass123",
    "account_type": "CUSTOMER"
  }'

# 2. Login to get tokens
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password_hash": "TestPass123"
  }'

# 3. Get profile (using token from login)
curl -X GET http://localhost:3000/api/v1/auth/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

#### 2. Password Reset Flow
```bash
# 1. Request password reset
curl -X POST http://localhost:3000/api/v1/auth/request-password-reset \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'

# 2. Check email for OTP and reset password
curl -X POST http://localhost:3000/api/v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "otp": "123456",
    "newPassword": "NewTestPass123"
  }'
```

### Using JavaScript/Fetch

#### 1. User Registration
```javascript
const registerUser = async (userData) => {
  try {
    const response = await fetch('http://localhost:3000/api/v1/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData)
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('User registered:', data.data.user);
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
    } else {
      console.error('Registration failed:', data.message);
    }
  } catch (error) {
    console.error('Error:', error);
  }
};

// Usage
registerUser({
  username: 'john_doe',
  email: 'john@example.com',
  phone_number: '+1234567890',
  password_hash: 'SecurePass123',
  account_type: 'CUSTOMER'
});
```

#### 2. Protected API Call
```javascript
const getProfile = async () => {
  try {
    const token = localStorage.getItem('accessToken');
    
    const response = await fetch('http://localhost:3000/api/v1/auth/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    
    if (response.status === 401) {
      // Token expired, try to refresh
      await refreshToken();
      return getProfile(); // Retry
    }
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Profile:', data.data.user);
    } else {
      console.error('Failed to get profile:', data.message);
    }
  } catch (error) {
    console.error('Error:', error);
  }
};

const refreshToken = async () => {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    
    const response = await fetch('http://localhost:3000/api/v1/auth/refresh-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken })
    });
    
    const data = await response.json();
    
    if (data.success) {
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
    } else {
      // Redirect to login
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    }
  } catch (error) {
    console.error('Error refreshing token:', error);
  }
};
```

### Using Postman

#### 1. Environment Variables
Set up these variables in Postman:
- `base_url`: `http://localhost:3000`
- `access_token`: (will be set after login)
- `refresh_token`: (will be set after login)

#### 2. Collection Setup
Create a collection with these requests:

**Register User:**
- Method: `POST`
- URL: `{{base_url}}/api/v1/auth/register`
- Body (raw JSON):
```json
{
  "username": "test_user",
  "email": "test@example.com",
  "phone_number": "+1234567890",
  "password_hash": "TestPass123",
  "account_type": "CUSTOMER"
}
```

**Login:**
- Method: `POST`
- URL: `{{base_url}}/api/v1/auth/login`
- Body (raw JSON):
```json
{
  "email": "test@example.com",
  "password_hash": "TestPass123"
}
```
- Tests (to auto-save tokens):
```javascript
if (pm.response.code === 200) {
  const data = pm.response.json();
  pm.environment.set('access_token', data.data.accessToken);
  pm.environment.set('refresh_token', data.data.refreshToken);
}
```

**Get Profile:**
- Method: `GET`
- URL: `{{base_url}}/api/v1/auth/profile`
- Headers: `Authorization: Bearer {{access_token}}`

---

## 🔧 Development Tips

### 1. Testing OTP
- OTPs are sent to the email address provided
- OTPs expire after 5 minutes
- Maximum 3 attempts per OTP
- Check console logs for OTP values in development

### 2. Token Management
- Access tokens expire in 15 minutes
- Refresh tokens expire in 7 days
- Always handle 401 responses by refreshing tokens

### 3. Validation Rules
- Username: 3-50 characters, alphanumeric + underscore
- Password: Minimum 6 characters, must include uppercase, lowercase, and number
- Phone: Valid international format
- Email: Valid email format

### 4. Account Types
Available account types:
- `CUSTOMER` - End users
- `DRIVER` - Delivery personnel
- `SERVICE_PROVIDER_OWNER` - Restaurant/Store owner
- `SERVICE_PROVIDER_ADMIN` - Restaurant/Store manager
- `PLATFORM_OWNER` - System owner
- `PLATFORM_ADMIN` - System administrator
- `CUSTOMER_SERVICE` - Support staff

---

## 📱 Frontend Integration

### React Example
```jsx
import { useState, useEffect } from 'react';

const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = async (email, password) => {
    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password_hash: password })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setUser(data.data.user);
        localStorage.setItem('accessToken', data.data.accessToken);
        return { success: true };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      return { success: false, message: 'Network error' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('accessToken');
  };

  return { user, login, logout, loading };
};
```

This comprehensive API documentation covers all endpoints with practical examples for testing and integration!

# Jwalah App API - Developer Documentation

## 🌐 Live API Endpoints

**Base URL:** `https://your-app-url.com` (Replace with your actual deployed URL)

## 🔐 Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Get Access Token
```bash
curl -X POST "https://your-app-url.com/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password_hash": "YourPassword123"
  }'
```

## 📊 Response Format

All API responses follow this standardized format:
```json
{
  "status": boolean,      // true for success, false for error
  "data": dynamic,        // response data or null
  "message": string,      // success/error message
  "count": number         // number of items returned
}
```

---

## 🏷️ Category Management API

### Get All Categories
```bash
curl -X GET "https://your-app-url.com/api/v1/categories"
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10, max: 100)
- `search` (string): Search by category name

**Example:**
```bash
curl -X GET "https://your-app-url.com/api/v1/categories?page=1&limit=5&search=electronics"
```

### Get Category by ID
```bash
curl -X GET "https://your-app-url.com/api/v1/categories/{category-id}"
```

### Create Category (Auth Required)
```bash
curl -X POST "https://your-app-url.com/api/v1/categories" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Electronics",
    "image": "https://example.com/image.jpg",
    "has_offer": 0.15,
    "free_delivery": true
  }'
```

### Update Category (Auth Required)
```bash
curl -X PUT "https://your-app-url.com/api/v1/categories/{category-id}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Electronics & Gadgets",
    "has_offer": 0.25
  }'
```

### Delete Category (Auth Required)
```bash
curl -X DELETE "https://your-app-url.com/api/v1/categories/{category-id}" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🏪 Vendor Management API

### Get All Vendors
```bash
curl -X GET "https://your-app-url.com/api/v1/vendors"
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10, max: 100)
- `search` (string): Search by vendor name or description
- `min_rating` (number): Minimum rating filter
- `location` (string): Location filter (lat,lng,radius_km)
- `sort` (string): Sort order (rating, distance, id)

**Examples:**
```bash
# Basic request
curl -X GET "https://your-app-url.com/api/v1/vendors"

# Search with filters
curl -X GET "https://your-app-url.com/api/v1/vendors?search=restaurant&min_rating=4.0&sort=rating"

# Location-based search
curl -X GET "https://your-app-url.com/api/v1/vendors?location=40.7128,-74.0060,5"
```

### Get Vendor by ID
```bash
curl -X GET "https://your-app-url.com/api/v1/vendors/{vendor-id}"
```

### Get Popular Vendors
```bash
curl -X GET "https://your-app-url.com/api/v1/vendors/popular?limit=5"
```

### Get Nearby Vendors
```bash
curl -X GET "https://your-app-url.com/api/v1/vendors/nearby?lat=40.7128&lng=-74.0060&radius_km=5"
```

### Create Vendor (Auth Required)
```bash
curl -X POST "https://your-app-url.com/api/v1/vendors" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Pizza Palace",
    "image": "https://example.com/pizza-palace.jpg",
    "about": "Best pizza in town with fresh ingredients",
    "work_time": {
      "mon": "09:00-22:00",
      "tue": "09:00-22:00",
      "wed": "09:00-22:00",
      "thu": "09:00-22:00",
      "fri": "09:00-23:00",
      "sat": "10:00-23:00",
      "sun": "10:00-21:00"
    },
    "location": {
      "lat": 40.7128,
      "lng": -74.0060,
      "city": "New York"
    }
  }'
```

### Update Vendor (Auth Required)
```bash
curl -X PUT "https://your-app-url.com/api/v1/vendors/{vendor-id}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Pizza Palace Updated",
    "about": "Updated description",
    "rating": 4.5
  }'
```

### Delete Vendor (Auth Required)
```bash
curl -X DELETE "https://your-app-url.com/api/v1/vendors/{vendor-id}" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 👤 User Authentication API

### Register User
```bash
curl -X POST "https://your-app-url.com/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "phone_number": "+1234567890",
    "password_hash": "SecurePass123"
  }'
```

### Login User
```bash
curl -X POST "https://your-app-url.com/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password_hash": "SecurePass123"
  }'
```

### Logout User (Auth Required)
```bash
curl -X POST "https://your-app-url.com/api/v1/auth/logout" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🚨 Error Responses

### Validation Error (400)
```json
{
  "status": false,
  "data": null,
  "message": "Validation failed",
  "errors": [
    {
      "field": "name",
      "message": "Name is required"
    }
  ],
  "count": 1
}
```

### Unauthorized (401)
```json
{
  "status": false,
  "data": null,
  "message": "Access token is required",
  "count": 0
}
```

### Not Found (404)
```json
{
  "status": false,
  "data": null,
  "message": "Resource not found",
  "count": 0
}
```

### Conflict (409)
```json
{
  "status": false,
  "data": null,
  "message": "Resource already exists",
  "count": 0
}
```

---

## 📝 Data Models

### Category Model
```json
{
  "id": "uuid",
  "name": "string (required, 1-255 chars)",
  "image": "string (optional, valid URL)",
  "has_offer": "decimal (optional, 0-1)",
  "free_delivery": "boolean (optional)",
  "created_at": "datetime"
}
```

### Vendor Model
```json
{
  "id": "uuid",
  "name": "string (required, 1-255 chars)",
  "image": "string (optional, valid URL)",
  "about": "string (optional, max 2000 chars)",
  "work_time": "object (optional, working hours)",
  "location": "object (optional, lat/lng coordinates)",
  "subscript_date": "datetime (optional)",
  "is_active": "boolean (default: true)",
  "rating": "decimal (0.00-5.00)",
  "created_at": "datetime"
}
```

### Work Time Format
```json
{
  "mon": "09:00-22:00",
  "tue": "09:00-22:00",
  "wed": "09:00-22:00",
  "thu": "09:00-22:00",
  "fri": "09:00-23:00",
  "sat": "10:00-23:00",
  "sun": "10:00-21:00"
}
```

### Location Format
```json
{
  "lat": 40.7128,
  "lng": -74.0060,
  "city": "New York"
}
```

---

## 🧪 Testing Examples

### Complete Workflow Example
```bash
# 1. Register a new user
curl -X POST "https://your-app-url.com/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password_hash": "TestPass123"
  }'

# 2. Login to get token
curl -X POST "https://your-app-url.com/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password_hash": "TestPass123"
  }'

# 3. Use token to create a category
curl -X POST "https://your-app-url.com/api/v1/categories" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": "Test Category",
    "has_offer": 0.10
  }'

# 4. Create a vendor
curl -X POST "https://your-app-url.com/api/v1/vendors" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": "Test Vendor",
    "about": "Test vendor description"
  }'

# 5. Get all categories (public endpoint)
curl -X GET "https://your-app-url.com/api/v1/categories"

# 6. Get all vendors (public endpoint)
curl -X GET "https://your-app-url.com/api/v1/vendors"
```

---

## 🔧 Integration Examples

### JavaScript/Fetch
```javascript
// Get all vendors
const response = await fetch('https://your-app-url.com/api/v1/vendors');
const data = await response.json();
console.log(data);

// Create vendor with authentication
const token = 'your-jwt-token';
const response = await fetch('https://your-app-url.com/api/v1/vendors', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    name: 'New Vendor',
    about: 'Vendor description'
  })
});
const result = await response.json();
```

### Python/Requests
```python
import requests

# Get all categories
response = requests.get('https://your-app-url.com/api/v1/categories')
data = response.json()
print(data)

# Create category with authentication
token = 'your-jwt-token'
headers = {
    'Content-Type': 'application/json',
    'Authorization': f'Bearer {token}'
}
data = {
    'name': 'New Category',
    'has_offer': 0.15
}
response = requests.post('https://your-app-url.com/api/v1/categories', 
                        headers=headers, json=data)
result = response.json()
```

---

## 📞 Support

For API support and questions:
- Check the health endpoint: `GET /health`
- Review error messages in responses
- Ensure proper authentication for protected endpoints
- Validate request data format

**API Version:** v1  
**Last Updated:** 2025-01-08

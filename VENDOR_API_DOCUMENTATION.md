nof# Vendor Management API Documentation

## Overview
The Vendor Management API provides comprehensive functionality for managing vendors (service providers/sellers) in the system. It includes public endpoints for browsing vendors and protected endpoints for vendor management operations.

## Base URL
```
http://localhost:5000/api/v1/vendors
```

## Vendor Data Model

### Vendor Attributes
| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `id` | UUID | Unique identifier | Auto-generated |
| `name` | String(255) | Vendor's business or display name | Yes |
| `image` | String(500) | Profile image URL | No |
| `about` | Text | Description or bio of the vendor | No |
| `work_time` | JSON | Working hours (e.g., `{"mon": "09:00-18:00", "tue": "10:00-20:00"}`) | No |
| `location` | JSON | Location object `{lat: Double, lng: Double, city: String}` | No |
| `subscript_date` | DateTime | Subscription start date | No |
| `is_active` | Boolean | Whether the vendor is currently active | No (default: true) |
| `created_at` | DateTime | Timestamp of creation | Auto-generated |
| `rating` | Decimal(3,2) | Average rating (0.00-5.00) | No (default: 0.00) |

### Work Time Format
```json
{
  "mon": "09:00-18:00",
  "tue": "10:00-20:00",
  "wed": "09:00-18:00",
  "thu": "10:00-20:00",
  "fri": "09:00-18:00",
  "sat": "10:00-16:00",
  "sun": "closed"
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

## Public Endpoints (No Authentication Required)

### 1. Get All Vendors
**GET** `/vendors`

Retrieves a paginated list of all vendors with filtering, searching, and sorting capabilities.

#### Query Parameters
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `page` | number | Page number (default: 1) | `?page=1` |
| `limit` | number | Items per page (default: 10, max: 100) | `?limit=20` |
| `search` | string | Search by vendor name or description | `?search=restaurant` |
| `category_id` | string | Filter by main category | `?category_id=cat-123` |
| `sub_category_id` | string | Filter by sub-category | `?sub_category_id=sub-456` |
| `min_rating` | number | Minimum rating filter | `?min_rating=4.0` |
| `location` | string | Location filter (lat,lng,radius_km) | `?location=40.7128,-74.0060,5` |
| `free_delivery` | boolean | Show only vendors with free delivery | `?free_delivery=true` |
| `has_offer` | boolean | Show only vendors with active offers | `?has_offer=true` |
| `sort` | string | Sort order (see sort options below) | `?sort=rating` |

#### Sort Options
- `rating` or `rating (desc)` - Sort by rating (highest first)
- `delivery_fee` - Sort by delivery fee
- `min_order` - Sort by minimum order amount
- `delivery_time` - Sort by delivery time
- `distance` - Sort by distance (nearest first) - requires location
- `offers_count` - Sort by number of offers
- `id` or `id (creation order)` - Sort by creation date (newest first)

#### Example Request
```bash
curl -X GET "http://localhost:5000/api/v1/vendors?page=1&limit=10&search=restaurant&min_rating=4.0&sort=rating"
```

#### Success Response (200)
```json
{
  "status": true,
  "data": [
    {
      "id": "vendor-uuid-123",
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
      },
      "is_active": true,
      "rating": 4.5,
      "created_at": "2025-01-01T00:00:00.000Z",
      "distance": 2.3
    }
  ],
  "message": "Vendors retrieved successfully",
  "count": 1
}
```

### 2. Get Vendor by ID
**GET** `/vendors/{id}`

Retrieves detailed information about a specific vendor.

#### Example Request
```bash
curl -X GET "http://localhost:5000/api/v1/vendors/vendor-uuid-123"
```

#### Success Response (200)
```json
{
  "status": true,
  "data": {
    "id": "vendor-uuid-123",
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
    },
    "is_active": true,
    "rating": 4.5,
    "created_at": "2025-01-01T00:00:00.000Z",
    "subscription_active": true
  },
  "message": "Vendor retrieved successfully",
  "count": 1
}
```

#### Error Response (404)
```json
{
  "status": false,
  "data": null,
  "message": "Vendor not found",
  "count": 0
}
```

### 3. Get Popular Vendors
**GET** `/vendors/popular`

Retrieves a list of the most popular vendors (rating >= 4.0).

#### Query Parameters
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `limit` | number | Number of vendors to return | 10 |

#### Example Request
```bash
curl -X GET "http://localhost:5000/api/v1/vendors/popular?limit=5"
```

#### Success Response (200)
```json
{
  "status": true,
  "data": [
    {
      "id": "vendor-uuid-123",
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
      },
      "is_active": true,
      "rating": 4.8,
      "created_at": "2025-01-01T00:00:00.000Z"
    }
  ],
  "message": "Popular vendors retrieved successfully",
  "count": 1
}
```

### 4. Get Nearby Vendors
**GET** `/vendors/nearby`

Retrieves vendors located near a specified geographical location.

#### Query Parameters
| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| `lat` | number | Latitude | Yes |
| `lng` | number | Longitude | Yes |
| `radius_km` | number | Search radius in kilometers | No (default: 10) |

#### Example Request
```bash
curl -X GET "http://localhost:5000/api/v1/vendors/nearby?lat=40.7128&lng=-74.0060&radius_km=5"
```

#### Success Response (200)
```json
{
  "status": true,
  "data": [
    {
      "id": "vendor-uuid-123",
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
      },
      "is_active": true,
      "rating": 4.5,
      "created_at": "2025-01-01T00:00:00.000Z",
      "distance": 2.3
    }
  ],
  "message": "Nearby vendors retrieved successfully",
  "count": 1
}
```

#### Error Response (400)
```json
{
  "status": false,
  "data": null,
  "message": "Latitude and longitude are required",
  "count": 0
}
```

---

## Protected Endpoints (Requires Authentication)

### 5. Create Vendor (Admin Only)
**POST** `/vendors`

Creates a new vendor profile. Requires admin authentication.

#### Headers
```
Content-Type: application/json
Authorization: Bearer YOUR_ACCESS_TOKEN
```

#### Request Body
```json
{
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
  },
  "subscript_date": "2025-01-01T00:00:00.000Z"
}
```

#### Example Request
```bash
curl -X POST "http://localhost:5000/api/v1/vendors" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
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

#### Success Response (201)
```json
{
  "status": true,
  "data": {
    "id": "vendor-uuid-123",
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
    },
    "is_active": true,
    "rating": 0.00,
    "created_at": "2025-01-01T00:00:00.000Z"
  },
  "message": "Vendor created successfully",
  "count": 1
}
```

#### Error Responses
- **400**: Validation errors
- **401**: Unauthorized (missing/invalid token)
- **409**: Vendor name already exists

### 6. Update Vendor
**PUT** `/vendors/{id}`

Updates an existing vendor's information.

#### Headers
```
Content-Type: application/json
Authorization: Bearer YOUR_ACCESS_TOKEN
```

#### Request Body (All fields optional)
```json
{
  "name": "Pizza Palace Updated",
  "about": "Updated description",
  "work_time": {
    "mon": "10:00-21:00",
    "tue": "10:00-21:00",
    "wed": "10:00-21:00",
    "thu": "10:00-21:00",
    "fri": "10:00-22:00",
    "sat": "11:00-22:00",
    "sun": "11:00-20:00"
  },
  "location": {
    "lat": 40.7200,
    "lng": -74.0100,
    "city": "New York"
  },
  "is_active": true,
  "rating": 4.5
}
```

#### Example Request
```bash
curl -X PUT "http://localhost:5000/api/v1/vendors/vendor-uuid-123" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "Pizza Palace Updated",
    "about": "Updated description",
    "rating": 4.5
  }'
```

#### Success Response (200)
```json
{
  "status": true,
  "data": {
    "id": "vendor-uuid-123",
    "name": "Pizza Palace Updated",
    "image": "https://example.com/pizza-palace.jpg",
    "about": "Updated description",
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
    },
    "is_active": true,
    "rating": 4.5,
    "created_at": "2025-01-01T00:00:00.000Z"
  },
  "message": "Vendor updated successfully",
  "count": 1
}
```

#### Error Responses
- **400**: Validation errors
- **401**: Unauthorized
- **404**: Vendor not found
- **409**: Vendor name already exists

### 7. Delete Vendor (Admin Only)
**DELETE** `/vendors/{id}`

Soft deletes a vendor by setting `is_active` to false.

#### Headers
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

#### Example Request
```bash
curl -X DELETE "http://localhost:5000/api/v1/vendors/vendor-uuid-123" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Success Response (200)
```json
{
  "status": true,
  "data": null,
  "message": "Vendor deactivated successfully",
  "count": 0
}
```

#### Error Responses
- **401**: Unauthorized
- **404**: Vendor not found

### 8. Block Vendor (Admin Only)
**POST** `/vendors/{id}/block`

Blocks a vendor from the platform.

#### Headers
```
Content-Type: application/json
Authorization: Bearer YOUR_ACCESS_TOKEN
```

#### Request Body
```json
{
  "reason": "Violation of platform policies"
}
```

#### Example Request
```bash
curl -X POST "http://localhost:5000/api/v1/vendors/vendor-uuid-123/block" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "reason": "Violation of platform policies"
  }'
```

#### Success Response (200)
```json
{
  "status": true,
  "data": null,
  "message": "Vendor blocked successfully: Violation of platform policies",
  "count": 0
}
```

#### Error Responses
- **401**: Unauthorized
- **404**: Vendor not found

### 9. Get Expired Subscription Vendors (Admin Only)
**GET** `/vendors/expired-subscription`

Retrieves vendors with expired subscriptions for administrative monitoring.

#### Headers
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

#### Query Parameters
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `page` | number | Page number | 1 |
| `limit` | number | Items per page | 10 |

#### Example Request
```bash
curl -X GET "http://localhost:5000/api/v1/vendors/expired-subscription?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Success Response (200)
```json
{
  "status": true,
  "data": [
    {
      "id": "vendor-uuid-123",
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
      },
      "is_active": true,
      "rating": 4.5,
      "created_at": "2025-01-01T00:00:00.000Z",
      "subscription_expired": true,
      "subscript_date": "2024-01-01T00:00:00.000Z"
    }
  ],
  "message": "Expired subscription vendors retrieved successfully",
  "count": 1
}
```

---

## Validation Rules

### Vendor Creation
- `name`: Required, string, 1-255 characters, unique
- `image`: Optional, string, valid URL format
- `about`: Optional, string, max 2000 characters
- `work_time`: Optional, object with valid day-time format
- `location`: Optional, object with valid lat/lng coordinates
- `subscript_date`: Optional, valid ISO 8601 date

### Vendor Update
- `name`: Optional, string, 1-255 characters, unique (excluding current vendor)
- `image`: Optional, string, valid URL format
- `about`: Optional, string, max 2000 characters
- `work_time`: Optional, object with valid day-time format
- `location`: Optional, object with valid lat/lng coordinates
- `subscript_date`: Optional, valid ISO 8601 date
- `is_active`: Optional, boolean
- `rating`: Optional, decimal between 0 and 5

---

## Error Responses

### Validation Error (400)
```json
{
  "status": false,
  "data": null,
  "message": "Validation failed",
  "errors": [
    {
      "field": "name",
      "message": "Vendor name is required"
    },
    {
      "field": "work_time.mon",
      "message": "Invalid time format for mon: 25:00-26:00. Use format HH:MM-HH:MM"
    }
  ],
  "count": 2
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
  "message": "Vendor not found",
  "count": 0
}
```

### Conflict (409)
```json
{
  "status": false,
  "data": null,
  "message": "Vendor name already exists",
  "count": 0
}
```

---

## Authentication

### Getting Access Token
First, login to get an access token:

```bash
curl -X POST "http://localhost:5000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password_hash": "AdminPass123"
  }'
```

Then use the `accessToken` from the response in the `Authorization` header for protected endpoints.

---

## Response Format

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

## Developer Notes & Best Practices

1. **UUIDs**: All vendor IDs use UUID format for better security and uniqueness
2. **Soft Deletes**: Vendors are soft-deleted (is_active = false) rather than hard-deleted
3. **Pagination**: All list endpoints support pagination with page and limit parameters
4. **Location Queries**: Use PostGIS for production location-based queries (currently simplified)
5. **Caching**: Consider caching popular vendors and frequently accessed data
6. **Asynchronous Jobs**: Use background jobs for recalculating ratings and expiring subscriptions
7. **Role-Based Access**: Implement proper RBAC for admin, vendor, and user roles
8. **Consistent Responses**: All endpoints return the same response format structure

---

## Quick Test Commands

### Public Endpoints (No Token Required)
```bash
# Get all vendors
curl -X GET "http://localhost:5000/api/v1/vendors"

# Search vendors
curl -X GET "http://localhost:5000/api/v1/vendors?search=restaurant"

# Get popular vendors
curl -X GET "http://localhost:5000/api/v1/vendors/popular?limit=5"

# Get nearby vendors
curl -X GET "http://localhost:5000/api/v1/vendors/nearby?lat=40.7128&lng=-74.0060&radius_km=5"

# Get vendor by ID
curl -X GET "http://localhost:5000/api/v1/vendors/vendor-uuid-123"
```

### Protected Endpoints (Token Required)
```bash
# First get a token
curl -X POST "http://localhost:5000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password_hash": "AdminPass123"}'

# Then use token for protected operations
curl -X POST "http://localhost:5000/api/v1/vendors" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"name": "Test Vendor", "about": "Test description"}'
```

---

## Postman Collection Variables

```
BASE_URL: http://localhost:5000
API_VERSION: /api/v1
VENDORS_ENDPOINT: {{BASE_URL}}{{API_VERSION}}/vendors
AUTH_TOKEN: (set after login)
```

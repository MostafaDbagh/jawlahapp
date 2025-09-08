# Category Management API Documentation

## Overview
The Category Management API provides endpoints for managing product categories in the JwalahApp system. Categories can have offers, free delivery options, and associated images.

## Base URL
```
http://localhost:5000/api/v1/categories
```

## Authentication
- **Public Endpoints**: GET requests don't require authentication
- **Protected Endpoints**: POST, PUT, DELETE requests require a valid JWT token in the Authorization header
- **Header Format**: `Authorization: Bearer <access_token>`

## Category Model

| Attribute Name | Data Type | Description |
|----------------|-----------|-------------|
| `id` | UUID | Unique identifier |
| `name` | String | Category name (required) |
| `image` | String (URL) | Image URL (nullable) |
| `has_offer` | Decimal | Discount percentage (e.g., 0.15 for 15% off), nullable |
| `free_delivery` | Boolean | Indicates if delivery is free for this category |
| `created_at` | DateTime | Timestamp of creation |

## API Endpoints

### 1. Get All Categories
**GET** `/api/v1/categories`

Retrieve a paginated list of all categories with optional search functionality.

#### Query Parameters
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search categories by name

#### Example Request
```bash
curl -X GET "http://localhost:5000/api/v1/categories?page=1&limit=5&search=Electronics"
```

#### Example Response
```json
{
  "status": true,
  "data": {
    "categories": [
      {
        "id": "1e45ef1c-8afe-4b7d-b66d-63d61c307e83",
        "name": "Electronics & Gadgets",
        "image": "https://example.com/electronics.jpg",
        "has_offer": "0.2500",
        "free_delivery": true,
        "created_at": "2025-09-03T13:05:09.171Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 1,
      "itemsPerPage": 5
    }
  },
  "message": "Categories retrieved successfully",
  "count": 1
}
```

### 2. Get Category by ID
**GET** `/api/v1/categories/{id}`

Retrieve a specific category by its ID.

#### Path Parameters
- `id`: Category UUID

#### Example Request
```bash
curl -X GET "http://localhost:5000/api/v1/categories/1e45ef1c-8afe-4b7d-b66d-63d61c307e83"
```

#### Example Response
```json
{
  "status": true,
  "data": {
    "category": {
      "id": "1e45ef1c-8afe-4b7d-b66d-63d61c307e83",
      "name": "Electronics & Gadgets",
      "image": "https://example.com/electronics.jpg",
      "has_offer": "0.2500",
      "free_delivery": true,
      "created_at": "2025-09-03T13:05:09.171Z"
    }
  },
  "message": "Category retrieved successfully",
  "count": 1
}
```

### 3. Create Category
**POST** `/api/v1/categories`

Create a new category. Requires authentication and admin privileges.

#### Request Body
```json
{
  "name": "Electronics",
  "image": "https://example.com/image.jpg",
  "has_offer": 0.1,
  "free_delivery": true
}
```

#### Field Validation
- `name`: Required, 1-255 characters
- `image`: Optional, must be valid URL
- `has_offer`: Optional, decimal between 0 and 1
- `free_delivery`: Optional, boolean (default: false)

#### Example Request
```bash
curl -X POST "http://localhost:5000/api/v1/categories" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "Electronics",
    "image": "https://example.com/image.jpg",
    "has_offer": 0.15,
    "free_delivery": true
  }'
```

#### Example Response
```json
{
  "status": true,
  "data": {
    "category": {
      "id": "1e45ef1c-8afe-4b7d-b66d-63d61c307e83",
      "name": "Electronics",
      "image": "https://example.com/image.jpg",
      "has_offer": "0.1500",
      "free_delivery": true,
      "created_at": "2025-09-03T13:05:09.171Z"
    }
  },
  "message": "Category created successfully",
  "count": 1
}
```

### 4. Update Category
**PUT** `/api/v1/categories/{id}`

Update an existing category by its ID. All fields are optional; only provided fields will be updated.

#### Path Parameters
- `id`: Category UUID

#### Request Body
```json
{
  "name": "Electronics & Gadgets",
  "has_offer": 0.25
}
```

#### Example Request
```bash
curl -X PUT "http://localhost:5000/api/v1/categories/1e45ef1c-8afe-4b7d-b66d-63d61c307e83" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "Electronics & Gadgets",
    "has_offer": 0.25
  }'
```

#### Example Response
```json
{
  "status": true,
  "data": {
    "category": {
      "id": "1e45ef1c-8afe-4b7d-b66d-63d61c307e83",
      "name": "Electronics & Gadgets",
      "image": "https://example.com/electronics.jpg",
      "has_offer": "0.2500",
      "free_delivery": true,
      "created_at": "2025-09-03T13:05:09.171Z"
    }
  },
  "message": "Category updated successfully",
  "count": 1
}
```

### 5. Delete Category
**DELETE** `/api/v1/categories/{id}`

Delete a category by its ID. Soft delete is recommended to preserve referential integrity.

#### Path Parameters
- `id`: Category UUID

#### Example Request
```bash
curl -X DELETE "http://localhost:5000/api/v1/categories/614e3dfd-1c86-4798-9d33-bb0b970e44ae" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Example Response
```json
{
  "status": true,
  "data": null,
  "message": "Category deleted successfully",
  "count": 0
}
```

## Error Responses

### Validation Error
```json
{
  "status": false,
  "data": [
    {
      "field": "name",
      "message": "Category name is required"
    },
    {
      "field": "image",
      "message": "Image must be a valid URL"
    }
  ],
  "message": "Validation failed",
  "count": 2
}
```

### Not Found Error
```json
{
  "status": false,
  "data": null,
  "message": "Category not found",
  "count": 0
}
```

### Duplicate Name Error
```json
{
  "status": false,
  "data": null,
  "message": "Category with this name already exists",
  "count": 0
}
```

### Authentication Error
```json
{
  "status": false,
  "data": null,
  "message": "Access token is required",
  "count": 0
}
```

## Testing Examples

### 1. Get All Categories
```bash
curl -X GET "http://localhost:5000/api/v1/categories"
```

### 2. Search Categories
```bash
curl -X GET "http://localhost:5000/api/v1/categories?search=Electronics"
```

### 3. Create Category
```bash
curl -X POST "http://localhost:5000/api/v1/categories" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "Electronics",
    "image": "https://example.com/image.jpg",
    "has_offer": 0.15,
    "free_delivery": true
  }'
```

### 4. Update Category
```bash
curl -X PUT "http://localhost:5000/api/v1/categories/CATEGORY_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "Updated Name",
    "has_offer": 0.20
  }'
```

### 5. Delete Category
```bash
curl -X DELETE "http://localhost:5000/api/v1/categories/CATEGORY_ID" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Notes
- All timestamps are in ISO 8601 format
- Decimal values for offers are stored as strings in responses but should be sent as numbers
- Search is case-insensitive and uses partial matching
- Pagination starts from page 1
- Categories are ordered by creation date (newest first)

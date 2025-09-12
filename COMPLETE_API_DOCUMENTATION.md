# Complete API Documentation

## Base URL
- **Local Development**: `http://localhost:5000`
- **Production**: `https://your-vercel-app.vercel.app`

## Response Format
All APIs follow a standardized response format:
```json
{
  "status": boolean,
  "data": dynamic,
  "message": string,
  "count": number
}
```

## Authentication
Most endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## 1. Health Check

### GET /health
Check if the server is running.

**Response:**
```json
{
  "status": true,
  "data": {
    "timestamp": "2025-01-12T10:47:18.197Z",
    "uptime": 123.456,
    "environment": "development"
  },
  "message": "Server is running",
  "count": 1
}
```

---

## 2. Authentication APIs

### POST /api/v1/auth/register
Register a new user.

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "phone_number": "+1234567890",
  "password": "password123"
}
```

**Response:**
```json
{
  "status": true,
  "data": {
    "user": {
      "id": "uuid",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "phone_number": "+1234567890"
    },
    "token": "jwt-token"
  },
  "message": "User registered successfully",
  "count": 1
}
```

### POST /api/v1/auth/login
Login user.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "status": true,
  "data": {
    "user": {
      "id": "uuid",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com"
    },
    "token": "jwt-token"
  },
  "message": "Login successful",
  "count": 1
}
```

---

## 3. Category APIs

### GET /api/v1/categories
Get all categories with pagination.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `search` (optional): Search term

**Response:**
```json
{
  "status": true,
  "data": [
    {
      "id": "uuid",
      "name": "Food & Beverage",
      "image": "https://example.com/image.jpg",
      "is_active": true,
      "created_at": "2025-01-12T10:00:00.000Z",
      "updated_at": "2025-01-12T10:00:00.000Z"
    }
  ],
  "message": "Categories retrieved successfully",
  "count": 1
}
```

### POST /api/v1/categories
Create a new category. **Requires Authentication**

**Request Body:**
```json
{
  "name": "Food & Beverage",
  "image": "https://example.com/image.jpg"
}
```

### PUT /api/v1/categories/:id
Update a category. **Requires Authentication**

### DELETE /api/v1/categories/:id
Delete a category. **Requires Authentication**

---

## 4. Vendor APIs

### GET /api/v1/vendors
Get all vendors with pagination and filtering.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `search` (optional): Search term
- `is_active` (optional): Filter by active status

**Response:**
```json
{
  "status": true,
  "data": [
    {
      "id": "uuid",
      "name": "Restaurant ABC",
      "image": "https://example.com/image.jpg",
      "about": "Best restaurant in town",
      "subscript_date": "2025-01-12T10:00:00.000Z",
      "is_active": true,
      "created_at": "2025-01-12T10:00:00.000Z",
      "updated_at": "2025-01-12T10:00:00.000Z"
    }
  ],
  "message": "Vendors retrieved successfully",
  "count": 1
}
```

### GET /api/v1/vendors/popular
Get popular vendors (with highest ratings).

### GET /api/v1/vendors/expired-subscriptions
Get vendors with expired subscriptions.

### GET /api/v1/vendors/:id
Get vendor by ID.

### POST /api/v1/vendors
Create a new vendor. **Requires Authentication**

**Request Body:**
```json
{
  "name": "Restaurant ABC",
  "image": "https://example.com/image.jpg",
  "about": "Best restaurant in town"
}
```

### PUT /api/v1/vendors/:id
Update a vendor. **Requires Authentication**

### DELETE /api/v1/vendors/:id
Delete a vendor. **Requires Authentication**

---

## 5. Branch APIs

### GET /api/v1/branches
Get all branches with pagination.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `search` (optional): Search term
- `city` (optional): Filter by city
- `vendor_id` (optional): Filter by vendor

**Response:**
```json
{
  "status": true,
  "data": [
    {
      "id": "uuid",
      "vendor_id": "uuid",
      "name": "Downtown Branch",
      "image": "https://example.com/image.jpg",
      "lat": 40.7128,
      "lng": -74.0060,
      "address": "123 Main St",
      "city": "New York",
      "work_time": {
        "monday": "09:00-22:00",
        "tuesday": "09:00-22:00"
      },
      "delivery_time": "30-45 minutes",
      "min_order": 25.00,
      "delivery_fee": 5.00,
      "free_delivery": false,
      "is_active": true,
      "created_at": "2025-01-12T10:00:00.000Z",
      "updated_at": "2025-01-12T10:00:00.000Z",
      "vendor": {
        "id": "uuid",
        "name": "Restaurant ABC"
      },
      "subcategories": []
    }
  ],
  "message": "Branches retrieved successfully",
  "count": 1
}
```

### GET /api/v1/branches/:id
Get branch by ID.

### POST /api/v1/branches
Create a new branch. **Requires Authentication**

**Request Body:**
```json
{
  "vendor_id": "uuid",
  "name": "Downtown Branch",
  "image": "https://example.com/image.jpg",
  "lat": 40.7128,
  "lng": -74.0060,
  "address": "123 Main St",
  "city": "New York",
  "work_time": {
    "monday": "09:00-22:00",
    "tuesday": "09:00-22:00"
  },
  "delivery_time": "30-45 minutes",
  "min_order": 25.00,
  "delivery_fee": 5.00,
  "free_delivery": false
}
```

### PUT /api/v1/branches/:id
Update a branch. **Requires Authentication**

### DELETE /api/v1/branches/:id
Delete a branch. **Requires Authentication**

---

## 6. Subcategory APIs

### GET /api/v1/subcategories/search
Search subcategories.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `search` (optional): Search term
- `branch_id` (optional): Filter by branch
- `category_id` (optional): Filter by category

### GET /api/v1/subcategories/branches/:id
Get subcategories for a specific branch.

### GET /api/v1/subcategories/branches/:id/:sub_id
Get specific subcategory for a branch.

### POST /api/v1/subcategories/branches/:id
Create subcategory for a branch. **Requires Authentication**

**Request Body:**
```json
{
  "category_id": "uuid",
  "name": "Pizza",
  "image": "https://example.com/image.jpg",
  "has_offer": true,
  "free_delivery": false,
  "sort_order": 1
}
```

### PUT /api/v1/subcategories/branches/:id/:sub_id
Update subcategory. **Requires Authentication**

### DELETE /api/v1/subcategories/branches/:id/:sub_id
Delete subcategory. **Requires Authentication**

---

## 7. Product APIs

### GET /api/v1/products/:id
Get product by ID.

### GET /api/v1/products/branches/:id
Get products for a specific branch.

### GET /api/v1/products/branches/:branch_id/subcategories/:sub_id
Get products for a specific subcategory in a branch.

### POST /api/v1/products/branches/:id
Create product for a branch. **Requires Authentication**

**Request Body:**
```json
{
  "subcategory_id": "uuid",
  "name": "Margherita Pizza",
  "description": "Classic tomato and mozzarella pizza",
  "image": "https://example.com/image.jpg",
  "price": 15.99,
  "is_available": true,
  "preparation_time": "20 minutes",
  "calories": 300,
  "allergens": ["gluten", "dairy"],
  "sort_order": 1
}
```

### PUT /api/v1/products/:id
Update product. **Requires Authentication**

### DELETE /api/v1/products/:id
Delete product. **Requires Authentication**

### POST /api/v1/products/:id/variations
Add product variation. **Requires Authentication**

**Request Body:**
```json
{
  "name": "Large Size",
  "price_modifier": 5.00,
  "is_available": true,
  "sort_order": 1
}
```

### PUT /api/v1/products/variations/:id
Update product variation. **Requires Authentication**

### DELETE /api/v1/products/variations/:id
Delete product variation. **Requires Authentication**

---

## 8. Review APIs

### GET /api/v1/reviews/branches/:id
Get reviews for a specific branch.

### GET /api/v1/reviews/branches/:branch_id/stats
Get review statistics for a branch.

### POST /api/v1/reviews/branches/:id
Create review for a branch. **Requires Authentication**

**Request Body:**
```json
{
  "user_id": "uuid",
  "rating": 5,
  "comment": "Excellent food and service!",
  "order_id": "uuid"
}
```

### PUT /api/v1/reviews/:id
Update review. **Requires Authentication**

### DELETE /api/v1/reviews/:id
Delete review. **Requires Authentication**

### GET /api/v1/reviews/user/:user_id
Get reviews by a specific user. **Requires Authentication**

---

## 9. Offer APIs

### GET /api/v1/offers/active
Get all active offers.

### GET /api/v1/offers/expired
Get all expired offers.

### GET /api/v1/offers/:id
Get offer by ID.

### POST /api/v1/offers/branches/:id
Create offer for a branch. **Requires Authentication**

**Request Body:**
```json
{
  "entity_type": "branch",
  "entity_id": "uuid",
  "title": "20% Off All Orders",
  "description": "Get 20% discount on all orders",
  "discount_type": "percentage",
  "discount_value": 20,
  "min_order_amount": 50.00,
  "max_discount_amount": 25.00,
  "start_date": "2025-01-12T00:00:00.000Z",
  "end_date": "2025-01-31T23:59:59.000Z",
  "is_active": true
}
```

### POST /api/v1/offers/branches/:id/subcategories/:sub_id
Create offer for a subcategory. **Requires Authentication**

### POST /api/v1/offers/products/:id
Create offer for a product. **Requires Authentication**

### PUT /api/v1/offers/:id
Update offer. **Requires Authentication**

### DELETE /api/v1/offers/:id
Delete offer. **Requires Authentication**

---

## Error Responses

### Validation Error (400)
```json
{
  "status": false,
  "data": [
    {
      "field": "email",
      "message": "Please provide a valid email address"
    }
  ],
  "message": "Validation failed",
  "count": 1
}
```

### Authentication Error (401)
```json
{
  "status": false,
  "data": null,
  "message": "Access denied. No token provided.",
  "count": 0
}
```

### Not Found Error (404)
```json
{
  "status": false,
  "data": null,
  "message": "Resource not found",
  "count": 0
}
```

### Server Error (500)
```json
{
  "status": false,
  "data": null,
  "message": "Internal server error",
  "count": 0
}
```

---

## Performance Notes

The APIs may take longer to respond due to:

1. **Complex Database Queries**: Multiple JOIN operations across related tables
2. **Empty Database**: Newly created tables with no data still execute full query structures
3. **Database Indexing**: Some queries may be slow without proper indexes

To improve performance:
- Add sample data to test with realistic response times
- Optimize database indexes for frequently queried columns
- Consider implementing caching for read-heavy operations
- Use database connection pooling for better resource management

---

## Testing with cURL

### Health Check
```bash
curl -X GET "http://localhost:5000/health"
```

### Register User
```bash
curl -X POST "http://localhost:5000/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone_number": "+1234567890",
    "password": "password123"
  }'
```

### Login User
```bash
curl -X POST "http://localhost:5000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Get Categories
```bash
curl -X GET "http://localhost:5000/api/v1/categories"
```

### Get Vendors
```bash
curl -X GET "http://localhost:5000/api/v1/vendors"
```

### Get Branches
```bash
curl -X GET "http://localhost:5000/api/v1/branches"
```

### Get Active Offers
```bash
curl -X GET "http://localhost:5000/api/v1/offers/active"
```

---

## Database Schema

The API uses the following main entities:
- **Users**: Authentication and user management
- **Categories**: Product/service categories
- **Vendors**: Business entities
- **Branches**: Physical locations of vendors
- **Subcategories**: Category assignments per branch
- **Products**: Items sold by branches
- **ProductVariations**: Different sizes/options of products
- **Reviews**: Customer feedback for branches
- **Offers**: Promotional discounts and deals
- **Promotions**: Marketing campaigns

All entities support soft deletion and include timestamps for audit trails.

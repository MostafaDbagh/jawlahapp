# Jwalah App API

A comprehensive Node.js API for vendor and category management with authentication.

## 🚀 Quick Start

### Local Development
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Start the server
npm start
```

### API Endpoints

#### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout

#### Categories
- `GET /api/v1/categories` - Get all categories
- `GET /api/v1/categories/:id` - Get category by ID
- `POST /api/v1/categories` - Create category (Auth required)
- `PUT /api/v1/categories/:id` - Update category (Auth required)
- `DELETE /api/v1/categories/:id` - Delete category (Auth required)

#### Vendors
- `GET /api/v1/vendors` - Get all vendors
- `GET /api/v1/vendors/:id` - Get vendor by ID
- `GET /api/v1/vendors/popular` - Get popular vendors
- `GET /api/v1/vendors/nearby` - Get nearby vendors
- `POST /api/v1/vendors` - Create vendor (Auth required)
- `PUT /api/v1/vendors/:id` - Update vendor (Auth required)
- `DELETE /api/v1/vendors/:id` - Delete vendor (Auth required)

## 📚 Documentation

- [API Documentation](./API_DOCUMENTATION.md)
- [Category API Documentation](./CATEGORY_API_DOCUMENTATION.md)
- [Vendor API Documentation](./VENDOR_API_DOCUMENTATION.md)

## 🔧 Environment Variables

```env
DB_NAME=jwalahapp
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
NODE_ENV=development
JWT_SECRET=your_jwt_secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

## 🛠️ Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **PostgreSQL** - Database
- **Sequelize** - ORM
- **JWT** - Authentication
- **bcryptjs** - Password hashing

## 📝 License

MIT License
# Jwalah App - User Permission System

A comprehensive Node.js application with Express, PostgreSQL, and Sequelize ORM, featuring a robust user permission system with authentication, OTP verification, and role-based access control.

## 🚀 Features

### Authentication & Security
- **User Registration & Login** with secure password hashing
- **JWT-based Authentication** with access and refresh tokens
- **OTP Verification** for email verification and password reset
- **Account Locking** after multiple failed login attempts
- **Two-Factor Authentication** support (ready for implementation)

### User Management
- **Multiple Account Types**: Customer, Driver, Service Provider, Platform Admin, etc.
- **Role-Based Access Control** with hierarchical roles
- **Permission Management** with granular access control
- **Session Management** with device tracking and IP logging

### Database & Architecture
- **PostgreSQL** with comprehensive schema design
- **Sequelize ORM** for database operations
- **Clean Architecture** with separated concerns
- **Comprehensive Validation** using express-validator

## 📋 Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd jwalahapp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development
   
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=jwalahapp
   DB_USER=postgres
   DB_PASSWORD=your_password
   
   # JWT Configuration
   JWT_SECRET=your_jwt_secret_key_here_change_in_production
   JWT_ACCESS_EXPIRES_IN=15m
   JWT_REFRESH_EXPIRES_IN=7d
   
   # Email Configuration (for OTP)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password_here
   
   # CORS Configuration
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
   ```

4. **Set up PostgreSQL database**
   ```bash
   # Create database
   createdb jwalahapp
   
   # Or using psql
   psql -U postgres
   CREATE DATABASE jwalahapp;
   ```

5. **Run the application**
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

## 🗄️ Database Schema

The application uses a comprehensive database schema with the following main tables:

- **users** - User accounts with authentication details
- **account_types** - Different types of user accounts
- **roles** - User roles with hierarchical structure
- **permissions** - Granular permissions for different modules
- **user_roles** - Many-to-many relationship between users and roles
- **role_permissions** - Many-to-many relationship between roles and permissions
- **sessions** - User session management
- **otps** - One-time passwords for verification
- **audit_logs** - Comprehensive audit trail

## 📡 API Endpoints

### Authentication Routes (`/api/v1/auth`)

#### Public Routes
- `POST /register` - User registration
- `POST /login` - User login
- `POST /request-password-reset` - Request password reset OTP
- `POST /reset-password` - Reset password with OTP
- `POST /verify-otp` - Verify OTP
- `POST /resend-otp` - Resend OTP
- `POST /refresh-token` - Refresh access token
- `POST /verify-email` - Email verification

#### Protected Routes
- `GET /profile` - Get user profile
- `PUT /profile` - Update user profile
- `POST /logout` - User logout

### Health Check
- `GET /health` - Server health status

## 🔐 Authentication

### Registration
```json
POST /api/v1/auth/register
{
  "username": "john_doe",
  "email": "john@example.com",
  "phone_number": "+1234567890",
  "password_hash": "SecurePass123",
  "account_type": "CUSTOMER"
}
```

### Login
```json
POST /api/v1/auth/login
{
  "email": "john@example.com",
  "password_hash": "SecurePass123"
}
```

### Protected Routes
Include the JWT token in the Authorization header:
```
Authorization: Bearer <access_token>
```

## 🏗️ Project Structure

```
src/
├── config/           # Configuration files
│   ├── database.js   # Database connection
│   ├── schema.sql    # Database schema
│   └── initDb.js     # Database initialization
├── controllers/      # Route controllers
│   └── authController.js
├── middleware/       # Custom middleware
│   ├── auth.js       # Authentication middleware
│   └── validation.js # Request validation
├── models/          # Sequelize models
│   ├── User.js
│   ├── OTP.js
│   ├── Role.js
│   ├── Permission.js
│   ├── Session.js
│   ├── AccountType.js
│   └── index.js
├── routes/          # API routes
│   ├── auth/
│   │   └── authRoutes.js
│   └── index.js
├── utils/           # Utility services
│   ├── emailService.js
│   ├── otpService.js
│   └── jwtService.js
├── app.js           # Express application
└── server.js        # Server entry point
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment | development |
| `DB_HOST` | Database host | localhost |
| `DB_PORT` | Database port | 5432 |
| `DB_NAME` | Database name | jwalahapp |
| `DB_USER` | Database user | postgres |
| `DB_PASSWORD` | Database password | - |
| `JWT_SECRET` | JWT secret key | - |
| `EMAIL_HOST` | SMTP host | smtp.gmail.com |
| `EMAIL_USER` | Email username | - |
| `EMAIL_PASS` | Email password | - |

## 🚀 Development

### Running in Development Mode
```bash
npm run dev
```

### Database Migrations
The application automatically initializes the database schema on startup. For development, you can modify the schema in `src/config/schema.sql` and restart the application.

### Adding New Models
1. Create the model file in `src/models/`
2. Add it to `src/models/index.js`
3. Define relationships and associations
4. Update the database schema if needed

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Run tests in watch mode
npm run test:watch
```

## 📦 Production Deployment

1. **Set environment variables** for production
2. **Use PM2 or similar** process manager
3. **Set up reverse proxy** (nginx/Apache)
4. **Configure SSL certificates**
5. **Set up database backups**

## 🔒 Security Features

- **Password Hashing** with bcrypt and salt
- **JWT Token Management** with expiration
- **Rate Limiting** for OTP requests
- **Account Locking** after failed attempts
- **Input Validation** and sanitization
- **CORS Configuration** for cross-origin requests
- **Helmet.js** for security headers

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team

## 🔄 Changelog

### Version 1.0.0
- Initial release with comprehensive user permission system
- Authentication and authorization features
- OTP verification system
- Role-based access control
- PostgreSQL database with Sequelize ORM

# 🗄️ **Production Database Setup Guide**

## **Option 1: Vercel Postgres (Recommended)**

### **1. Add Vercel Postgres Database**
```bash
# Install Vercel Postgres CLI
npm install -g @vercel/postgres

# Add Postgres to your project
vercel postgres create jwalah-db
```

### **2. Get Connection String**
```bash
# Get the connection string
vercel postgres connect jwalah-db
```

### **3. Set Environment Variable**
```bash
# Set DATABASE_URL in Vercel
vercel env add DATABASE_URL
# Paste the connection string when prompted
```

---

## **Option 2: External Database Providers**

### **Railway PostgreSQL**
1. Go to [railway.app](https://railway.app)
2. Create new project
3. Add PostgreSQL database
4. Copy connection string
5. Set as `DATABASE_URL` in Vercel

### **Neon PostgreSQL**
1. Go to [neon.tech](https://neon.tech)
2. Create free account
3. Create new project
4. Copy connection string
5. Set as `DATABASE_URL` in Vercel

### **Supabase PostgreSQL**
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Go to Settings > Database
4. Copy connection string
5. Set as `DATABASE_URL` in Vercel

---

## **Step 3: Set All Required Environment Variables**

### **Required Variables for Production:**
```bash
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Environment
NODE_ENV=production

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### **Set Variables in Vercel:**
```bash
# Set each variable
vercel env add DATABASE_URL
vercel env add JWT_SECRET
vercel env add JWT_ACCESS_EXPIRES_IN
vercel env add JWT_REFRESH_EXPIRES_IN
vercel env add NODE_ENV
```

---

## **Step 4: Test Database Connection**

### **Test Locally First:**
```bash
# Test with production database
curl -X GET "http://localhost:5000/health"
```

### **Expected Response:**
```json
{
  "status": true,
  "data": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "uptime": 12345,
    "environment": "production"
  },
  "message": "Server is running",
  "count": 1
}
```

---

## **Step 5: Deploy and Test**

### **Redeploy with New Environment:**
```bash
vercel --prod
```

### **Test All Endpoints:**
```bash
# Health Check
curl -X GET "https://your-app.vercel.app/health?x-vercel-set-bypass-cookie=true&x-vercel-protection-bypass=YOUR_TOKEN"

# Categories
curl -X GET "https://your-app.vercel.app/api/v1/categories?x-vercel-set-bypass-cookie=true&x-vercel-protection-bypass=YOUR_TOKEN"

# Vendors
curl -X GET "https://your-app.vercel.app/api/v1/vendors?x-vercel-set-bypass-cookie=true&x-vercel-protection-bypass=YOUR_TOKEN"
```

---

## **Step 6: Complete API Testing**

### **Postman Collection:**
Import the `JWALA_API_POSTMAN_COLLECTION.json` file I created.

### **Test Sequence:**
1. ✅ Health Check
2. ✅ Get Categories
3. ✅ Get Vendors
4. ✅ Register User
5. ✅ Login User
6. ✅ Create Category (with auth)
7. ✅ Create Vendor (with auth)

---

## **🎯 Success Checklist**

- [ ] Environment variables set
- [ ] Database connected
- [ ] API deployed
- [ ] Health endpoint working
- [ ] All endpoints tested
- [ ] Documentation complete
- [ ] Postman collection ready

**Your API is ready for production use!** 🚀

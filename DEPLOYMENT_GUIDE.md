# Vercel Deployment Guide

## 🚀 Deploy to Vercel (Top Recommendation)

Vercel is the best choice for Node.js APIs with automatic deployments, global CDN, and excellent developer experience.

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Login and Deploy
```bash
vercel login
vercel
```

### Step 3: Set Environment Variables
```bash
vercel env add NODE_ENV production
vercel env add JWT_SECRET your-secret-key
vercel env add JWT_ACCESS_EXPIRES_IN 15m
vercel env add JWT_REFRESH_EXPIRES_IN 7d
```

### Step 4: Add Database
```bash
# Option 1: Vercel Postgres (Recommended)
vercel storage create postgres

# Option 2: External database (Neon, Supabase, etc.)
# Set DATABASE_URL environment variable
```

### Step 5: Deploy to Production
```bash
vercel --prod
```

Your API will be live at: `https://your-project-name.vercel.app`

---

# Railway Deployment Guide

## 🚀 Deploy to Railway (Alternative)

Railway is also an excellent choice for Node.js APIs with PostgreSQL.

### Step 1: Prepare Your Code
1. Make sure all your code is committed to Git
2. Push to GitHub/GitLab

### Step 2: Deploy to Railway
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your repository
6. Railway will automatically detect it's a Node.js app

### Step 3: Add PostgreSQL Database
1. In your Railway project, click "New"
2. Select "Database" → "PostgreSQL"
3. Railway will automatically create a PostgreSQL database

### Step 4: Set Environment Variables
In Railway dashboard, go to Variables tab and add:

```env
NODE_ENV=production
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=[Railway will provide this]
DB_HOST=[Railway will provide this]
DB_PORT=5432
JWT_SECRET=your-super-secret-jwt-key-here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

### Step 5: Deploy
Railway will automatically deploy your app. Your API will be available at:
`https://your-app-name.railway.app`

---

# Render Deployment Guide

## 🚀 Deploy to Render (Free Tier Available)

### Step 1: Prepare Your Code
1. Push your code to GitHub
2. Create a `render.yaml` file (already created)

### Step 2: Deploy to Render
1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Click "New" → "Web Service"
4. Connect your GitHub repository
5. Configure:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node

### Step 3: Add PostgreSQL Database
1. In Render dashboard, click "New" → "PostgreSQL"
2. Choose the free tier
3. Note the connection details

### Step 4: Set Environment Variables
In Render dashboard, go to Environment tab:

```env
NODE_ENV=production
DB_NAME=[from Render PostgreSQL]
DB_USER=[from Render PostgreSQL]
DB_PASSWORD=[from Render PostgreSQL]
DB_HOST=[from Render PostgreSQL]
DB_PORT=5432
JWT_SECRET=your-super-secret-jwt-key-here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

---

# Heroku Deployment Guide

## 🚀 Deploy to Heroku

### Step 1: Install Heroku CLI
```bash
# macOS
brew install heroku/brew/heroku

# Or download from heroku.com
```

### Step 2: Login to Heroku
```bash
heroku login
```

### Step 3: Create Heroku App
```bash
heroku create your-app-name
```

### Step 4: Add PostgreSQL Database
```bash
heroku addons:create heroku-postgresql:hobby-dev
```

### Step 5: Set Environment Variables
```bash
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-super-secret-jwt-key-here
heroku config:set JWT_ACCESS_EXPIRES_IN=15m
heroku config:set JWT_REFRESH_EXPIRES_IN=7d
```

### Step 6: Deploy
```bash
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

---

# DigitalOcean App Platform Guide

## 🚀 Deploy to DigitalOcean App Platform

### Step 1: Prepare Your Code
1. Push to GitHub
2. Create `.do/app.yaml` file (already created)

### Step 2: Deploy to DigitalOcean
1. Go to [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)
2. Click "Create App"
3. Connect your GitHub repository
4. DigitalOcean will auto-detect Node.js

### Step 3: Add Database
1. In the app configuration, add a PostgreSQL database
2. Choose the appropriate plan

### Step 4: Configure Environment Variables
Add these in the app settings:

```env
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

---

# Testing Your Deployed API

Once deployed, test your API:

```bash
# Health check
curl https://your-app-url.com/health

# Get categories
curl https://your-app-url.com/api/v1/categories

# Get vendors
curl https://your-app-url.com/api/v1/vendors

# Register a user
curl -X POST https://your-app-url.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password_hash": "TestPass123"
  }'
```

---

# API Documentation for Developers

Share this documentation with other developers:

## Base URL
```
https://your-app-url.com
```

## Authentication
All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

## Response Format
All responses follow this format:
```json
{
  "status": boolean,
  "data": dynamic,
  "message": string,
  "count": number
}
```

## Quick Start for Developers
1. Register a user: `POST /api/v1/auth/register`
2. Login to get token: `POST /api/v1/auth/login`
3. Use token for protected endpoints
4. Explore categories: `GET /api/v1/categories`
5. Explore vendors: `GET /api/v1/vendors`

## Postman Collection
Import the curl commands from:
- `CATEGORY_API_CURL_COMMANDS.txt`
- `VENDOR_API_CURL_COMMANDS.txt`

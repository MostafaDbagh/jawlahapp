# Vercel Deployment Guide

## 🚀 Deploy to Vercel (Recommended for APIs)

Vercel is perfect for Node.js APIs with automatic deployments and global CDN.

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Login to Vercel
```bash
vercel login
```

### Step 3: Deploy Your Project
```bash
# In your project directory
vercel

# Follow the prompts:
# - Set up and deploy? Y
# - Which scope? (your account)
# - Link to existing project? N
# - Project name? jwalah-api (or your choice)
# - Directory? ./
```

### Step 4: Set Environment Variables
```bash
# Set production environment variables
vercel env add NODE_ENV production
vercel env add JWT_SECRET your-super-secret-jwt-key-here
vercel env add JWT_ACCESS_EXPIRES_IN 15m
vercel env add JWT_REFRESH_EXPIRES_IN 7d

# Database variables (you'll get these from your database provider)
vercel env add DB_NAME your-db-name
vercel env add DB_USER your-db-user
vercel env add DB_PASSWORD your-db-password
vercel env add DB_HOST your-db-host
vercel env add DB_PORT 5432
```

### Step 5: Deploy to Production
```bash
vercel --prod
```

---

## 🌐 Database Options for Vercel

### Option 1: Vercel Postgres (Recommended)
```bash
# Add Vercel Postgres to your project
vercel storage create postgres

# This will automatically set DATABASE_URL environment variable
```

### Option 2: External PostgreSQL Providers
- **Neon** (Free tier available)
- **Supabase** (Free tier available)
- **Railway** (Good for PostgreSQL)
- **PlanetScale** (MySQL, but excellent)

---

## 🔧 Vercel-Specific Configuration

### Update package.json for Vercel
```json
{
  "scripts": {
    "start": "node src/server.js",
    "vercel-build": "echo 'No build step required'"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### Environment Variables in Vercel Dashboard
1. Go to your project dashboard
2. Click "Settings" → "Environment Variables"
3. Add all required variables:
   ```
   NODE_ENV=production
   JWT_SECRET=your-secret-key
   JWT_ACCESS_EXPIRES_IN=15m
   JWT_REFRESH_EXPIRES_IN=7d
   DATABASE_URL=postgresql://user:pass@host:port/db
   ```

---

## 📊 Vercel Features You'll Love

### 1. Automatic Deployments
- Every push to main branch = automatic deployment
- Preview deployments for pull requests
- Instant rollbacks if needed

### 2. Global Performance
- Your API will be fast worldwide
- Automatic HTTPS
- Custom domains (free)

### 3. Analytics & Monitoring
- Real-time analytics
- Function execution times
- Error tracking

### 4. Easy Scaling
- Automatically handles traffic spikes
- No server management needed
- Pay only for what you use

---

## 🧪 Testing Your Vercel Deployment

Once deployed, your API will be available at:
```
https://your-project-name.vercel.app
```

Test it:
```bash
# Health check
curl https://your-project-name.vercel.app/health

# Get categories
curl https://your-project-name.vercel.app/api/v1/categories

# Get vendors
curl https://your-project-name.vercel.app/api/v1/vendors
```

---

## 🔄 Continuous Deployment Setup

### GitHub Integration
1. Connect your GitHub repository to Vercel
2. Enable automatic deployments
3. Every push to main = new deployment
4. Preview deployments for pull requests

### Custom Domain
1. Go to project settings
2. Add your domain
3. Update DNS records
4. Your API is live on your domain!

---

## 💰 Vercel Pricing

### Free Tier (Perfect for Development)
- Unlimited personal projects
- 100GB bandwidth per month
- 100GB-hours of serverless function execution
- Custom domains
- Automatic HTTPS

### Pro Tier ($20/month)
- 1TB bandwidth
- 1,000GB-hours of execution
- Team collaboration
- Advanced analytics
- Priority support

---

## 🚀 Quick Start Commands

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Set environment variables
vercel env add NODE_ENV production
vercel env add JWT_SECRET your-secret-key

# Deploy to production
vercel --prod

# Your API is live! 🎉
```

---

## 📝 Vercel vs Other Platforms

| Feature | Vercel | Railway | Render | Heroku |
|---------|--------|---------|--------|--------|
| Setup Time | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| Performance | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Free Tier | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| Database Integration | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Custom Domains | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |

**Vercel is the best choice for:**
- Fast deployment
- Global performance
- Automatic scaling
- Developer experience
- Modern development workflow

---

## 🎯 Next Steps

1. **Deploy to Vercel** using the commands above
2. **Set up a database** (Vercel Postgres or external)
3. **Configure environment variables**
4. **Test your API** endpoints
5. **Share the URL** with other developers
6. **Set up custom domain** (optional)

Your API will be live and accessible worldwide in minutes! 🌍

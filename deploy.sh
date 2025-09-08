#!/bin/bash

# Jwalah App Deployment Script
# This script helps you deploy your API to various platforms

echo "🚀 Jwalah App Deployment Helper"
echo "================================"

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📁 Initializing Git repository..."
    git init
    git add .
    git commit -m "Initial commit - Jwalah App API"
    echo "✅ Git repository initialized"
fi

echo ""
echo "Choose your deployment platform:"
echo "1) Vercel (Top Recommendation - Best Performance)"
echo "2) Railway (Easy Setup)"
echo "3) Render (Free tier available)"
echo "4) Heroku (Popular choice)"
echo "5) DigitalOcean App Platform"
echo "6) Show deployment instructions"

read -p "Enter your choice (1-6): " choice

case $choice in
    1)
        echo ""
        echo "⚡ Vercel Deployment Instructions:"
        echo "1. Install Vercel CLI: npm install -g vercel"
        echo "2. Login: vercel login"
        echo "3. Deploy: vercel"
        echo "4. Set environment variables:"
        echo "   - vercel env add NODE_ENV production"
        echo "   - vercel env add JWT_SECRET your-secret-key"
        echo "   - vercel env add JWT_ACCESS_EXPIRES_IN 15m"
        echo "   - vercel env add JWT_REFRESH_EXPIRES_IN 7d"
        echo "5. Add database: vercel storage create postgres"
        echo "6. Deploy to production: vercel --prod"
        echo "7. Your API will be live at: https://your-project-name.vercel.app"
        ;;
    2)
        echo ""
        echo "🚂 Railway Deployment Instructions:"
        echo "1. Go to https://railway.app"
        echo "2. Sign up with GitHub"
        echo "3. Click 'New Project' → 'Deploy from GitHub repo'"
        echo "4. Select your repository"
        echo "5. Add PostgreSQL database in Railway dashboard"
        echo "6. Set environment variables in Railway dashboard:"
        echo "   - NODE_ENV=production"
        echo "   - JWT_SECRET=your-secret-key"
        echo "   - JWT_ACCESS_EXPIRES_IN=15m"
        echo "   - JWT_REFRESH_EXPIRES_IN=7d"
        echo "7. Railway will auto-deploy your app!"
        ;;
    3)
        echo ""
        echo "🎨 Render Deployment Instructions:"
        echo "1. Go to https://render.com"
        echo "2. Sign up with GitHub"
        echo "3. Click 'New' → 'Web Service'"
        echo "4. Connect your GitHub repository"
        echo "5. Configure:"
        echo "   - Build Command: npm install"
        echo "   - Start Command: npm start"
        echo "6. Add PostgreSQL database in Render dashboard"
        echo "7. Set environment variables in Render dashboard"
        echo "8. Deploy!"
        ;;
    4)
        echo ""
        echo "🟣 Heroku Deployment Instructions:"
        echo "1. Install Heroku CLI: https://devcenter.heroku.com/articles/heroku-cli"
        echo "2. Run: heroku login"
        echo "3. Run: heroku create your-app-name"
        echo "4. Run: heroku addons:create heroku-postgresql:hobby-dev"
        echo "5. Run: heroku config:set NODE_ENV=production"
        echo "6. Run: heroku config:set JWT_SECRET=your-secret-key"
        echo "7. Run: git push heroku main"
        ;;
    5)
        echo ""
        echo "🌊 DigitalOcean App Platform Instructions:"
        echo "1. Go to https://cloud.digitalocean.com/apps"
        echo "2. Click 'Create App'"
        echo "3. Connect your GitHub repository"
        echo "4. DigitalOcean will auto-detect Node.js"
        echo "5. Add PostgreSQL database"
        echo "6. Set environment variables"
        echo "7. Deploy!"
        ;;
    6)
        echo ""
        echo "📖 All deployment instructions are available in:"
        echo "- DEPLOYMENT_GUIDE.md"
        echo "- VERCEL_DEPLOYMENT_GUIDE.md"
        echo "- API_DEVELOPER_GUIDE.md"
        echo ""
        echo "Quick start for developers:"
        echo "1. Push your code to GitHub"
        echo "2. Choose a platform (Vercel recommended)"
        echo "3. Follow the platform-specific instructions"
        echo "4. Share the API URL with other developers"
        ;;
    *)
        echo "❌ Invalid choice. Please run the script again."
        exit 1
        ;;
esac

echo ""
echo "📚 Additional Resources:"
echo "- API Documentation: API_DEVELOPER_GUIDE.md"
echo "- Deployment Guide: DEPLOYMENT_GUIDE.md"
echo "- Category API: CATEGORY_API_DOCUMENTATION.md"
echo "- Vendor API: VENDOR_API_DOCUMENTATION.md"
echo ""
echo "✅ Happy deploying! 🚀"

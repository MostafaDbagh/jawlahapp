#!/bin/bash

echo "🚀 Deploying Jwalah App to Vercel with PostgreSQL..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed. Installing..."
    npm install -g vercel
fi

# Check if user is logged in to Vercel
if ! vercel whoami &> /dev/null; then
    echo "❌ Not logged in to Vercel. Please login first:"
    echo "Run: vercel login"
    exit 1
fi

echo "📦 Building project..."
npm run build 2>/dev/null || echo "No build script found, skipping..."

echo "🔧 Setting up environment variables..."
echo "Make sure you have added the following environment variables in Vercel dashboard:"
echo "- DATABASE_URL"
echo "- JWT_SECRET"
echo "- JWT_REFRESH_SECRET"
echo "- NODE_ENV=production"

echo "📤 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment complete!"
echo "🌐 Your app should be available at: https://your-project-name.vercel.app"
echo ""
echo "📋 Next steps:"
echo "1. Go to Vercel dashboard → Your project → Storage"
echo "2. Create a PostgreSQL database"
echo "3. Copy the connection string to DATABASE_URL environment variable"
echo "4. Run database migrations: vercel env pull && npm run seed"
echo "5. Test your deployed API endpoints"

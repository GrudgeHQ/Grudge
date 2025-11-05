# Production Deployment Script for Grudge App

# Build and optimization script
echo "🚀 Starting production build and optimization..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf .next
rm -rf node_modules/.cache

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --production=false

# Generate Prisma client
echo "🗃️ Generating Prisma client..."
npx prisma generate

# Run database migrations (if needed)
echo "🏃 Running database migrations..."
npx prisma migrate deploy

# Build the application
echo "🔨 Building application..."
npm run build

# Analyze bundle (optional)
if [ "$ANALYZE_BUNDLE" = "true" ]; then
  echo "📊 Analyzing bundle size..."
  npm run build:analyze
fi

# Run tests
echo "🧪 Running tests..."
npm test -- --run

# Security audit
echo "🔒 Running security audit..."
npm audit --audit-level moderate

# Check for outdated packages
echo "📋 Checking for outdated packages..."
npm outdated

echo "✅ Production build completed successfully!"

# Optional: Deploy to your hosting platform
if [ "$DEPLOY" = "true" ]; then
  echo "🚢 Deploying to production..."
  # Add your deployment commands here
  # Examples:
  # vercel --prod
  # aws s3 sync .next/static s3://your-bucket/static
  # docker build -t grudge-app .
  # kubectl apply -f k8s/
fi

echo "🎉 Deployment completed!"
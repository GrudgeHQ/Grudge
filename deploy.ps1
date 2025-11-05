# Production Deployment Script for Windows (PowerShell)

Write-Host "🚀 Starting production build and optimization..." -ForegroundColor Green

# Clean previous builds
Write-Host "🧹 Cleaning previous builds..." -ForegroundColor Yellow
Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "node_modules\.cache" -Recurse -Force -ErrorAction SilentlyContinue

# Install dependencies  
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm ci --production=false

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Dependency installation failed!" -ForegroundColor Red
    exit 1
}

# Generate Prisma client
Write-Host "🗃️ Generating Prisma client..." -ForegroundColor Yellow
npx prisma generate

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Prisma client generation failed!" -ForegroundColor Red
    exit 1
}

# Run database migrations (if needed)
Write-Host "🏃 Running database migrations..." -ForegroundColor Yellow
npx prisma migrate deploy

# Build the application
Write-Host "🔨 Building application..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

# Analyze bundle (optional)
if ($env:ANALYZE_BUNDLE -eq "true") {
    Write-Host "📊 Analyzing bundle size..." -ForegroundColor Yellow
    npm run build:analyze
}

# Run tests
Write-Host "🧪 Running tests..." -ForegroundColor Yellow
npm test -- --run

# Security audit
Write-Host "🔒 Running security audit..." -ForegroundColor Yellow
npm audit --audit-level moderate

# Check for outdated packages
Write-Host "📋 Checking for outdated packages..." -ForegroundColor Yellow
npm outdated

Write-Host "✅ Production build completed successfully!" -ForegroundColor Green

# Optional: Deploy to your hosting platform
if ($env:DEPLOY -eq "true") {
    Write-Host "🚢 Deploying to production..." -ForegroundColor Yellow
    # Add your deployment commands here
    # Examples:
    # vercel --prod
    # docker build -t grudge-app .
    # kubectl apply -f k8s/
}

Write-Host "🎉 Deployment completed!" -ForegroundColor Green

# Display build stats
Write-Host "`n📊 Build Statistics:" -ForegroundColor Cyan
Get-ChildItem -Path ".next" -Recurse | Measure-Object -Property Length -Sum | ForEach-Object {
    $sizeInMB = [math]::Round($_.Sum / 1MB, 2)
    Write-Host "Total build size: $sizeInMB MB" -ForegroundColor White
}
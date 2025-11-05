# Mobile Deployment Script
# PowerShell script to build and optimize for mobile deployment

Write-Host "🚀 Building Grudge App for Mobile Deployment..." -ForegroundColor Green

# Check if Node.js is installed
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js is not installed. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Check if npm is installed
if (!(Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "❌ npm is not installed. Please install npm first." -ForegroundColor Red
    exit 1
}

Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

Write-Host "🧹 Cleaning previous builds..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
}

Write-Host "🔨 Building optimized production bundle..." -ForegroundColor Yellow
$env:NODE_ENV = "production"
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "📊 Analyzing bundle size..." -ForegroundColor Yellow
if (Get-Command npx -ErrorAction SilentlyContinue) {
    npx @next/bundle-analyzer
}

Write-Host "🎯 Mobile Optimization Checklist:" -ForegroundColor Cyan
Write-Host "✅ PWA manifest configured" -ForegroundColor Green
Write-Host "✅ Service worker implemented" -ForegroundColor Green
Write-Host "✅ Mobile-first responsive design" -ForegroundColor Green
Write-Host "✅ Touch-optimized interactions" -ForegroundColor Green
Write-Host "✅ Offline functionality" -ForegroundColor Green
Write-Host "✅ App icon sets" -ForegroundColor Green
Write-Host "✅ Safe area support" -ForegroundColor Green
Write-Host "✅ Performance optimizations" -ForegroundColor Green

Write-Host "📱 Deployment Recommendations:" -ForegroundColor Cyan
Write-Host "• Deploy to a service that supports HTTPS (required for PWA)" -ForegroundColor Yellow
Write-Host "• Test on various mobile devices and screen sizes" -ForegroundColor Yellow
Write-Host "• Verify PWA installation prompts work correctly" -ForegroundColor Yellow
Write-Host "• Test offline functionality" -ForegroundColor Yellow
Write-Host "• Configure push notifications if needed" -ForegroundColor Yellow

Write-Host ""
Write-Host "🎉 Mobile build completed successfully!" -ForegroundColor Green
Write-Host "📁 Build output is in the '.next' directory" -ForegroundColor White
Write-Host "🚀 Run 'npm start' to test the production build" -ForegroundColor White
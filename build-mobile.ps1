# Mobile App Build Script
# Builds the Next.js app for Capacitor deployment

Write-Host "🚀 Building Grudge App for Mobile..." -ForegroundColor Cyan

# Step 1: Clean previous builds
Write-Host "`n📦 Cleaning previous builds..." -ForegroundColor Yellow
if (Test-Path "out") { Remove-Item -Recurse -Force "out" }
if (Test-Path ".next") { Remove-Item -Recurse -Force ".next" }

# Step 2: Build static export
Write-Host "`n🔨 Building static export..." -ForegroundColor Yellow
$env:CAPACITOR_BUILD = "true"
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ Mobile build complete!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "  1. Run 'npx cap sync' to sync with native platforms"
Write-Host "  2. Run 'npx cap open android' or 'npx cap open ios' to open in IDE"
Write-Host "  3. Build release version in Android Studio or Xcode"

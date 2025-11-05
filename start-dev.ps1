Write-Host "Starting Grudge App Development Server..." -ForegroundColor Green
Write-Host ""

Set-Location -Path $PSScriptRoot

Write-Host "Checking if node_modules exists..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    & node_modules\.bin\npm.cmd install
}

Write-Host ""
Write-Host "Generating Prisma client..." -ForegroundColor Yellow
& node_modules\.bin\prisma.cmd generate

Write-Host ""
Write-Host "Pushing database schema..." -ForegroundColor Yellow
& node_modules\.bin\prisma.cmd db push

Write-Host ""
Write-Host "Starting development server..." -ForegroundColor Green
Write-Host "Visit http://localhost:3000 when ready" -ForegroundColor Cyan
Write-Host ""
& node_modules\.bin\next.cmd dev
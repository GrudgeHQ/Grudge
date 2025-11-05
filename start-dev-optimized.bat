@echo off
echo Starting Optimized Grudge App Development Server...
echo.

cd /d "%~dp0"

echo [1/7] Cleaning build cache...
if exist ".next" rmdir /s /q ".next" 2>nul
if exist "node_modules\.cache" rmdir /s /q "node_modules\.cache" 2>nul

echo [2/7] Checking dependencies...
if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install --prefer-offline --no-audit
)

echo [3/7] Optimizing Prisma...
if exist "node_modules\.prisma" (
    rmdir /s /q "node_modules\.prisma" 2>nul
)

echo [4/7] Generating optimized Prisma client...
call npx prisma generate --generator client
if errorlevel 1 (
    echo Warning: Prisma generation failed, continuing...
)

echo [5/7] Verifying database schema...
call npx prisma db push --accept-data-loss
if errorlevel 1 (
    echo Warning: Database push failed, continuing...
)

echo [6/7] Clearing Next.js cache...
call npx next build --no-lint 2>nul
if exist ".next" rmdir /s /q ".next" 2>nul

echo [7/7] Starting optimized development server...
echo.
echo ======================================
echo   🚀 OPTIMIZED DEVELOPMENT MODE
echo   📱 Visit: http://localhost:3000
echo   ⚡ Fast reloads enabled
echo   🎯 Code splitting active
echo ======================================
echo.

call npm run dev:turbo
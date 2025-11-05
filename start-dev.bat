@echo off
echo Starting Grudge App Development Server...
echo.

cd /d "%~dp0"

echo Checking if node_modules exists...
if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
)

echo.
echo Cleaning Prisma cache...
if exist "node_modules\.prisma" (
    rmdir /s /q "node_modules\.prisma" 2>nul
)

echo.
echo Generating Prisma client...
call npx prisma generate
if errorlevel 1 (
    echo Warning: npx failed, trying Node.js directly...
    node .\node_modules\prisma\build\index.js generate
)

echo.
echo Pushing database schema...
call npx prisma db push

echo.
echo Starting development server...
echo Visit http://localhost:3000 when ready
echo.
call npm run dev

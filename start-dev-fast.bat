@echo off
echo Starting Grudge App Development Server (Fast Mode)...
echo.

cd /d "%~dp0"

echo Skipping dependency check in fast mode...

echo.
echo Skipping Prisma cache cleanup...

echo.
echo Skipping Prisma generation (using existing)...

echo.
echo Skipping database push (using existing)...

echo.
echo Starting development server in FAST MODE...
echo Visit http://localhost:3000 when ready
echo Note: This mode skips some checks for faster startup
echo.

set SKIP_ENV_VALIDATION=1
set NEXT_TELEMETRY_DISABLED=1
set PRISMA_QUERY_LOG_LEVEL=error

call npm run dev
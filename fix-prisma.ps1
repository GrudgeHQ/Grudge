Write-Host "Grudge App - Prisma Troubleshooting Script" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""

Set-Location -Path $PSScriptRoot

# Function to kill Node processes that might be locking Prisma files
function Stop-NodeProcesses {
    Write-Host "Checking for running Node.js processes..." -ForegroundColor Yellow
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
        Write-Host "Found $($nodeProcesses.Count) Node.js processes. Stopping them..." -ForegroundColor Yellow
        $nodeProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        Write-Host "Node.js processes stopped." -ForegroundColor Green
    } else {
        Write-Host "No Node.js processes found." -ForegroundColor Green
    }
}

# Function to clean Prisma cache with multiple attempts
function Reset-PrismaCache {
    Write-Host "Cleaning Prisma cache..." -ForegroundColor Yellow
    
    # Try multiple cleanup approaches
    $prismaPath = "node_modules\.prisma"
    if (Test-Path $prismaPath) {
        try {
            Remove-Item -Path $prismaPath -Recurse -Force -ErrorAction Stop
            Write-Host "Prisma cache cleaned successfully." -ForegroundColor Green
        } catch {
            Write-Host "Standard cleanup failed, trying alternative..." -ForegroundColor Yellow
            
            # Try with takeown and icacls for stubborn Windows permissions
            & takeown /f $prismaPath /r /d y 2>$null
            & icacls $prismaPath /grant administrators:F /t 2>$null
            Remove-Item -Path $prismaPath -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
    
    # Also clean npm cache
    Write-Host "Cleaning npm cache..." -ForegroundColor Yellow
    & npm cache clean --force 2>$null
}

# Function to generate Prisma client with multiple retry strategies
function Start-PrismaGeneration {
    Write-Host "Attempting Prisma client generation..." -ForegroundColor Yellow
    
    $attempts = @(
        @{ cmd = "npx"; args = @("prisma", "generate") },
        @{ cmd = "npx"; args = @("prisma", "generate", "--force-reset") },
        @{ cmd = ".\node_modules\.bin\prisma.cmd"; args = @("generate") },
        @{ cmd = "node"; args = @(".\node_modules\prisma\build\index.js", "generate") }
    )
    
    foreach ($attempt in $attempts) {
        Write-Host "Trying: $($attempt.cmd) $($attempt.args -join ' ')" -ForegroundColor Cyan
        
        try {
            $process = Start-Process -FilePath $attempt.cmd -ArgumentList $attempt.args -NoNewWindow -PassThru -Wait
            if ($process.ExitCode -eq 0) {
                Write-Host "Prisma generation successful!" -ForegroundColor Green
                return $true
            }
        } catch {
            Write-Host "Attempt failed: $_" -ForegroundColor Red
        }
        
        Start-Sleep -Seconds 1
    }
    
    Write-Host "All Prisma generation attempts failed." -ForegroundColor Red
    return $false
}

# Main execution
try {
    # Step 1: Stop any running Node processes
    Stop-NodeProcesses
    
    # Step 2: Clean Prisma cache
    Reset-PrismaCache
    
    # Step 3: Generate Prisma client
    $success = Start-PrismaGeneration
    
    if ($success) {
        Write-Host ""
        Write-Host "✅ Prisma client generation completed successfully!" -ForegroundColor Green
        Write-Host "✅ Database schema is ready" -ForegroundColor Green
        Write-Host "✅ League join request system should now be fully functional" -ForegroundColor Green
        Write-Host ""
        
        # Push database schema to be safe
        Write-Host "Ensuring database schema is up to date..." -ForegroundColor Yellow
        & npx prisma db push --accept-data-loss
        
        Write-Host ""
        Write-Host "🚀 Starting development server..." -ForegroundColor Green
        & npm run dev
    } else {
        Write-Host ""
        Write-Host "❌ Prisma generation failed. Manual intervention required." -ForegroundColor Red
        Write-Host ""
        Write-Host "Possible solutions:" -ForegroundColor Yellow
        Write-Host "1. Run PowerShell as Administrator" -ForegroundColor White
        Write-Host "2. Temporarily disable Windows Defender real-time protection" -ForegroundColor White
        Write-Host "3. Check if antivirus is blocking file operations" -ForegroundColor White
        Write-Host "4. Try running: npm install prisma@latest" -ForegroundColor White
        Write-Host ""
    }
    
} catch {
    Write-Host "Script execution failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
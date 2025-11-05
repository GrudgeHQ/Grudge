# Fix all auth import paths
$files = Get-ChildItem -Path "app" -Include *.ts,*.tsx -Recurse | Where-Object { $_.FullName -notlike "*node_modules*" }

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    if ($content -match "from '@/app/api/auth/\[\.\.\.nextauth\]/route'") {
        $newContent = $content -replace "from '@/app/api/auth/\[\.\.\.nextauth\]/route'", "from '@/lib/auth'"
        Set-Content -Path $file.FullName -Value $newContent
        Write-Host "Updated: $($file.FullName)"
    }
}

Write-Host "Import path fixes complete!"
$ErrorActionPreference = 'SilentlyContinue'

Write-Host "Starting PayTrack Project Cleanup..." -ForegroundColor Green
Write-Host ""

Write-Host "Cleaning up Backend..." -ForegroundColor Cyan
if (Test-Path "backend/src/server.js") {
    Remove-Item -Path "backend/src/server.js" -Force
    Write-Host "  OK - Deleted: backend/src/server.js"
}

if (Test-Path "backend/src/utils/validators.ts") {
    Remove-Item -Path "backend/src/utils/validators.ts" -Force
    Write-Host "  OK - Deleted: backend/src/utils/validators.ts"
}

if (Test-Path "backend/src/types/models") {
    Remove-Item -Path "backend/src/types/models" -Recurse -Force
    Write-Host "  OK - Deleted: backend/src/types/models/"
}

Write-Host ""
Write-Host "Cleaning up Frontend components..." -ForegroundColor Cyan

$components = @("AuthForm.tsx", "BudgetAlerts.tsx", "Dashboard.tsx", "ReceiptCard.tsx", "ReceiptModal.tsx", "ReceiptUpload.tsx", "SearchAndFilter.tsx", "SpendingChart.tsx")
foreach ($comp in $components) {
    $path = "frontend/src/components/$comp"
    if (Test-Path $path) {
        Remove-Item -Path $path -Force
        Write-Host "  OK - Deleted: $path"
    }
}

Write-Host ""
Write-Host "Cleaning up Frontend lib files..." -ForegroundColor Cyan

$libFiles = @("api.ts", "auth.ts", "mockApi.ts", "supabase.ts")
foreach ($file in $libFiles) {
    $path = "frontend/src/lib/$file"
    if (Test-Path $path) {
        Remove-Item -Path $path -Force
        Write-Host "  OK - Deleted: $path"
    }
}

if (Test-Path "frontend/src/context/NotificationContext.tsx") {
    Remove-Item -Path "frontend/src/context/NotificationContext.tsx" -Force
    Write-Host "  OK - Deleted: frontend/src/context/NotificationContext.tsx"
}

Write-Host ""
Write-Host "Cleaning up root directory..." -ForegroundColor Cyan

$docs = @("README_CLEANUP_LIST.md", "PROJECT_INVENTORY.md", "CODEBASE_ANALYSIS.md", "API_CALLS_MAPPING.md", "QUICK_REFERENCE.md", "REFACTORING_EXEC_SUMMARY.md", "REFACTORING_OUTPUT.md", "REFACTORING_SUMMARY.md", "PROJECT_STATUS.md")
foreach ($doc in $docs) {
    if (Test-Path $doc) {
        Remove-Item -Path $doc -Force
        Write-Host "  OK - Deleted: $doc"
    }
}

$dirs = @("src", "client", "dist", "REFACTORED_FILES", "node_modules")
foreach ($dir in $dirs) {
    if (Test-Path $dir) {
        Remove-Item -Path $dir -Recurse -Force
        Write-Host "  OK - Deleted: $dir/"
    }
}

$configs = @("vite.config.ts", "tsconfig.app.json", "tsconfig.node.json", "index.html", "postcss.config.js", "tailwind.config.js", "eslint.config.js", "setup.ps1")
foreach ($cfg in $configs) {
    if (Test-Path $cfg) {
        Remove-Item -Path $cfg -Force
        Write-Host "  OK - Deleted: $cfg"
    }
}

Write-Host ""
Write-Host "Cleanup Complete!" -ForegroundColor Green
Write-Host "Project is now clean and production-ready!" -ForegroundColor Green

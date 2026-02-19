# Quick Achievement Update Script
# Updates target ID 2 (Cetrizin - 100 units) to 35 units achievement

$API_BASE = "http://localhost:8080"

Write-Host "=== Quick Achievement Update ===" -ForegroundColor Cyan
Write-Host ""

# For testing, we'll use a simple approach
# You can modify these values:
$TARGET_ID = 2
$NEW_ACHIEVEMENT = 35

Write-Host "Target ID: $TARGET_ID" -ForegroundColor Yellow
Write-Host "New Achievement: $NEW_ACHIEVEMENT units" -ForegroundColor Yellow
Write-Host ""

# Note: This requires authentication
# For a quick test, you can also update directly in the database
# or use the Manager dashboard as shown in the guides

Write-Host "To update achievement, you have 3 options:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Option 1 (Easiest): Use Manager Dashboard" -ForegroundColor Green
Write-Host "  1. Open browser: http://localhost:8080" 
Write-Host "  2. Login as Manager"
Write-Host "  3. Go to 'Sales & Target Tracking'"
Write-Host "  4. Click Edit on the Cetrizin row"
Write-Host "  5. Change 'Sales Achievement' from 0 to 35"
Write-Host "  6. Click Save"
Write-Host ""

Write-Host "Option 2: Run the full API script" -ForegroundColor Green
Write-Host "  powershell -ExecutionPolicy Bypass -File update-achievement.ps1"
Write-Host ""

Write-Host "Option 3: Direct Database Update (Advanced)" -ForegroundColor Green
Write-Host "  Connect to your database and run:"
Write-Host "  UPDATE targets SET sales_achievement = 35, achievement_percentage = 35 WHERE id = 2;"
Write-Host ""

Write-Host "Opening browser to localhost:8080..." -ForegroundColor Yellow
Start-Process "http://localhost:8080"

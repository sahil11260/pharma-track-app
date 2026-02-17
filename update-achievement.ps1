# Update Achievement via API - PowerShell Script
# This script updates the achievement value for a target directly through the API

# Configuration
$API_BASE = "http://localhost:8080"
$TARGET_ID = 2  # Change this to the ID of the target you want to update
$NEW_ACHIEVEMENT = 35  # Change this to the actual units sold

# Get auth token (you'll need to login first)
Write-Host "=== Update Target Achievement ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script will update target achievement through the API" -ForegroundColor Yellow
Write-Host ""

# Prompt for credentials
$email = Read-Host "Enter Manager Email"
$password = Read-Host "Enter Manager Password" -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))

Write-Host ""
Write-Host "Step 1: Logging in..." -ForegroundColor Green

# Login to get token
$loginBody = @{
    email    = $email
    password = $passwordPlain
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$API_BASE/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.token
    Write-Host "✓ Login successful!" -ForegroundColor Green
}
catch {
    Write-Host "✗ Login failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 2: Fetching current target data..." -ForegroundColor Green

# Get current target data
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type"  = "application/json"
}

try {
    $target = Invoke-RestMethod -Uri "$API_BASE/api/targets/$TARGET_ID" -Method GET -Headers $headers
    Write-Host "✓ Target found!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Current Target Details:" -ForegroundColor Cyan
    Write-Host "  Product: $($target.period)"
    Write-Host "  MR/Manager: $($target.mrName)"
    Write-Host "  Target: $($target.salesTarget) units"
    Write-Host "  Current Achievement: $($target.salesAchievement) units ($($target.achievementPercentage)%)"
}
catch {
    Write-Host "✗ Failed to fetch target: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 3: Updating achievement to $NEW_ACHIEVEMENT units..." -ForegroundColor Green

# Update the target
$updateBody = @{
    mrName           = $target.mrName
    salesTarget      = $target.salesTarget
    salesAchievement = $NEW_ACHIEVEMENT
    startDate        = $target.startDate
    endDate          = $target.endDate
    status           = $target.status
} | ConvertTo-Json

try {
    $updatedTarget = Invoke-RestMethod -Uri "$API_BASE/api/targets/$TARGET_ID" -Method PUT -Body $updateBody -Headers $headers
    Write-Host "✓ Achievement updated successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Updated Target Details:" -ForegroundColor Cyan
    Write-Host "  Product: $($updatedTarget.period)"
    Write-Host "  MR/Manager: $($updatedTarget.mrName)"
    Write-Host "  Target: $($updatedTarget.salesTarget) units"
    Write-Host "  New Achievement: $($updatedTarget.salesAchievement) units ($($updatedTarget.achievementPercentage)%)"
    Write-Host ""
    
    # Determine status based on percentage
    $percentage = $updatedTarget.achievementPercentage
    $status = if ($percentage -ge 90) { "Excellent (Green)" } 
    elseif ($percentage -ge 75) { "Good (Blue)" }
    elseif ($percentage -ge 50) { "Average (Yellow)" }
    else { "Poor (Red)" }
    
    Write-Host "  Status: $status" -ForegroundColor $(if ($percentage -ge 75) { "Green" } elseif ($percentage -ge 50) { "Yellow" } else { "Red" })
    Write-Host ""
    Write-Host "✓ Done! Refresh your browser to see the changes." -ForegroundColor Green
}
catch {
    Write-Host "✗ Failed to update target: $_" -ForegroundColor Red
    Write-Host "Error details: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

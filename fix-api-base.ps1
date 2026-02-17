$files = @(
    "Manager-Dashboard\assets\js\doctors.js",
    "assets\js\signup.js",
    "assets\js\login.js",
    "Manager-Dashboard\assets\js\navbar-notifications.js",
    "Manager-Dashboard\assets\js\mrs.js",
    "Manager-Dashboard\assets\js\expenses_api.js",
    "MR-Dashboard\assets\js\doctors.js",
    "MR-Dashboard\assets\js\dailyplan.js",
    "Manager-Dashboard\assets\js\expenses.js",
    "Admin_pharma\assets\js\user-management.js",
    "Admin_pharma\assets\js\reports-analytics.js",
    "Admin_pharma\assets\js\Profile.js",
    "Admin_pharma\assets\js\Product-distribution.js",
    "super-admin-dashboard\assets\js\expense-oversight.js",
    "Admin_pharma\assets\js\Notification.js",
    "Admin_pharma\assets\js\navbar-notifications.js",
    "Admin_pharma\assets\js\Mr-management.js",
    "Admin_pharma\assets\js\manager-manage.js",
    "Admin_pharma\assets\js\Expenses.js",
    "Admin_pharma\assets\js\Doctors-che.js",
    "MR-Dashboard\assets\js\expenses.js",
    "Manager-Dashboard\assets\js\Profile.js",
    "Manager-Dashboard\assets\js\notifications.js",
    "super-admin-dashboard\assets\js\notifications.js",
    "MR-Dashboard\assets\js\expenses_api.js",
    "Manager-Dashboard\assets\js\reports.js",
    "super-admin-dashboard\assets\js\profile-settings.js",
    "super-admin-dashboard\assets\js\product-management.js",
    "Manager-Dashboard\assets\js\samples.js",
    "super-admin-dashboard\assets\js\region-management.js",
    "Manager-Dashboard\assets\js\script.js",
    "MR-Dashboard\assets\js\notifications.js",
    "super-admin-dashboard\assets\js\script.js",
    "MR-Dashboard\assets\js\Profile.js",
    "MR-Dashboard\assets\js\product-sample.js",
    "Manager-Dashboard\assets\js\targets.js",
    "super-admin-dashboard\assets\js\target-management.js",
    "super-admin-dashboard\assets\js\user-management.js",
    "MR-Dashboard\assets\js\sales.js",
    "Manager-Dashboard\assets\js\targets_api.js",
    "MR-Dashboard\assets\js\sales_api.js",
    "Manager-Dashboard\assets\js\tasks.js",
    "MR-Dashboard\assets\js\visit-report.js"
)

$basePath = "src\main\resources\static"
$count = 0

foreach ($file in $files) {
    $fullPath = Join-Path $basePath $file
    
    if (Test-Path $fullPath) {
        $content = Get-Content $fullPath -Raw
        
        # Pattern 1: Replace complex API_BASE with simplified version
        $pattern1 = '\(\(typeof window\.API_BASE !== "undefined" && window\.API_BASE !== ""\) \? window\.API_BASE : ""\)'
        if ($content -match $pattern1) {
            $content = $content -replace [regex]::Escape($pattern1), '""'
            Set-Content -Path $fullPath -Value $content -NoNewline
            Write-Host "Updated: $file" -ForegroundColor Green
            $count++
        }
    }
}

Write-Host ""
Write-Host "Updated $count files" -ForegroundColor Cyan

# PowerShell script to fix specific corrupted text in specific files

$fixes = @(
    @{
        File = "src\main\resources\static\Manager-Dashboard\mrs.html"
        Line = 99
        Find = "          <h3 class=`"fw-bold`">ÃƒÂ°Ã…Â¸Ã¢â‚¬ËœÃ‚Â¨ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã…Â¡Ã¢â‚¬Â¢ÃƒÂ¯Ã‚Â¸Ã‚Â MR Management</h3>"
        Replace = "          <h3 class=`"fw-bold`">MR Management</h3>"
    },
    @{
        File = "src\main\resources\static\Admin_pharma\reports-analytics.html"
        Line = 115
        Find = "              <h3 id=`"totalExpenses`">ÃƒÆ'Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¹45,200</h3>"
        Replace = "              <h3 id=`"totalExpenses`">₹45,200</h3>"
    },
    @{
        File = "src\main\resources\static\Admin_pharma\reports-analytics.html"
        Line = 123
        Find = "              <h3 id=`"salesAchieved`">ÃƒÆ'Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¹2.4 Cr</h3>"
        Replace = "              <h3 id=`"salesAchieved`">₹2.4 Cr</h3>"
    }
)

foreach ($fix in $fixes) {
    $filePath = Join-Path $PSScriptRoot $fix.File
    if (Test-Path $filePath) {
        $content = Get-Content $filePath -Raw -Encoding UTF8
        $content = $content -replace [regex]::Escape($fix.Find), $fix.Replace
        Set-Content $filePath -Value $content -Encoding UTF8 -NoNewline
        Write-Host "Fixed: $($fix.File)" -ForegroundColor Green
    } else {
        Write-Host "File not found: $($fix.File)" -ForegroundColor Red
    }
}

Write-Host "`nAll fixes applied!" -ForegroundColor Cyan

# Fix Mojibake Characters in MR Dashboard Files
$ErrorActionPreference = "Stop"

Write-Host "Fixing mojibake characters in MR Dashboard files..." -ForegroundColor Cyan

# Define file path
$visitReportHtml = "c:\Users\Administrator\Downloads\Final_KavyaPharmaa\src\main\resources\static\MR-Dashboard\visit-report.html"

# Read file content
$content = Get-Content -Path $visitReportHtml -Raw -Encoding UTF8

# Replace mojibake characters with proper text/emoji
$content = $content -replace 'Ã°Å¸â€œÅ\s+', ''
$content = $content -replace 'Ã°Å¸â€œÂ¦', '📦'
$content = $content -replace 'Ã¢Å"â€¦', '✅'
$content = $content -replace 'Ã°Å¸Â§â€˜Ã¢â‚¬ÂÃ°Å¸â€™Â¼', ''

# Remove duplicate modal (lines 285-397)
$content = $content -replace '(?s)<div class="modal fade" id="dcrModal" tabindex="-1" aria-labelledby="dcrModalLabel" aria-hidden="true">.*?</div>\s*</div>\s*</div>\s*(?=\s*<!--\s*Profile)', ''

# Write back to file
$content | Out-File -FilePath $visitReportHtml -Encoding UTF8 -NoNewline

Write-Host "Mojibake characters fixed successfully!" -ForegroundColor Green

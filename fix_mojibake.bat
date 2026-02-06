@echo off
setlocal enabledelayedexpansion

echo Cleaning up corrupted UTF-8 characters in HTML files...
echo.

set "STATIC_DIR=src\main\resources\static"

for /r "%STATIC_DIR%" %%f in (*.html) do (
    echo Processing: %%f
    
    REM Create temp file
    set "TEMP_FILE=%%f.tmp"
    
    REM Use PowerShell to fix the file
    powershell -Command "$content = Get-Content -Path '%%f' -Raw -Encoding UTF8; $content = $content -replace 'ÃƒÆ''Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å\"ÃƒÆ''Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ''Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ', ''; $content = $content -replace 'ÃƒÆ''Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å\"ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦', ''; $content = $content -replace 'ÃƒÆ''Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ', ''; $content = $content -replace 'ÃƒÆ''Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å\"Ãƒâ€šÃ‚Â¨ÃƒÆ''Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ''Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢Ãƒâ€šÃ‚Â¼', ''; $content = $content -replace 'ÃƒÆ''Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å\"Ãƒâ€šÃ‚Â¨ÃƒÆ''Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ''Ã‚Â¢Ãƒâ€¦Ã‚Â¡ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÆ''Ã‚Â¯Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â ', ''; $content = $content -replace 'ÃƒÆ''Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Ãƒâ€šÃ‚Â ', ''; $content = $content -replace 'ÃƒÆ''Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¹', ''; $content = $content -replace 'ÃƒÆ''Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€šÃ‚Â§Ãƒâ€šÃ‚Â¾', ''; $content = $content -replace 'ÃƒÆ''Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€šÃ‚Â§ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å\"ÃƒÆ''Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ''Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢Ãƒâ€šÃ‚Â¼', ''; $content = $content -replace 'ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¹', '₹'; $content = $content -replace 'ÃƒÆ''Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¹', '₹'; $content = $content -replace 'ÃƒÆ''Ã‚Â¢Ãƒâ€¦Ã‚Â¾ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢', ''; $content = $content -replace 'ÃƒÆ''Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬', '€'; $content = $content -replace 'ÃƒÆ''Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£', '£'; $content = $content -replace 'ÃƒÆ''Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÂ¦Ã‚Â ', ''; $content = $content -replace 'ÃƒÆ''Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€šÃ‚Â§Ãƒâ€šÃ‚Â©', ''; $content = $content -replace 'ÃƒÆ''Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÂ¦Ã‚Â ', ''; $content = $content -replace 'ÃƒÆ''Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒâ€¹Ã¢â‚¬Â ', ''; Set-Content -Path '%%f' -Value $content -Encoding UTF8 -NoNewline"
)

echo.
echo Cleanup complete!
pause

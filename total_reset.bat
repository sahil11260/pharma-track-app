@echo off
echo ============================================
echo   Pharma Track - TOTAL PROJECT RESET
echo ============================================

echo [1/5] Killing all Java processes...
taskkill /F /IM java.exe 2>nul
timeout /t 2 >nul

echo [2/5] Cleaning all build folders...
for /r %%i in (target) do (
    if exist "%%i" (
        echo Deleting "%%i"
        rd /s /q "%%i" 2>nul
    )
)

echo [3/5] Fixing VS Code Java Index (Optional)...
echo If you see Java errors in VS Code, press Ctrl+Shift+P and run "Java: Clean Language Server Workspace"

echo [4/5] Rebuilding clean project...
call mvn clean install -DskipTests

echo [5/5] Starting server...
echo --------------------------------------------
echo Look for: "DEBUG: System received secret with length: 128"
echo --------------------------------------------
call mvn spring-boot:run
pause

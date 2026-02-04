@echo off
echo ============================================
echo   Pharma Track - Full Backend Reset
echo ============================================

echo [1/4] Killing existing Java processes...
taskkill /F /IM java.exe 2>nul

echo [2/4] Cleaning build artifacts...
rd /s /q target 2>nul
rd /s /q "Final_KavyaPharma\Pharma_Final_Projectt (2)\Pharma_Final_Projectt\Pharma_Final_Project\Backend\target" 2>nul

echo [3/4] Rebuilding project...
call mvn clean install -DskipTests

echo [4/4] Starting server...
echo --------------------------------------------
echo LOOK FOR "Started FarmaTrackBackendApplication"
echo AND "DEBUG: Generating JWT Sign-in Key"
echo --------------------------------------------
call mvn spring-boot:run
pause

@echo off
REM Quick Auto-Assign Script - Assigns ALL MRs to the FIRST Manager found

echo ========================================
echo   Quick MR Assignment Script
echo ========================================
echo.

REM Database configuration
set DB_HOST=localhost
set DB_PORT=3306
set DB_NAME=farmatrack
set DB_USER=root
set DB_PASS=root

echo Connecting to database: %DB_NAME%
echo.

REM Get the first manager's name
echo Finding Manager...
for /f "tokens=*" %%a in ('mysql -h %DB_HOST% -P %DB_PORT% -u %DB_USER% -p%DB_PASS% -D %DB_NAME% -N -e "SELECT name FROM app_user WHERE role = 'Manager' LIMIT 1;"') do set MANAGER_NAME=%%a

if "%MANAGER_NAME%"=="" (
    echo ERROR: No Manager found in database!
    echo Please create a Manager user first.
    pause
    exit /b
)

echo Found Manager: %MANAGER_NAME%
echo.

REM Show current MRs
echo Current MRs:
mysql -h %DB_HOST% -P %DB_PORT% -u %DB_USER% -p%DB_PASS% -D %DB_NAME% -e "SELECT name, email, assigned_manager FROM app_user WHERE role = 'MR';"
echo.

REM Assign all MRs to this manager
echo Assigning all MRs to '%MANAGER_NAME%'...
mysql -h %DB_HOST% -P %DB_PORT% -u %DB_USER% -p%DB_PASS% -D %DB_NAME% -e "UPDATE app_user SET assigned_manager = '%MANAGER_NAME%' WHERE role = 'MR';"
echo.

REM Verify
echo Verification - MRs after assignment:
mysql -h %DB_HOST% -P %DB_PORT% -u %DB_USER% -p%DB_PASS% -D %DB_NAME% -e "SELECT name, email, assigned_manager FROM app_user WHERE role = 'MR';"
echo.

REM Show DCRs
echo DCR Reports from assigned MRs:
mysql -h %DB_HOST% -P %DB_PORT% -u %DB_USER% -p%DB_PASS% -D %DB_NAME% -e "SELECT report_id, visit_title, mr_name, date_time FROM app_dcr WHERE mr_name IN (SELECT name FROM app_user WHERE role = 'MR' AND assigned_manager = '%MANAGER_NAME%') ORDER BY report_id DESC LIMIT 10;"
echo.

echo ========================================
echo   SUCCESS!
echo ========================================
echo All MRs have been assigned to: %MANAGER_NAME%
echo.
echo Next steps:
echo 1. Refresh the Manager's Reports ^& Feedbacks page
echo 2. Press Ctrl + Shift + R
echo 3. DCR reports should now appear!
echo.
pause

@echo off
REM Auto-Assign MRs to Manager Script
REM This script will automatically assign all MRs to a specified Manager

echo ========================================
echo   MR Assignment Script
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

REM Step 1: Show all managers
echo Step 1: Available Managers
echo --------------------------
mysql -h %DB_HOST% -P %DB_PORT% -u %DB_USER% -p%DB_PASS% -D %DB_NAME% -e "SELECT id, name, email FROM app_user WHERE role = 'Manager';"
echo.

REM Step 2: Get manager name from user
set /p MANAGER_NAME="Enter the EXACT Manager Name from above (copy and paste): "
echo.

REM Step 3: Show current MR assignments
echo Step 2: Current MR Assignments
echo ------------------------------
mysql -h %DB_HOST% -P %DB_PORT% -u %DB_USER% -p%DB_PASS% -D %DB_NAME% -e "SELECT id, name, email, assigned_manager FROM app_user WHERE role = 'MR';"
echo.

REM Step 4: Confirm assignment
set /p CONFIRM="Assign ALL MRs to '%MANAGER_NAME%'? (Y/N): "
if /i not "%CONFIRM%"=="Y" (
    echo.
    echo Assignment cancelled.
    pause
    exit /b
)

REM Step 5: Perform assignment
echo.
echo Assigning MRs to '%MANAGER_NAME%'...
mysql -h %DB_HOST% -P %DB_PORT% -u %DB_USER% -p%DB_PASS% -D %DB_NAME% -e "UPDATE app_user SET assigned_manager = '%MANAGER_NAME%' WHERE role = 'MR';"

REM Step 6: Verify assignment
echo.
echo Step 3: Verification - Updated MR Assignments
echo ---------------------------------------------
mysql -h %DB_HOST% -P %DB_PORT% -u %DB_USER% -p%DB_PASS% -D %DB_NAME% -e "SELECT id, name, email, assigned_manager FROM app_user WHERE role = 'MR';"
echo.

REM Step 7: Check DCRs for assigned MRs
echo Step 4: DCR Reports from Assigned MRs
echo -------------------------------------
mysql -h %DB_HOST% -P %DB_PORT% -u %DB_USER% -p%DB_PASS% -D %DB_NAME% -e "SELECT d.report_id, d.visit_title, d.mr_name, d.date_time FROM app_dcr d WHERE d.mr_name IN (SELECT name FROM app_user WHERE role = 'MR' AND assigned_manager = '%MANAGER_NAME%') ORDER BY d.report_id DESC LIMIT 10;"
echo.

echo ========================================
echo   Assignment Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Refresh the Manager's Reports ^& Feedbacks page
echo 2. Press Ctrl + Shift + R to hard refresh
echo 3. The DCR reports should now appear!
echo.
pause

@echo off
echo Running Sales Schema SQL...
mysql -u root -p kavyapharm_db < src\main\resources\db\sales_schema.sql
echo.
echo Done! Press any key to exit.
pause

@echo off
echo Stopping existing java processes...
taskkill /F /IM java.exe 2>nul
echo Building and starting backend...
call mvn clean install -DskipTests
call mvn spring-boot:run
pause

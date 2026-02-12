# rebuild_backend.ps1
# Script to rebuild the backend with strict MR segregation fixes

Write-Host "Searching for Maven installation..." -ForegroundColor Cyan

# Common Maven installation paths
$mavenPaths = @(
    "C:\apache-maven-3.9.9\bin\mvn.cmd",
    "C:\apache-maven-3.9.8\bin\mvn.cmd",
    "C:\apache-maven-3.8.6\bin\mvn.cmd",
    "C:\Program Files\Apache\Maven\bin\mvn.cmd",
    "C:\Program Files\apache-maven\bin\mvn.cmd",
    "$env:MAVEN_HOME\bin\mvn.cmd"
)

$mvnCmd = $null
foreach ($path in $mavenPaths) {
    if (Test-Path $path) {
        $mvnCmd = $path
        Write-Host "Found Maven at: $path" -ForegroundColor Green
        break
    }
}

if (-not $mvnCmd) {
    Write-Host "ERROR: Maven not found. Please install Maven or add it to PATH" -ForegroundColor Red
    Write-Host "Trying 'mvn' from PATH..." -ForegroundColor Yellow
    $mvnCmd = "mvn"
}

# Navigate to backend directory
$backendDir = $PSScriptRoot
Set-Location $backendDir

Write-Host "`nRebuilding backend JAR..." -ForegroundColor Cyan
& $mvnCmd clean package -DskipTests

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nBuild successful!" -ForegroundColor Green
    Write-Host "Now restart the backend with:" -ForegroundColor Yellow
    Write-Host "java -jar target/farmatrack-backend.jar --server.port=8082" -ForegroundColor Yellow
}
else {
    Write-Host "`nBuild failed. Please check the error messages above." -ForegroundColor Red
}

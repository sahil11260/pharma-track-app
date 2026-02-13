# Pharma Track App - Deployment Guide
## 🚀 Live Demo

🔗 https://pharma-track-app.onrender.com
This project has been restructured for seamless deployment and local development. The project is now "flat," meaning all source code is in the root directory.

## 🚀 Recent Fixes
1.  **Flattened Structure**: Everything is now at the top level. No more nested folders for the main application.
2.  **Removed Hardcoded URLs**: All JavaScript files now use relative paths (`const API_BASE = ""`).
3.  **Corrected Dockerfile**: The `Dockerfile` at the root will now build your project automatically on Render/Docker.

## 🛠️ How to Resolve "Changes not Visible" on Live Website

### 1. The Correct Project Root
Your project root is: `C:\Users\Administrator\Downloads\Final_KavyaPharmaa`.
Always edit files in the `src/main/resources/static/` folder at this level.

### 2. Push to GitHub
Run these commands from the root directory:
```bash
git add .
git commit -m "Flattened project structure and fixed URLs"
git push origin your-branch-name
```

### 3. Clear Render Build Cache
If you are using **Render**:
- Go to your service settings.
- Click **"Manual Deploy"**.
- Select **"Clear Build Cache & Deploy"**.

### 4. Render Settings
- **Root Directory**: Leave this **EMPTY**.
- **Build Command**: `mvn clean package -DskipTests` (if not using Docker).
- **Start Command**: `java -jar target/*.jar` (if not using Docker).
- **If using Docker**: Just select "Docker" as the runtime; the `Dockerfile` in the root will handle everything.

### 5. Browser Cache
Press **Ctrl + F5** on your live site to see the latest changes.

## 💻 Local Development
To run the project locally:
1.  Open terminal in the root directory.
2.  Run `./rebuild_backend.ps1` (on Windows) or `mvn spring-boot:run`.
3.  Access the app at `http://localhost:8080`.

> **⚠️ NOTE:** The folder `Final_KavyaPharma` is a backup and can be ignored. Only work with the files in the root.

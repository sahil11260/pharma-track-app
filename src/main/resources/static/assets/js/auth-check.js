(function () {
    const token = localStorage.getItem("kavya_auth_token");
    const role = localStorage.getItem("kavya_user_role");
    const path = window.location.pathname.toLowerCase();

    // Check for missing or invalid token
    const isUnauthenticated = !token || token.trim() === "" || token === "null" || token === "undefined";

    if (isUnauthenticated) {
        console.warn("Unauthorized access detected. Redirecting to login...");
        // Redirect to login page at root
        window.location.href = "/login.html";
        return;
    }

    // Role-based validation to prevent cross-dashboard access
    if (path.includes("/admin_pharma") && role !== "ADMIN" && role !== "SUPERADMIN") {
        console.warn("Access denied for Admin Dashboard. Role: " + role);
        window.location.href = "/index.html";
    } else if (path.includes("/manager-dashboard") && role !== "MANAGER" && role !== "SUPERADMIN") {
        console.warn("Access denied for Manager Dashboard. Role: " + role);
        window.location.href = "/index.html";
    } else if (path.includes("/mr-dashboard") && !["MR", "DOCTOR", "MANAGER", "SUPERADMIN"].includes(role)) {
        console.warn("Access denied for MR Dashboard. Role: " + role);
        window.location.href = "/index.html";
    }

})();

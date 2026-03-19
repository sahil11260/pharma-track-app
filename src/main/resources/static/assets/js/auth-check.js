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

(function () {
    document.addEventListener("keydown", function (e) {
        if (!e || e.defaultPrevented) return;
        if (e.key !== "Enter") return;
        if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;

        const el = e.target;
        if (!el || !el.closest) return;
        const tag = (el.tagName || "").toLowerCase();
        if (tag === "textarea") return;
        if (tag === "button") return;
        if (tag !== "input" && tag !== "select") return;

        const type = (el.getAttribute("type") || "").toLowerCase();
        if (type === "submit" || type === "button" || type === "reset") return;

        const scope = el.closest("form") || document;
        const focusables = Array.from(scope.querySelectorAll(
            "input:not([type=hidden]):not([disabled]):not([readonly]), select:not([disabled]), textarea:not([disabled]):not([readonly])"
        )).filter(function (node) {
            const style = window.getComputedStyle(node);
            return style && style.visibility !== "hidden" && style.display !== "none";
        });
        const idx = focusables.indexOf(el);
        if (idx < 0) return;
        const next = focusables.slice(idx + 1).find(function (node) {
            return node && typeof node.focus === "function";
        });
        if (!next) return;

        e.preventDefault();
        next.focus();
    }, true);
})();

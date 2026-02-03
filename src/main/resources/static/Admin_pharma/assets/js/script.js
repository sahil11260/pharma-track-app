document.addEventListener("DOMContentLoaded", () => {

  /* ============================
     📌 Sidebar Toggle
  ============================ */
  const sidebarToggle = document.getElementById("sidebarToggle");
  const sidebar = document.getElementById("sidebar");
  const mainContent = document.getElementById("mainContent");

  sidebarToggle.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
    mainContent.classList.toggle("expanded");
  });



  /* ============================
     🚪 Logout Handler
  ============================ */
  const logoutLinks = document.querySelectorAll('a[href="../index.html"], a[href="#logout"], a[href="#"]');
  logoutLinks.forEach(link => {
    // Check if the link text contains "Logout" or "logout"
    if (link.textContent.toLowerCase().includes('logout')) {
      link.addEventListener("click", (e) => {
        e.preventDefault();

        // Clear all authentication and session data
        localStorage.removeItem("kavya_auth_token");
        localStorage.removeItem("kavya_user");
        localStorage.removeItem("kavya_user_email");
        localStorage.removeItem("kavya_user_role");
        localStorage.removeItem("signup_name");
        localStorage.removeItem("signup_email");
        localStorage.removeItem("signup_role");

        // Redirect to home/login page
        window.location.href = "../index.html";
      });
    }
  });

  /* ============================
     📆 Dynamic Months (Auto-update till current month)
  ============================ */
  function getMonthsTillToday() {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentMonth = new Date().getMonth(); // 0 - 11
    return months.slice(0, currentMonth + 1);
  }

  const dynamicMonths = getMonthsTillToday();



  /* ============================
     📈 Charts are now handled by dashboard-data.js
  ============================ */

  /* ============================
     👤 Profile Modal Auto Data Load
  ============================ */
  const profileName = document.getElementById("profileName");
  const profileEmail = document.getElementById("profileEmail");

  const savedName = localStorage.getItem("signup_name") || "Admin User";
  const savedEmail = localStorage.getItem("signup_email") || "admin@kavyapharm.com";

  if (profileName) profileName.textContent = savedName;
  if (profileEmail) profileEmail.textContent = savedEmail;

});

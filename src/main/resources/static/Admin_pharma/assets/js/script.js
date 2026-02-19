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

  const userStr = localStorage.getItem("kavya_user");
  let currentUser = null;
  try { if (userStr) currentUser = JSON.parse(userStr); } catch (e) { }

  const savedName = (currentUser && currentUser.name) ? currentUser.name : (localStorage.getItem("signup_name") || "");
  const savedEmail = (currentUser && currentUser.email) ? currentUser.email : (localStorage.getItem("signup_email") || "");
  if (profileName) profileName.textContent = savedName;
  if (profileEmail) profileEmail.textContent = savedEmail;

  // Update Navbar name
  const userDropdownBtn = document.getElementById("userDropdown");
  if (userDropdownBtn) {
    // Keep the first child (icon or img) and replace the text
    const icon = userDropdownBtn.querySelector('i, img');
    userDropdownBtn.innerHTML = '';
    if (icon) userDropdownBtn.appendChild(icon);
    userDropdownBtn.appendChild(document.createTextNode(' ' + savedName));
  }

  // Load saved profile picture (Isolated by email)
  const userEmailForPic = savedEmail || localStorage.getItem("kavya_user_email");
  const profilePicKey = userEmailForPic ? `kavya_profile_pic_${userEmailForPic}` : 'kavya_profile_pic';
  const savedPic = localStorage.getItem(profilePicKey);

  if (savedPic) {
    // 1. Update Profile Modals
    document.querySelectorAll('img').forEach(img => {
      if (img.src.includes('flaticon') || img.src.includes('avatar') || img.src.includes('Profile-img.png') || img.src.includes('Profile-img') || img.closest('#profileModal')) {
        img.src = savedPic;
      }
    });

    // 2. Update Navbar Icon
    const navbarIcon = document.querySelector('#userDropdown i.bi-person-circle');
    if (navbarIcon) {
      const img = document.createElement('img');
      img.src = savedPic;
      img.className = 'rounded-circle';
      img.width = 30;
      img.height = 30;
      img.style.objectFit = 'cover';
      navbarIcon.parentNode.replaceChild(img, navbarIcon);
    }
  }

});

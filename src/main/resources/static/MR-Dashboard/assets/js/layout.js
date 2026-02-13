document.addEventListener("DOMContentLoaded", () => {

  const sidebar = document.getElementById("sidebar");
  const mainContent = document.getElementById("mainContent");
  const sidebarToggle = document.getElementById("sidebarToggle");

  /* SIDEBAR TOGGLE */
  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", () => {

      // MOBILE
      if (window.innerWidth <= 768) {
        sidebar.classList.toggle("mobile-open");
        return;
      }

      // DESKTOP COLLAPSE
      sidebar.classList.toggle("collapsed");
      mainContent.classList.toggle("expanded");
    });
  }

  /* Auto close sidebar on resize */
  window.addEventListener("resize", () => {
    if (window.innerWidth > 768) {
      sidebar.classList.remove("mobile-open");
    }
  });

  /* PROFILE DATA LOAD */
  function populateProfile() {
    const profileName = document.getElementById("profileName");
    const profileEmail = document.getElementById("profileEmail");
    const fullNameField = document.getElementById("fullName");
    const emailField = document.getElementById("email");

    const userStr = localStorage.getItem("kavya_user");
    let user = null;
    try { if (userStr) user = JSON.parse(userStr); } catch (e) { }

    const name = (user && user.name) ? user.name : (localStorage.getItem("signup_name") || "");
    const email = (user && user.email) ? user.email : (localStorage.getItem("signup_email") || localStorage.getItem("kavya_user_email") || "");
    if (profileName) profileName.textContent = name;
    if (profileEmail) profileEmail.textContent = email;
    if (fullNameField) fullNameField.value = name;
    if (emailField) emailField.value = email;

    // Update Navbar name
    const userDropdownBtn = document.getElementById("userDropdown");
    if (userDropdownBtn) {
      const icon = userDropdownBtn.querySelector('i, img');
      userDropdownBtn.innerHTML = '';
      if (icon) userDropdownBtn.appendChild(icon);
      userDropdownBtn.appendChild(document.createTextNode(' ' + name));
    }

    // Load saved profile picture
    const savedPic = localStorage.getItem('kavya_profile_pic');
    if (savedPic) {
      // 1. Update Profile Modal (replace icon with image if needed)
      const profileIconContainer = document.querySelector('#profileModal .bg-light.rounded-circle');
      if (profileIconContainer) {
        profileIconContainer.innerHTML = `<img src="${savedPic}" alt="Profile" class="rounded-circle" style="width: 100px; height: 100px; object-fit: cover;">`;
        profileIconContainer.classList.remove('p-3', 'bg-light');
      }

      // 2. Update Navbar Icon
      const navbarIcon = document.querySelector('nav .bi-person-circle');
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

    // Log the data for debugging if names are empty
    if (name === "MR User") console.warn("Profile Name not found in localStorage keys: kavya_user.name, signup_name");
  }

  populateProfile();

  /* LOGOUT HANDLER */
  const logoutLinks = document.querySelectorAll('a[href="../index.html"], a[href="#logout"], a[href="#"]');
  logoutLinks.forEach(link => {
    if (link.textContent.toLowerCase().includes('logout')) {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        // Clear specific auth data
        localStorage.removeItem("kavya_auth_token");
        localStorage.removeItem("kavya_user");
        localStorage.removeItem("kavya_user_email");
        localStorage.removeItem("kavya_user_role");
        localStorage.removeItem("signup_name");
        localStorage.removeItem("signup_email");
        localStorage.removeItem("signup_role");

        window.location.href = "../index.html";
      });
    }
  });

});

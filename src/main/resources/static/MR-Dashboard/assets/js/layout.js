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

    const name = (user && user.name) || localStorage.getItem("signup_name") || "MR User";
    const email = (user && user.email) || localStorage.getItem("signup_email") || localStorage.getItem("kavya_user_email") || "mr.user@kavyapharm.com";

    if (profileName) profileName.textContent = name;
    if (profileEmail) profileEmail.textContent = email;
    if (fullNameField) fullNameField.value = name;
    if (emailField) emailField.value = email;
  }

  populateProfile();

  /* LOGOUT HANDLER */
  const logoutLinks = document.querySelectorAll('a[href="../index.html"], a[href="#logout"], a[href="#"]');
  logoutLinks.forEach(link => {
    if (link.textContent.toLowerCase().includes('logout')) {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        localStorage.clear();
        window.location.href = "../index.html";
      });
    }
  });

});

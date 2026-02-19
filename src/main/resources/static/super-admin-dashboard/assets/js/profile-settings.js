document.addEventListener('DOMContentLoaded', () => {
  // Load user data from localStorage
  const userStr = localStorage.getItem('kavya_user');
  let currentUser = null;
  try {
    if (userStr) currentUser = JSON.parse(userStr);
  } catch (e) {
    console.error('Error parsing user data:', e);
  }

  const fullNameInput = document.getElementById('fullName');
  const emailInput = document.getElementById('email');
  const mobileInput = document.getElementById('mobileNumber');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const profileForm = document.getElementById('profileForm');

  // Profile Picture Elements
  const profileInput = document.getElementById('profile');
  const profilePreview = document.getElementById('profilePreview');
  const profileModalImg = document.querySelector('#profileModal img');

  // Populate existing user data
  if (currentUser) {
    fullNameInput.value = currentUser.name || '';
    emailInput.value = currentUser.email || '';
    mobileInput.value = currentUser.phone || '';
  } else {
    fullNameInput.value = localStorage.getItem('signup_name') || '';
    emailInput.value = localStorage.getItem('signup_email') || '';
  }

  // Load saved profile picture
  const savedProfilePic = localStorage.getItem('kavya_profile_pic');
  if (savedProfilePic) {
    if (profilePreview) {
      profilePreview.src = savedProfilePic;
      profilePreview.style.display = 'block';
    }
    if (profileModalImg) profileModalImg.src = savedProfilePic;

    // Update Navbar Icon
    const navbarIcon = document.querySelector('#userDropdown i.bi-person-circle');
    if (navbarIcon) {
      const img = document.createElement('img');
      img.src = savedProfilePic;
      img.className = 'rounded-circle';
      img.width = 30;
      img.height = 30;
      img.style.objectFit = 'cover';
      navbarIcon.parentNode.replaceChild(img, navbarIcon);
    }
  }

  // Handle Profile Picture Preview
  if (profileInput) {
    profileInput.addEventListener('change', function () {
      const file = this.files[0];
      if (file) {
        if (file.size > 2 * 1024 * 1024) {
          alert('File size exceeds 2MB limit.');
          this.value = '';
          return;
        }
        const reader = new FileReader();
        reader.onload = function (e) {
          if (profilePreview) {
            profilePreview.src = e.target.result;
            profilePreview.style.display = 'block';
          }
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Toggle password visibility
  const togglePassword = document.querySelector("#togglePassword");
  const toggleConfirmPassword = document.querySelector("#toggleConfirmPassword");

  if (togglePassword) {
    togglePassword.addEventListener("click", function () {
      const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
      passwordInput.setAttribute("type", type);
      const icon = this.querySelector("i");
      icon.classList.toggle("bi-eye");
      icon.classList.toggle("bi-eye-slash");
    });
  }

  if (toggleConfirmPassword) {
    toggleConfirmPassword.addEventListener("click", function () {
      const type = confirmPasswordInput.getAttribute("type") === "password" ? "text" : "password";
      confirmPasswordInput.setAttribute("type", type);
      const icon = this.querySelector("i");
      icon.classList.toggle("bi-eye");
      icon.classList.toggle("bi-eye-slash");
    });
  }

  // Form submission
  if (profileForm) {
    profileForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const fullName = fullNameInput.value.trim();
      const email = emailInput.value.trim();
      const mobile = mobileInput.value.trim();
      const pass = passwordInput.value;
      const confirmPass = confirmPasswordInput.value;

      const namePattern = /^[A-Za-z\s]{1,250}$/;
      const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      const mobilePattern = /^\d{10}$/;
      const passPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

      if (!namePattern.test(fullName)) {
        alert("Profile Name must contain only letters and spaces (max 250 characters).");
        return;
      }

      if (!emailPattern.test(email)) {
        alert("Please enter a valid email address.");
        return;
      }

      if (mobile && !mobilePattern.test(mobile)) {
        alert("Please enter exactly 10 digits for your mobile number.");
        return;
      }

      if (pass && !passPattern.test(pass)) {
        alert("Password must contain at least 8 characters, including uppercase, lowercase, number, and special character.");
        return;
      }

      if (pass !== confirmPass) {
        alert("Passwords do not match.");
        return;
      }

      // Save profile picture
      if (profileInput && profileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
          localStorage.setItem('kavya_profile_pic', e.target.result);
          if (profileModalImg) profileModalImg.src = e.target.result;
          document.querySelectorAll('.rounded-circle').forEach(img => {
            if (img.src.includes('Profile-img') || img.src.includes('avatar')) {
              img.src = e.target.result;
            }
          });
        };
        reader.readAsDataURL(profileInput.files[0]);
      }

      // API Call
      try {
        if (!currentUser || !currentUser.id) {
          alert('User session not found. Please log in again.');
          return;
        }

        const updateData = {
          name: fullName,
          role: currentUser.role,
          status: currentUser.status || "ACTIVE",
          phone: mobile,
          territory: currentUser.territory || "",
          assignedManager: currentUser.assignedManager || ""
        };

        if (pass) {
          updateData.password = pass;
        }

        const token = localStorage.getItem('kavya_auth_token') || localStorage.getItem('token');
        const API_BASE = (window.location.port === "5500") ? "http://localhost:8080" : ((typeof window.API_BASE !== "undefined" && window.API_BASE !== "") ? window.API_BASE : "");

        const response = await fetch(`${API_BASE}/api/users/${currentUser.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          body: JSON.stringify(updateData)
        });

        if (!response.ok) {
          const errorMsg = await response.text();
          throw new Error(errorMsg || 'Failed to update profile');
        }

        const updatedUser = await response.json();
        localStorage.setItem('kavya_user', JSON.stringify(updatedUser));
        localStorage.setItem('signup_name', updatedUser.name);

        alert('Profile updated successfully!');

        passwordInput.value = '';
        confirmPasswordInput.value = '';

      } catch (error) {
        console.error('Error updating profile:', error);
        alert('Failed to update profile: ' + error.message);
      }
    });
  }
});

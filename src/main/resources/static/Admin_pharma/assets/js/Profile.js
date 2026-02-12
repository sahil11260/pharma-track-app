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
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const profileForm = document.getElementById('profileForm');
    const formAlert = document.getElementById('formAlert');
    const strengthBar = document.getElementById('strengthBar');
    const strengthText = document.getElementById('strengthText');

    // Profile Picture Elements
    const profileInput = document.getElementById('profile');
    const profilePreview = document.getElementById('profilePreview');
    const profileModalImg = document.querySelector('#profileModal img');

    // Load existing user data
    if (currentUser) {
        fullNameInput.value = currentUser.name || '';
        emailInput.value = currentUser.email || '';
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
                // Check file size (2MB)
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

    // Password visibility toggle for Password field
    const togglePassword = document.getElementById('togglePassword');
    const togglePasswordIcon = document.getElementById('togglePasswordIcon');

    if (togglePassword) {
        togglePassword.addEventListener('click', () => {
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;
            if (type === 'text') {
                togglePasswordIcon.classList.replace('bi-eye', 'bi-eye-slash');
            } else {
                togglePasswordIcon.classList.replace('bi-eye-slash', 'bi-eye');
            }
        });
    }

    // Password visibility toggle for Confirm Password field
    const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
    const toggleConfirmPasswordIcon = document.getElementById('toggleConfirmPasswordIcon');

    if (toggleConfirmPassword) {
        toggleConfirmPassword.addEventListener('click', () => {
            const type = confirmPasswordInput.type === 'password' ? 'text' : 'password';
            confirmPasswordInput.type = type;
            if (type === 'text') {
                toggleConfirmPasswordIcon.classList.replace('bi-eye', 'bi-eye-slash');
            } else {
                toggleConfirmPasswordIcon.classList.replace('bi-eye-slash', 'bi-eye');
            }
        });
    }

    // Password strength checker
    if (passwordInput) {
        passwordInput.addEventListener('input', () => {
            const password = passwordInput.value;
            const strength = calculatePasswordStrength(password);
            if (strengthBar) strengthBar.className = '';
            if (password.length === 0) {
                if (strengthText) strengthText.textContent = '';
                return;
            }
            if (strength === 'weak') {
                strengthBar.classList.add('strength-weak');
                strengthText.textContent = 'Weak password';
                strengthText.style.color = '#dc3545';
            } else if (strength === 'medium') {
                strengthBar.classList.add('strength-medium');
                strengthText.textContent = 'Medium password';
                strengthText.style.color = '#ffc107';
            } else if (strength === 'strong') {
                strengthBar.classList.add('strength-strong');
                strengthText.textContent = 'Strong password';
                strengthText.style.color = '#28a745';
            }
        });
    }

    function calculatePasswordStrength(password) {
        if (password.length < 6) return 'weak';
        let strength = 0;
        if (password.length >= 8) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^a-zA-Z0-9]/.test(password)) strength++;
        if (strength <= 2) return 'weak';
        if (strength <= 4) return 'medium';
        return 'strong';
    }

    function validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    function validatePassword(password) {
        const minLength = password.length >= 8;
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecial = /[^a-zA-Z0-9]/.test(password);
        return minLength && hasUpper && hasLower && hasNumber && hasSpecial;
    }

    // Form submission
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Clear previous errors
            document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
            if (formAlert) formAlert.style.display = 'none';

            let isValid = true;

            // Validate email
            const email = emailInput.value.trim();
            if (!validateEmail(email)) {
                emailInput.classList.add('is-invalid');
                isValid = false;
            }

            // Validate password (only if user is trying to change it)
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            if (password || confirmPassword) {
                if (!validatePassword(password)) {
                    passwordInput.classList.add('is-invalid');
                    isValid = false;
                }
                if (password !== confirmPassword) {
                    confirmPasswordInput.classList.add('is-invalid');
                    isValid = false;
                }
            }

            if (!isValid) {
                showAlert('Please fix the errors before submitting.', 'danger');
                return;
            }

            // Save profile picture to localStorage if changed
            if (profileInput && profileInput.files[0]) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    localStorage.setItem('kavya_profile_pic', e.target.result);
                    if (profileModalImg) profileModalImg.src = e.target.result;
                    // Also update any other profile images on the page
                    document.querySelectorAll('.profile-img, .rounded-circle').forEach(img => {
                        if (img.src.includes('flaticon') || img.src.includes('avatar') || img.src.includes('Profile-img')) {
                            img.src = e.target.result;
                        }
                    });
                };
                reader.readAsDataURL(profileInput.files[0]);
            }

            // Prepare update data
            const updateData = {
                name: fullNameInput.value.trim(),
                role: currentUser ? currentUser.role : localStorage.getItem('kavya_user_role'),
                status: (currentUser && currentUser.status) ? currentUser.status : "ACTIVE",
                phone: (currentUser && currentUser.phone) ? currentUser.phone : "",
                territory: (currentUser && currentUser.territory) ? currentUser.territory : "",
                assignedManager: (currentUser && currentUser.assignedManager) ? currentUser.assignedManager : ""
            };

            if (password) {
                updateData.password = password;
            }

            try {
                const token = localStorage.getItem('kavya_auth_token') || localStorage.getItem('token');
                const userId = currentUser ? currentUser.id : null;

                if (!userId) {
                    showAlert('User session not found. Please log in again.', 'danger');
                    return;
                }

                const API_BASE = (window.location.port === "5500") ? "http://localhost:8080" : ((typeof window.API_BASE !== "undefined" && window.API_BASE !== "") ? window.API_BASE : "");
                const response = await fetch(`${API_BASE}/api/users/${userId}`, {
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

                // Update localStorage
                localStorage.setItem('kavya_user', JSON.stringify(updatedUser));
                localStorage.setItem('signup_name', updatedUser.name);

                showAlert('Profile updated successfully!', 'success');

                // Update UI elements
                const profileNameDisplay = document.getElementById("profileName");
                const profileEmailDisplay = document.getElementById("profileEmail");
                if (profileNameDisplay) profileNameDisplay.textContent = updatedUser.name;
                if (profileEmailDisplay) profileEmailDisplay.textContent = updatedUser.email;

                // Clear password fields
                passwordInput.value = '';
                confirmPasswordInput.value = '';
                if (strengthBar) strengthBar.className = '';
                if (strengthText) strengthText.textContent = '';

            } catch (error) {
                console.error('Error updating profile:', error);
                showAlert('Failed to update profile: ' + error.message, 'danger');
            }
        });
    }

    function showAlert(message, type) {
        if (!formAlert) return;
        formAlert.className = `alert alert-${type} mt-3`;
        formAlert.textContent = message;
        formAlert.style.display = 'block';
        if (type === 'success') {
            setTimeout(() => {
                formAlert.style.display = 'none';
            }, 5000);
        }
    }
});

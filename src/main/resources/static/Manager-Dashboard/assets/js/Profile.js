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

    // Populate existing user data
    if (currentUser) {
        fullNameInput.value = currentUser.name || '';
        emailInput.value = currentUser.email || '';
    }

    // Password visibility toggle for Password field
    const togglePassword = document.getElementById('togglePassword');
    const togglePasswordIcon = document.getElementById('togglePasswordIcon');

    togglePassword.addEventListener('click', () => {
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;

        // Toggle icon
        if (type === 'text') {
            togglePasswordIcon.classList.remove('bi-eye');
            togglePasswordIcon.classList.add('bi-eye-slash');
        } else {
            togglePasswordIcon.classList.remove('bi-eye-slash');
            togglePasswordIcon.classList.add('bi-eye');
        }
    });

    // Password visibility toggle for Confirm Password field
    const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
    const toggleConfirmPasswordIcon = document.getElementById('toggleConfirmPasswordIcon');

    toggleConfirmPassword.addEventListener('click', () => {
        const type = confirmPasswordInput.type === 'password' ? 'text' : 'password';
        confirmPasswordInput.type = type;

        // Toggle icon
        if (type === 'text') {
            toggleConfirmPasswordIcon.classList.remove('bi-eye');
            toggleConfirmPasswordIcon.classList.add('bi-eye-slash');
        } else {
            toggleConfirmPasswordIcon.classList.remove('bi-eye-slash');
            toggleConfirmPasswordIcon.classList.add('bi-eye');
        }
    });

    // Password strength checker
    passwordInput.addEventListener('input', () => {
        const password = passwordInput.value;
        const strength = calculatePasswordStrength(password);

        // Remove all strength classes
        strengthBar.className = '';

        if (password.length === 0) {
            strengthText.textContent = '';
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

    // Email validation
    function validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Password validation
    function validatePassword(password) {
        // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special char
        const minLength = password.length >= 8;
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecial = /[^a-zA-Z0-9]/.test(password);

        return minLength && hasUpper && hasLower && hasNumber && hasSpecial;
    }

    // Form submission
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Clear previous errors
        document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
        formAlert.style.display = 'none';

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
            // User is trying to change password
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

        // Prepare update data
        const updateData = {
            name: fullNameInput.value.trim(),
            email: email
        };

        // Include password only if it's being changed
        if (password) {
            updateData.password = password;
        }

        try {
            // Get auth token
            const token = localStorage.getItem('token') || localStorage.getItem('kavya_auth_token');

            if (!currentUser || !currentUser.id) {
                showAlert('User session not found. Please log in again.', 'danger');
                return;
            }

            // Make API call to update user
            const response = await fetch(`/api/users/${currentUser.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                throw new Error('Failed to update profile');
            }

            const updatedUser = await response.json();

            // Update localStorage
            localStorage.setItem('kavya_user', JSON.stringify(updatedUser));
            localStorage.setItem('signup_name', updatedUser.name);
            localStorage.setItem('signup_email', updatedUser.email);

            showAlert('Profile updated successfully!', 'success');

            // Clear password fields
            passwordInput.value = '';
            confirmPasswordInput.value = '';
            strengthBar.className = '';
            strengthText.textContent = '';

        } catch (error) {
            console.error('Error updating profile:', error);
            showAlert('Failed to update profile. Please try again.', 'danger');
        }
    });

    function showAlert(message, type) {
        formAlert.className = `alert alert-${type}`;
        formAlert.textContent = message;
        formAlert.style.display = 'block';

        // Auto-hide success messages after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                formAlert.style.display = 'none';
            }, 5000);
        }
    }
});

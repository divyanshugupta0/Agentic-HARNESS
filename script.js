document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const togglePassword = document.getElementById('togglePassword');
    const rememberCheckbox = document.getElementById('remember');

    // Toggle password visibility
    togglePassword.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.textContent = type === 'password' ? '👁' : '🙈';
    });

    // Form validation
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        
        let isValid = true;
        
        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) {
            showError(emailInput, 'Email is required');
            isValid = false;
        } else if (!emailRegex.test(email)) {
            showError(emailInput, 'Please enter a valid email address');
            isValid = false;
        } else {
            clearError(emailInput);
        }
        
        // Validate password
        if (!password) {
            showError(passwordInput, 'Password is required');
            isValid = false;
        } else if (password.length < 6) {
            showError(passwordInput, 'Password must be at least 6 characters');
            isValid = false;
        } else {
            clearError(passwordInput);
        }
        
        if (isValid) {
            // Simulate login
            const btn = loginForm.querySelector('.btn-login');
            const originalText = btn.textContent;
            btn.textContent = 'Signing In...';
            btn.disabled = true;
            
            setTimeout(() => {
                alert('Login successful!\nWelcome back!');
                btn.textContent = originalText;
                btn.disabled = false;
            }, 1500);
        }
    });
    
    function showError(input, message) {
        const formGroup = input.parentElement.parentElement;
        let errorElement = formGroup.querySelector('.error-message');
        
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'error-message';
            formGroup.appendChild(errorElement);
        }
        
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        input.style.borderColor = '#e74c3c';
    }
    
    function clearError(input) {
        const formGroup = input.parentElement.parentElement;
        const errorElement = formGroup.querySelector('.error-message');
        
        if (errorElement) {
            errorElement.style.display = 'none';
        }
        input.style.borderColor = '#e0e0e0';
    }
    
    // Clear errors on input
    emailInput.addEventListener('input', function() {
        clearError(this);
    });
    
    passwordInput.addEventListener('input', function() {
        clearError(this);
    });
    
    // Remember me functionality
    rememberCheckbox.addEventListener('change', function() {
        if (this.checked) {
            localStorage.setItem('rememberEmail', emailInput.value);
        } else {
            localStorage.removeItem('rememberEmail');
        }
    });
    
    // Load saved email if remember me was checked
    const savedEmail = localStorage.getItem('rememberEmail');
    if (savedEmail) {
        emailInput.value = savedEmail;
        rememberCheckbox.checked = true;
    }
    
    // Social login buttons
    const socialButtons = document.querySelectorAll('.btn-social');
    socialButtons.forEach(button => {
        button.addEventListener('click', function() {
            const platform = this.title;
            alert(`Redirecting to ${platform} login...`);
        });
    });
});
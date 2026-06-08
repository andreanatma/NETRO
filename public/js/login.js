// public/js/login.js
document.getElementById('login-form').addEventListener('submit', async function (event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('error-message');

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();

        if (data.accessToken) {
            localStorage.setItem('token', data.accessToken);
            localStorage.setItem('user', JSON.stringify(data));
            window.location.href = 'dashboard.html';
        } else {
            errorMessage.textContent = data.message || "Login failed!";
        }
    } catch (error) {
        errorMessage.textContent = "An error occurred. Please try again.";
    }
});
// public/js/auth.js
const token = localStorage.getItem('token');
if (!token) {
    // Jika tidak ada token, redirect ke halaman login
    window.location.href = 'login.html';
}
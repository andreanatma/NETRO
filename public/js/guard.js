// public/js/guard.js
(function() {
    const token = localStorage.getItem('token');
    
    // Jika tidak ada token, langsung tendang ke login
    if (!token) {
        window.location.href = 'login.html';
    }
    
    // Opsional: Anda bisa menambahkan logika cek expiry token di sini
    // untuk memastikan token yang ada belum kadaluarsa.
})();
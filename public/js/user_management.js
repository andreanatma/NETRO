document.addEventListener('DOMContentLoaded', function () {
    const token = localStorage.getItem('token');
    const tableBody = document.getElementById('user-table-body');
    const telegramTableBody = document.getElementById('telegram-table-body');
    const loader = document.getElementById('loader');
    
    // Tab & Container Elements
    const tabWeb = document.getElementById('tab-web');
    const tabTelegram = document.getElementById('tab-telegram');
    const webContainer = document.getElementById('web-user-container');
    const telegramContainer = document.getElementById('telegram-user-container');
    const headerActionContainer = document.getElementById('header-action-container');

    // Modal Elements (Untuk User Web)
    const modal = document.getElementById('user-modal');
    const form = document.getElementById('user-form');
    const userIdInput = document.getElementById('user-id');
    const modalTitle = document.getElementById('modal-title');
    const passwordInput = document.getElementById('password');
    const passwordHint = document.getElementById('password-hint');
    const nikInput = document.getElementById('nik');
    const usernameInput = document.getElementById('username'); 
    const emailInput = document.getElementById('email');
    const roleInput = document.getElementById('role');
    
    // Buttons
    const addUserBtn = document.getElementById('add-user-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const closeXBtn = document.getElementById('close-modal-x');

    // State
    let currentTab = 'web'; // 'web' atau 'telegram'

    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    // --- Helper Functions ---
    const showLoader = () => loader.classList.remove('hidden');
    const hideLoader = () => loader.classList.add('hidden');

    const getRoleBadge = (role) => {
        let style = 'bg-gray-100 text-gray-600 border-gray-200';
        let icon = 'fa-user';
        
        if (role === 'admin') {
            style = 'bg-purple-100 text-purple-700 border-purple-200';
            icon = 'fa-crown';
        } else if (role === 'staff') {
            style = 'bg-blue-100 text-blue-700 border-blue-200';
            icon = 'fa-edit';
        } else if (role === 'viewer') {
            style = 'bg-emerald-100 text-emerald-700 border-emerald-200';
            icon = 'fa-eye';
        }

        return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${style}">
                    <i class="fas ${icon} mr-1.5"></i> ${role}
                </span>`;
    };

    const getAvatar = (name) => {
        const safeName = name ? name.toString() : 'User'; 
        const initial = safeName.charAt(0).toUpperCase();
        const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-orange-500'];
        const colorClass = colors[safeName.length % colors.length];
        
        return `<div class="h-9 w-9 rounded-full ${colorClass} text-white flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-white flex-shrink-0">
                    ${initial}
                </div>`;
    };

    // ==========================================
    // TAB MANAGEMENT
    // ==========================================
    
    const switchTab = (tabName) => {
        currentTab = tabName;
        if (tabName === 'web') {
            // Style Tab
            tabWeb.className = "pb-3 text-sm font-bold border-b-2 border-indigo-600 text-indigo-600 transition-colors flex items-center gap-2 focus:outline-none";
            tabTelegram.className = "pb-3 text-sm font-bold border-b-2 border-transparent text-gray-500 hover:text-indigo-600 transition-colors flex items-center gap-2 focus:outline-none";
            // Konten
            webContainer.classList.remove('hidden');
            telegramContainer.classList.add('hidden');
            headerActionContainer.classList.remove('hidden'); // Tampilkan tombol Tambah User Web
            
            fetchUsers();
        } else {
            // Style Tab
            tabTelegram.className = "pb-3 text-sm font-bold border-b-2 border-indigo-600 text-indigo-600 transition-colors flex items-center gap-2 focus:outline-none";
            tabWeb.className = "pb-3 text-sm font-bold border-b-2 border-transparent text-gray-500 hover:text-indigo-600 transition-colors flex items-center gap-2 focus:outline-none";
            // Konten
            telegramContainer.classList.remove('hidden');
            webContainer.classList.add('hidden');
            headerActionContainer.classList.add('hidden'); // Sembunyikan tombol Tambah User Web
            
            fetchTelegramUsers();
        }
    };

    tabWeb.addEventListener('click', () => switchTab('web'));
    tabTelegram.addEventListener('click', () => switchTab('telegram'));

    // ==========================================
    // MODULE 1: USER WEB
    // ==========================================

    const fetchUsers = async () => {
        showLoader();
        try {
            const response = await fetch('/api/users', {
                headers: { 'x-access-token': token }
            });
            
            if (response.status === 403 || response.status === 401) {
                window.location.href = '403.html'; 
                return;
            }
            if (!response.ok) throw new Error('Gagal mengambil data user.');
            
            const users = await response.json();
            renderTable(users);
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="6" class="text-center p-8 text-red-500 bg-red-50 italic rounded-lg"><i class="fas fa-exclamation-triangle mr-2"></i> ${error.message}</td></tr>`;
        } finally {
            hideLoader();
        }
    };

    const renderTable = (users) => {
        tableBody.innerHTML = '';
        if (!users || users.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" class="text-center p-12 text-gray-400 italic">Belum ada user yang terdaftar.</td></tr>`;
            return;
        }

        users.forEach((user, index) => {
            const rowHTML = `
                <tr class="odd:bg-white even:bg-slate-50 border-b border-gray-100 hover:bg-indigo-50/40 transition-colors group">
                    <td class="px-6 py-4 font-medium text-gray-500 text-center">${index + 1}</td>
                    <td class="px-6 py-4 text-sm font-semibold text-gray-700 font-mono">${user.nik || '-'}</td>
                    <td class="px-6 py-4">
                        <div class="flex items-center">
                            ${getAvatar(user.name)}
                            <div class="ml-3">
                                <div class="text-sm font-bold text-gray-800">${user.name || 'Tanpa Nama'}</div>
                                <div class="text-[10px] text-gray-400">ID: ${user.id}</div>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4 text-gray-600 text-sm font-medium">${user.email || '-'}</td>
                    <td class="px-6 py-4 text-center">${getRoleBadge(user.role)}</td>
                    <td class="px-6 py-4 text-right">
                        <div class="flex justify-end gap-3">
                            <button class="btn-edit flex items-center bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-all shadow-sm active:scale-95" title="Edit Data" data-id="${user.id}">
                                <i class="fas fa-pencil-alt text-xs mr-1.5"></i> <span class="text-xs font-bold">Edit</span>
                            </button>
                            <button class="btn-delete flex items-center bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-all shadow-sm active:scale-95" title="Hapus User" data-id="${user.id}">
                                <i class="fas fa-trash-alt text-xs mr-1.5"></i> <span class="text-xs font-bold">Hapus</span>
                            </button>
                        </div>
                    </td>
                </tr>`;
            tableBody.innerHTML += rowHTML;
        });

        attachEventListeners();
    };

    // ==========================================
    // MODULE 2: USER TELEGRAM
    // ==========================================

    const fetchTelegramUsers = async () => {
        showLoader();
        try {
            const response = await fetch('/api/users/telegram-users', {
                headers: { 'x-access-token': token }
            });
            if (!response.ok) throw new Error('Gagal mengambil data user Telegram.');
            const users = await response.json();
            renderTelegramTable(users);
        } catch (error) {
            telegramTableBody.innerHTML = `<tr><td colspan="5" class="text-center p-8 text-red-500 bg-red-50 italic rounded-lg"><i class="fas fa-exclamation-triangle mr-2"></i> ${error.message}</td></tr>`;
        } finally {
            hideLoader();
        }
    };

    const renderTelegramTable = (users) => {
        telegramTableBody.innerHTML = '';
        if (!users || users.length === 0) {
            // Colspan diubah menjadi 5 karena kolom status dihapus
            telegramTableBody.innerHTML = `<tr><td colspan="5" class="text-center p-12 text-gray-400 italic"><i class="fab fa-telegram text-2xl block mb-2 opacity-50"></i> Belum ada user Telegram yang terdaftar di Bot Anda.</td></tr>`;
            return;
        }

        users.forEach((user, index) => {
            // PERBAIKAN: Gunakan full_name sesuai dengan database Anda
            const displayName = user.full_name || user.username || 'User Bot';
            const usernameText = user.username ? `@${user.username}` : '-';

            const rowHTML = `
                <tr class="odd:bg-white even:bg-blue-50/30 border-b border-gray-100 hover:bg-blue-50 transition-colors">
                    <td class="px-6 py-4 font-medium text-gray-500 text-center">${index + 1}</td>
                    <td class="px-6 py-4 text-sm font-semibold text-blue-700 font-mono">
                        <i class="fas fa-hashtag text-xs opacity-50 mr-1"></i>${user.user_id}
                    </td>
                    <td class="px-6 py-4">
                        <div class="flex items-center">
                            ${getAvatar(displayName.replace('@', ''))}
                            <div class="ml-3">
                                <div class="text-sm font-bold text-gray-800">${displayName}</div>
                                <div class="text-xs text-blue-600">${usernameText}</div>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4 text-center">
                        <div class="inline-block relative w-32 text-left">
                            <select id="tg-role-${user.id}" class="block appearance-none w-full bg-white border border-gray-300 hover:border-blue-500 px-3 py-1.5 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-semibold text-gray-700 cursor-pointer">
                                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                                <option value="staff" ${user.role === 'staff' ? 'selected' : ''}>Staff</option>
                                <option value="viewer" ${user.role === 'viewer' ? 'selected' : ''}>Viewer</option>
                            </select>
                            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500"><i class="fas fa-chevron-down text-[10px]"></i></div>
                        </div>
                    </td>
                    <td class="px-6 py-4 text-right">
                        <div class="flex justify-end gap-2">
                            <button onclick="saveTelegramUser(${user.id})" class="flex items-center bg-blue-100 text-blue-700 px-3 py-1.5 rounded hover:bg-blue-600 hover:text-white transition-colors shadow-sm active:scale-95" title="Simpan Perubahan">
                                <i class="fas fa-save text-xs"></i>
                            </button>
                            <button onclick="deleteTelegramUser(${user.id})" class="flex items-center bg-red-100 text-red-700 px-3 py-1.5 rounded hover:bg-red-600 hover:text-white transition-colors shadow-sm active:scale-95" title="Hapus Permanen">
                                <i class="fas fa-trash-alt text-xs"></i>
                            </button>
                        </div>
                    </td>
                </tr>`;
            telegramTableBody.innerHTML += rowHTML;
        });
    };

    // Fungsi Inline Save untuk User Telegram (Terekspos ke Global/Window)
    window.saveTelegramUser = async (id) => {
        const newRole = document.getElementById(`tg-role-${id}`).value;
        // Status dihapus dari payload

        try {
            const response = await fetch(`/api/users/telegram-users/${id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-access-token': token 
                },
                body: JSON.stringify({ role: newRole }) // Hanya kirim role
            });

            if (response.ok) {
                Swal.fire({ icon: 'success', title: 'Tersimpan!', text: 'Akses bot Telegram diperbarui.', timer: 1500, showConfirmButton: false });
                fetchTelegramUsers(); 
            } else {
                const err = await response.json();
                Swal.fire('Gagal', err.message, 'error');
            }
        } catch (error) {
            Swal.fire('Error', 'Terjadi kesalahan jaringan.', 'error');
        }
    };

    // Fungsi Delete untuk User Telegram (Terekspos ke Global/Window)
    window.deleteTelegramUser = (id) => {
        Swal.fire({
            title: 'Hapus User Bot?',
            text: "User ini tidak akan bisa menggunakan Bot Telegram lagi!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Ya, Hapus!'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const response = await fetch(`/api/users/telegram-users/${id}`, {
                        method: 'DELETE',
                        headers: { 'x-access-token': token }
                    });
                    if (response.ok) {
                        Swal.fire('Terhapus!', 'Akses Telegram berhasil dihapus.', 'success');
                        fetchTelegramUsers();
                    } else {
                        Swal.fire('Gagal', 'Terjadi kesalahan di server.', 'error');
                    }
                } catch (error) {
                    Swal.fire('Error', 'Terjadi kesalahan jaringan.', 'error');
                }
            }
        });
    };

    // ==========================================
    // MODAL FORM (USER WEB) & EVENT LISTENERS
    // ==========================================

    const openModal = (mode, user = null) => {
        modal.classList.remove('hidden');
        if (mode === 'add') {
            modalTitle.textContent = 'Tambah User Baru';
            form.reset();
            userIdInput.value = '';
            nikInput.value = '';
            passwordInput.required = true;
            passwordInput.placeholder = "Min. 6 karakter";
            passwordHint.textContent = 'Wajib diisi untuk user baru.';
            passwordHint.classList.remove('text-orange-500');
        } else {
            modalTitle.textContent = 'Edit User';
            userIdInput.value = user.id;
            nikInput.value = user.nik || '';
            usernameInput.value = user.name; 
            emailInput.value = user.email;
            roleInput.value = user.role;
            passwordInput.value = ''; 
            passwordInput.required = false;
            passwordInput.placeholder = "Biarkan kosong jika tidak diubah";
            passwordHint.textContent = 'Kosongkan jika tidak ingin mengubah password.';
            passwordHint.classList.add('text-orange-500');
        }
    };

    const closeModal = () => modal.classList.add('hidden');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = userIdInput.value;
        const payload = {
            nik: nikInput.value,
            name: usernameInput.value, 
            email: emailInput.value,
            role: roleInput.value
        };
        
        if (passwordInput.value) {
            payload.password = passwordInput.value;
        }

        const url = id ? `/api/users/${id}` : '/api/users';
        const method = id ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'x-access-token': token
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (response.ok) {
                Swal.fire({ icon: 'success', title: 'Berhasil', text: result.message, timer: 1500, showConfirmButton: false });
                closeModal();
                fetchUsers();
            } else {
                Swal.fire({ icon: 'error', title: 'Gagal', text: result.message });
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: error.message });
        }
    });

    const attachEventListeners = () => {
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                try {
                    const response = await fetch(`/api/users/${id}`, { headers: { 'x-access-token': token } });
                    if (response.ok) {
                        const user = await response.json();
                        openModal('edit', user);
                    }
                } catch (err) {
                    console.error(err);
                }
            });
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                
                if (currentUser.id && String(currentUser.id) === String(id)) {
                    Swal.fire('Akses Ditolak', 'Anda tidak bisa menghapus akun Anda sendiri.', 'error');
                    return;
                }

                Swal.fire({
                    title: 'Hapus User?',
                    text: "Akses user ini akan dicabut permanen!",
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#ef4444',
                    cancelButtonColor: '#6b7280',
                    confirmButtonText: 'Ya, Hapus!',
                    cancelButtonText: 'Batal'
                }).then(async (result) => {
                    if (result.isConfirmed) {
                        try {
                            const response = await fetch(`/api/users/${id}`, {
                                method: 'DELETE',
                                headers: { 'x-access-token': token }
                            });
                            
                            if (response.ok) {
                                Swal.fire('Terhapus!', 'User berhasil dihapus.', 'success');
                                fetchUsers();
                            } else {
                                const err = await response.json();
                                Swal.fire('Gagal!', err.message || 'Terjadi kesalahan.', 'error');
                            }
                        } catch (error) {
                            console.error(error);
                        }
                    }
                });
            });
        });
    };

    addUserBtn.addEventListener('click', () => openModal('add'));
    cancelBtn.addEventListener('click', closeModal);
    closeXBtn.addEventListener('click', closeModal);

    // Inisialisasi awal (Tampilkan tab Web)
    switchTab('web');
});
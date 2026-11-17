document.addEventListener("DOMContentLoaded", function () {
    const user = JSON.parse(localStorage.getItem("user"));

    // --- Security Check ---
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    const appContainer = document.getElementById("app-container");
    const mainContent = document.getElementById("main-content");
    if (!appContainer) return;

    const role = user.role || "viewer";

    // --- 1. MEMBUAT SIDEBAR CONTAINER ---
    // Catatan: posisi, lebar, transform, dan transisi sidebar SEPENUHNYA diatur
    // oleh CSS (#sidebar di main.css) agar konsisten di semua perangkat dan
    // tidak saling tabrak dengan class Tailwind. Di sini kita hanya menambahkan
    // class kosmetik (warna, border, dsb).
    const sidebar = document.createElement("aside");
    sidebar.id = "sidebar";
    sidebar.className = "border-r border-slate-800";

    // --- 2. GENERATE KONTEN SIDEBAR ---

    // A. LOGO SECTION
    const logoHTML = `
        <div class="flex items-center h-20 flex-shrink-0 relative">
            <div class="w-20 flex-shrink-0 flex items-center justify-center">
                <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                    <i class="fas fa-cube text-lg"></i>
                </div>
            </div>

            <div class="sb-text flex flex-col">
                <h1 class="text-xl font-bold text-white tracking-tight leading-none">
                    Netro<span class="text-indigo-500">Inventory</span>
                </h1>
                <span class="text-[0.6rem] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1">
                    System
                </span>
            </div>

            <button id="sidebar-close-btn" class="ml-auto mr-3 text-slate-400 hover:text-white p-2.5" aria-label="Tutup menu">
                <i class="fas fa-times text-xl"></i>
            </button>
        </div>

        <div class="w-full px-4 mb-2 flex-shrink-0">
            <div class="h-px bg-slate-800/60"></div>
        </div>
    `;

    // B. MENU NAVIGASI
    const menuItems = [
        { name: "Dashboard", link: "dashboard.html", icon: "fa-columns", roles: ["admin", "staff", "viewer"] },
        { name: "Manajemen Data", link: "manajemen.html", icon: "fa-database", roles: ["admin", "staff", "viewer"] },
        { name: "Rincian Modul", link: "count.html", icon: "fa-chart-pie", roles: ["admin", "staff", "viewer"] },
        { name: "Export Laporan", link: "export.html", icon: "fa-file-export", roles: ["admin", "staff"] },
        { name: "Laporan Aktivitas", link: "report.html", icon: "fa-history", roles: ["admin", "staff"] },
        { name: "User Management", link: "user_management.html", icon: "fa-users-cog", roles: ["admin"] }
    ];

    let navHTML = `<nav class="flex-1 space-y-1.5 overflow-y-auto overflow-x-hidden py-3 px-2 custom-scrollbar">`;
    const currentPage = window.location.pathname.split("/").pop();

    menuItems.forEach(item => {
        if (item.roles.includes(role)) {
            const isActive = currentPage === item.link;

            const activeClass = isActive
                ? "text-white bg-indigo-600 shadow-lg shadow-indigo-500/20"
                : "text-slate-400 hover:bg-slate-800 hover:text-white";

            navHTML += `
                <a href="${item.link}" class="sidebar-menu-link ${activeClass}">
                    <span class="w-16 flex-shrink-0 flex items-center justify-center">
                        <i class="fas ${item.icon} text-lg"></i>
                    </span>
                    <span class="sb-text font-medium text-sm">${item.name}</span>
                </a>
            `;
        }
    });
    navHTML += `</nav>`;

    // C. USER PROFILE
    const userInitial = user.name ? user.name.charAt(0).toUpperCase() : "U";

    const userHTML = `
        <div class="border-t border-slate-800 bg-[#0b1120] flex-shrink-0">
            <div class="flex items-center h-20 cursor-pointer hover:bg-slate-800/50 transition-colors" id="profile-trigger">

                <div class="w-20 flex-shrink-0 flex items-center justify-center">
                    <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-[#0f172a]">
                        ${userInitial}
                    </div>
                </div>

                <div class="sb-text flex items-center flex-1 min-w-0 pr-3">
                    <div class="flex flex-col flex-1 min-w-0 mr-2">
                        <p class="text-sm font-semibold text-white truncate" id="sidebar-username">${user.name || "User"}</p>
                        <p class="text-[10px] text-slate-400 uppercase font-bold tracking-wider truncate">${role}</p>
                    </div>

                    <button id="logout-btn" class="p-2.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Keluar" aria-label="Keluar">
                        <i class="fas fa-sign-out-alt text-lg"></i>
                    </button>
                </div>
            </div>
        </div>
    `;

    sidebar.innerHTML = logoHTML + navHTML + userHTML;

    // --- 3. INJEKSI KE DOM ---
    appContainer.prepend(sidebar);

    // --- 4. OVERLAY (untuk HP & Tablet saat sidebar terbuka) ---
    const overlay = document.createElement("div");
    overlay.id = "sidebar-overlay";
    document.body.appendChild(overlay);

    // --- 5. HEADER MOBILE/TABLET (tombol hamburger) ---
    // Tampil di bawah breakpoint desktop (lg, 1024px), tersembunyi otomatis di layar besar.
    const mobileHeader = document.createElement("div");
    mobileHeader.className = "lg:hidden flex justify-between items-center mb-6 bg-white px-4 py-3 rounded-xl shadow-sm border border-slate-200 sticky top-3 z-30";
    mobileHeader.innerHTML = `
        <div class="flex items-center gap-3 min-w-0">
            <div class="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white flex-shrink-0"><i class="fas fa-cube"></i></div>
            <span class="font-bold text-slate-800 text-base truncate">Netro Inventory</span>
        </div>
        <button id="mobile-menu-btn" class="text-slate-600 hover:text-indigo-600 p-2.5 -mr-2" aria-label="Buka menu">
            <i class="fas fa-bars text-xl"></i>
        </button>
    `;
    if (mainContent) mainContent.prepend(mobileHeader);

    // --- 6. LOGIKA BUKA/TUTUP SIDEBAR (HP & Tablet) ---
    function openSidebar() {
        sidebar.classList.add("sb-open");
        overlay.classList.add("show");
        document.body.classList.add("sb-locked");
    }
    function closeSidebar() {
        sidebar.classList.remove("sb-open");
        overlay.classList.remove("show");
        document.body.classList.remove("sb-locked");
    }

    const mobileBtn = document.getElementById("mobile-menu-btn");
    if (mobileBtn) mobileBtn.addEventListener("click", openSidebar);

    const closeBtn = document.getElementById("sidebar-close-btn");
    if (closeBtn) closeBtn.addEventListener("click", closeSidebar);

    overlay.addEventListener("click", closeSidebar);

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeSidebar();
    });

    // Jika layar di-resize (atau rotasi tablet) melewati breakpoint desktop
    // sementara sidebar mobile sedang terbuka, tutup otomatis agar tidak "nyangkut".
    const desktopMQ = window.matchMedia("(min-width: 1024px)");
    const handleViewportChange = (e) => {
        if (e.matches) closeSidebar();
    };
    if (desktopMQ.addEventListener) {
        desktopMQ.addEventListener("change", handleViewportChange);
    } else if (desktopMQ.addListener) {
        // fallback Safari lama
        desktopMQ.addListener(handleViewportChange);
    }

    // --- 7. EVENT LISTENERS LAINNYA ---

    // Logout Logic
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            Swal.fire({
                title: 'Keluar?',
                text: "Akhiri sesi login Anda?",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#4f46e5',
                cancelButtonColor: '#94a3b8',
                confirmButtonText: 'Ya, Keluar',
                cancelButtonText: 'Batal'
            }).then((result) => {
                if (result.isConfirmed) {
                    localStorage.clear();
                    window.location.href = "login.html";
                }
            });
        });
    }

    // Modal Profile Logic
    const profileTrigger = document.getElementById("profile-trigger");
    if (profileTrigger) {
        profileTrigger.addEventListener("click", () => {
             if (typeof openProfileModal === "function") openProfileModal();
        });
    }

    // Helper Modal function (sama seperti sebelumnya, disederhanakan)
    window.openProfileModal = function() {
        const modal = document.getElementById('profile-modal');
        if (modal) {
             modal.classList.remove('hidden');
             const nameInput = document.getElementById('profile-name');
             const emailInput = document.getElementById('profile-email');
             if (nameInput) nameInput.value = user.name;
             if (emailInput) emailInput.value = user.email;
        }
    };
});

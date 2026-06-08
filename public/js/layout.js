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
    const sidebar = document.createElement("aside");
    sidebar.id = "sidebar";
    
    // LOGIKA UTAMA:
    // w-20 (Default kecil) -> hover:w-72 (Melebar otomatis)
    // group: Digunakan untuk mendeteksi hover pada anak elemennya (teks)
    sidebar.className = "fixed inset-y-0 left-0 bg-[#0f172a] text-slate-300 transition-all duration-300 ease-in-out z-50 flex flex-col border-r border-slate-800 shadow-2xl group w-20 hover:w-72 overflow-hidden";
    
    // Transformasi Mobile (Hidden by default)
    sidebar.classList.add("-translate-x-full", "md:translate-x-0"); 

    // --- 2. GENERATE KONTEN SIDEBAR ---

    // A. LOGO SECTION
    const logoHTML = `
        <div class="flex items-center h-20 px-0 md:px-0 mb-2 mt-2 transition-all duration-300 relative overflow-hidden">
            <div class="w-20 flex-shrink-0 flex items-center justify-center">
                <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                    <i class="fas fa-cube text-lg"></i>
                </div>
            </div>
            
            <div class="flex flex-col opacity-0 w-0 group-hover:w-auto group-hover:opacity-100 transition-all duration-300 whitespace-nowrap overflow-hidden delay-75">
                <h1 class="text-xl font-bold text-white tracking-tight leading-none">
                    Netro<span class="text-indigo-500">Inventory</span>
                </h1>
                <span class="text-[0.6rem] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1">
                    System
                </span>
            </div>
        </div>
        
        <div class="w-full px-4 mb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
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

    let navHTML = `<nav class="flex-1 space-y-2 overflow-y-auto custom-scrollbar overflow-x-hidden py-2">`;
    const currentPage = window.location.pathname.split("/").pop();

    menuItems.forEach(item => {
        if (item.roles.includes(role)) {
            const isActive = currentPage === item.link;
            
            // Style Active
            const activeClass = isActive 
                ? "text-white bg-indigo-600 shadow-lg shadow-indigo-500/20" 
                : "text-slate-400 hover:bg-slate-800 hover:text-white";

            navHTML += `
                <a href="${item.link}" class="flex items-center py-3 mx-2 rounded-xl transition-all duration-200 cursor-pointer relative ${activeClass} group/item">
                    <div class="w-16 flex-shrink-0 flex items-center justify-center">
                        <i class="fas ${item.icon} text-lg transition-colors"></i>
                    </div>
                    
                    <span class="font-medium text-sm whitespace-nowrap opacity-0 w-0 group-hover:w-auto group-hover:opacity-100 transition-all duration-300 overflow-hidden delay-75">
                        ${item.name}
                    </span>

                    <div class="absolute left-16 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover/item:opacity-100 group-hover:opacity-0 transition-opacity z-50 pointer-events-none whitespace-nowrap shadow-xl border border-slate-700 ml-2">
                        ${item.name}
                    </div>
                </a>
            `;
        }
    });
    navHTML += `</nav>`;

    // C. USER PROFILE
    const userInitial = user.name ? user.name.charAt(0).toUpperCase() : "U";
    
    const userHTML = `
        <div class="border-t border-slate-800 bg-[#0b1120] mt-auto overflow-hidden">
            <div class="flex items-center h-20 transition-all duration-300 cursor-pointer relative hover:bg-slate-800/50" id="profile-trigger">
                
                <div class="w-20 flex-shrink-0 flex items-center justify-center">
                    <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-[#0f172a]">
                        ${userInitial}
                    </div>
                </div>

                <div class="flex items-center flex-1 min-w-0 pr-4 opacity-0 w-0 group-hover:w-auto group-hover:opacity-100 transition-all duration-300 overflow-hidden delay-75 whitespace-nowrap">
                    <div class="flex flex-col flex-1 min-w-0 mr-2">
                        <p class="text-sm font-semibold text-white truncate" id="sidebar-username">${user.name || "User"}</p>
                        <p class="text-[10px] text-slate-400 uppercase font-bold tracking-wider truncate">${role}</p>
                    </div>
                    
                    <button id="logout-btn" class="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Keluar">
                        <i class="fas fa-sign-out-alt text-lg"></i>
                    </button>
                </div>
            </div>
        </div>
    `;

    sidebar.innerHTML = logoHTML + navHTML + userHTML;

    // --- 3. INJEKSI KE DOM & SETUP LOGIC ---
    
    appContainer.prepend(sidebar);

    // Set Main Content Margin (Hanya selebar Sidebar Kecil)
    if (mainContent) {
        // md:ml-20 artinya pada layar desktop, margin kiri konten adalah 80px (ukuran sidebar kecil)
        // Sidebar akan mengambang (float) di atas konten saat melebar.
        mainContent.className = "transition-all duration-300 min-h-screen md:ml-20";
    }

    // --- 4. EVENT LISTENERS ---

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
    // (Pastikan kode Modal HTML Anda ada di file index.html atau di-inject di sini seperti sebelumnya)
    const profileTrigger = document.getElementById("profile-trigger");
    if (profileTrigger) {
        profileTrigger.addEventListener("click", () => {
             if (typeof openProfileModal === "function") openProfileModal();
        });
    }
    
    // --- 5. LOGIC MOBILE (HAMBURGER) ---
    // Karena "Hover" tidak bekerja di HP, kita pakai tombol hamburger biasa untuk HP.
    const mobileHeader = document.createElement("div");
    mobileHeader.className = "md:hidden flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-slate-200 sticky top-4 z-40 mx-4 mt-4";
    mobileHeader.innerHTML = `
        <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white"><i class="fas fa-cube"></i></div>
            <span class="font-bold text-slate-800 text-lg">Netro Inventory</span>
        </div>
        <button id="mobile-menu-btn" class="text-slate-600 hover:text-indigo-600 p-2"><i class="fas fa-bars text-xl"></i></button>
    `;
    
    if (mainContent) mainContent.prepend(mobileHeader);

    // Overlay Mobile
    const overlay = document.createElement("div");
    overlay.className = "fixed inset-0 bg-slate-900/50 z-40 hidden backdrop-blur-sm transition-opacity opacity-0 md:hidden"; // md:hidden agar tidak ganggu desktop
    document.body.appendChild(overlay);

    const mobileBtn = document.getElementById("mobile-menu-btn");
    if (mobileBtn) {
        mobileBtn.addEventListener("click", () => {
            sidebar.classList.remove("-translate-x-full");
            // Saat di mobile, kita paksa lebarnya full (w-72) agar teks terlihat
            sidebar.classList.remove("w-20"); 
            sidebar.classList.add("w-72");
            
            // Tampilkan elemen teks secara paksa di mobile
            const texts = sidebar.querySelectorAll(".opacity-0");
            texts.forEach(t => t.classList.remove("opacity-0", "w-0"));
            
            overlay.classList.remove("hidden");
            setTimeout(() => overlay.classList.remove("opacity-0"), 10);
        });
    }

    overlay.addEventListener("click", () => {
        sidebar.classList.add("-translate-x-full");
        overlay.classList.add("opacity-0");
        setTimeout(() => {
            overlay.classList.add("hidden");
            // Reset ke state default (hover style) saat ditutup
            sidebar.classList.add("w-20");
            sidebar.classList.remove("w-72");
        }, 300);
    });

    // Helper Modal function (sama seperti sebelumnya, disederhanakan)
    window.openProfileModal = function() {
        // Pastikan elemen modal ada di HTML Anda
        const modal = document.getElementById('profile-modal'); 
        if(modal) {
             modal.classList.remove('hidden');
             const nameInput = document.getElementById('profile-name');
             const emailInput = document.getElementById('profile-email');
             if(nameInput) nameInput.value = user.name;
             if(emailInput) emailInput.value = user.email;
        }
    };
});
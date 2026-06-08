document.addEventListener('DOMContentLoaded', async function () {
    const token = localStorage.getItem('token');
    
    // --- 1. Set Tanggal Header ---
    const dateElement = document.getElementById('date-text');
    if (dateElement) {
        const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
        dateElement.textContent = new Date().toLocaleDateString('id-ID', options);
    }

    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // --- Helper Functions ---
    const fetchWithAuth = async (url) => {
        try {
            const response = await fetch(url, { headers: { 'x-access-token': token } });
            if (response.status === 403) return window.location.href = '403.html';
            return await response.json();
        } catch (error) {
            console.error("Fetch Error:", error);
            return null;
        }
    };

    // Fungsi Animasi Angka (Count Up)
    const animateCountUp = (id, endValue) => {
        const el = document.getElementById(id);
        if (!el) return;
        const end = parseInt(endValue, 10) || 0;
        if (end === 0) { el.textContent = "0"; return; }
        
        let start = 0;
        const duration = 1500;
        const startTime = performance.now();

        const update = (now) => {
            const progress = Math.min((now - startTime) / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 4); 
            el.textContent = Math.floor(start + (end - start) * ease);
            if (progress < 1) requestAnimationFrame(update);
            else el.textContent = end;
        };
        requestAnimationFrame(update);
    };

    const sumObj = (obj) => obj ? Object.values(obj).reduce((a, b) => a + b, 0) : 0;

    // --- 2. Load Statistik (Card & Grafik) ---
    const loadStats = async () => {
        const data = await fetchWithAuth('/api/count');
        if (data) {
            // Hitung Total dari data API
            const sfpI = sumObj(data.sfp_idle), sfpU = sumObj(data.sfp_used);
            const lpufI = sumObj(data.lpuf_idle), lpufU = sumObj(data.lpuf_used);
            const cardI = sumObj(data.card_idle), cardU = sumObj(data.card_used);

            animateCountUp('total-sfp', sfpI + sfpU);
            animateCountUp('sfp-idle', sfpI);
            animateCountUp('sfp-used', sfpU);

            animateCountUp('total-lpuf', lpufI + lpufU);
            animateCountUp('lpuf-idle', lpufI);
            animateCountUp('lpuf-used', lpufU);

            animateCountUp('total-card', cardI + cardU);
            animateCountUp('card-idle', cardI);
            animateCountUp('card-used', cardU);

            renderChart(data);
        }
    };

    // --- 3. Render Chart.js ---
    const renderChart = (data) => {
        const ctx = document.getElementById('assetsChart');
        if (!ctx) return;

        const sites = ['SMG', 'JGJ', 'KDS', 'SLO', 'PWT', 'PKL', 'MGL'];
        // Agregasi total per site
        const totals = sites.map(site => {
            return (data.sfp_idle[site]||0) + (data.sfp_used[site]||0) +
                   (data.lpuf_idle[site]||0) + (data.lpuf_used[site]||0) +
                   (data.card_idle[site]||0) + (data.card_used[site]||0);
        });

        const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.8)');
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0.1)');

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sites,
                datasets: [{
                    label: 'Total Aset',
                    data: totals,
                    backgroundColor: gradient,
                    borderRadius: 6,
                    barPercentage: 0.5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { borderDash: [4, 4], color: '#f3f4f6' } },
                    x: { grid: { display: false } }
                },
                animation: { duration: 1500, easing: 'easeOutQuart' }
            }
        });
    };

    // --- 4. Load Aktivitas Terkini (dari endpoint Report) ---
    const loadRecentActivities = async () => {
        const logs = await fetchWithAuth('/api/report/logs');
        const container = document.getElementById('recent-activities');
        
        if (logs && Array.isArray(logs)) {
            const recentLogs = logs.slice(0, 5); // Ambil 5 data terbaru
            container.innerHTML = '';

            if (recentLogs.length === 0) {
                container.innerHTML = `<div class="text-center text-gray-400 py-8 text-sm">Belum ada aktivitas.</div>`;
                return;
            }

            recentLogs.forEach(log => {
                let iconBg = 'bg-gray-100 text-gray-500';
                let icon = 'fa-info';
                let textColor = 'text-gray-600';
                let borderColor = 'border-gray-200';

                if (log.action === 'CREATE') { 
                    iconBg = 'bg-green-100 text-green-600'; icon = 'fa-plus'; 
                    textColor = 'text-green-700'; borderColor = 'border-green-200';
                } else if (log.action === 'UPDATE') { 
                    iconBg = 'bg-blue-100 text-blue-600'; icon = 'fa-pen'; 
                    textColor = 'text-blue-700'; borderColor = 'border-blue-200';
                } else if (log.action === 'DELETE') { 
                    iconBg = 'bg-red-100 text-red-600'; icon = 'fa-trash'; 
                    textColor = 'text-red-700'; borderColor = 'border-red-200';
                }

                const dateObj = new Date(log.createdAt);
                const dateStr = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                const timeStr = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');

                // Detail logic: jika JSON, coba ambil info, atau fallback ke detail
                let detailText = log.details || '';
                try {
                    if (detailText.startsWith('{')) {
                        // Jika JSON, kita tidak parse penuh di sini untuk UI ringkas
                        // Bisa diganti pesan generik atau di-parse jika perlu
                        detailText = "Perubahan data sistem";
                    }
                } catch(e) {}
                
                if (detailText.length > 40) detailText = detailText.substring(0, 40) + '...';

                const html = `
                <div class="flex items-start space-x-3 p-3 rounded-xl bg-white border ${borderColor} hover:shadow-md transition-all group">
                    <div class="flex-shrink-0 mt-1">
                        <div class="w-8 h-8 rounded-full ${iconBg} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                            <i class="fas ${icon} text-xs text-white"></i>
                        </div>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-center mb-0.5">
                            <p class="text-xs font-bold text-gray-800 truncate">
                                ${log.User ? log.User.username : 'System'}
                            </p>
                            <span class="text-[10px] font-medium text-gray-400 bg-white border border-gray-100 px-2 py-0.5 rounded-full shadow-sm">
                                ${dateStr}, ${timeStr}
                            </span>
                        </div>
                        <p class="text-xs text-gray-500 font-medium">
                            <span class="font-bold ${textColor} mr-1">${log.action}</span> 
                            ${log.module}
                        </p>
                        <p class="text-[10px] text-gray-400 mt-1 italic truncate">
                            ${detailText}
                        </p>
                    </div>
                </div>`;
                
                container.innerHTML += html;
            });
        } else {
            container.innerHTML = `<div class="text-center text-red-400 py-4 text-sm">Gagal memuat log.</div>`;
        }
    };

    // --- 5. Logika Accordion untuk Kartu Site ---
    const initSiteCard = () => {
        const siteCard = document.getElementById('site-card');
        const siteList = document.getElementById('site-list');
        const siteChevron = document.getElementById('site-chevron');
        const listContainer = document.getElementById('site-list-container');

        const sites = [
            { code: 'SMG', name: 'Semarang', color: 'bg-blue-50 text-blue-700 border-blue-100' },
            { code: 'JGJ', name: 'Yogyakarta', color: 'bg-purple-50 text-purple-700 border-purple-100' },
            { code: 'KDS', name: 'Kudus', color: 'bg-orange-50 text-orange-700 border-orange-100' },
            { code: 'SLO', name: 'Solo', color: 'bg-yellow-50 text-yellow-700 border-yellow-100' },
            { code: 'PWT', name: 'Purwokerto', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
            { code: 'PKL', name: 'Pekalongan', color: 'bg-cyan-50 text-cyan-700 border-cyan-100' },
            { code: 'MGL', name: 'Magelang', color: 'bg-pink-50 text-pink-700 border-pink-100' }
        ];

        listContainer.innerHTML = sites.map(site => `
            <div class="flex items-center p-2 rounded-lg border ${site.color} hover:shadow-sm transition-all cursor-default">
                <div class="font-bold text-xs mr-2 w-8">${site.code}</div>
                <div class="text-[10px] uppercase font-medium opacity-80 truncate">${site.name}</div>
            </div>
        `).join('');

        siteCard.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = siteList.classList.contains('hidden');
            if (isHidden) {
                siteList.classList.remove('hidden');
                siteList.classList.add('animate-fade-in-down');
                siteChevron.style.transform = 'rotate(180deg)';
                siteCard.classList.add('ring-2', 'ring-emerald-100');
            } else {
                siteList.classList.add('hidden');
                siteChevron.style.transform = 'rotate(0deg)';
                siteCard.classList.remove('ring-2', 'ring-emerald-100');
            }
        });
    };

    // Jalankan semua
    initSiteCard();
    loadStats();
    loadRecentActivities();
});
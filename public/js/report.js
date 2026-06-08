document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('token');
    
    // Elemen DOM
    const tableBody = document.getElementById('log-table-body');
    const monthFilter = document.getElementById('month-filter');
    const siteFilter = document.getElementById('site-filter');
    const actionFilter = document.getElementById('action-filter');
    const exportBtn = document.getElementById('export-btn');
    const refreshBtn = document.getElementById('refresh-btn');
    const loader = document.getElementById('loader');
    const logCountLabel = document.getElementById('log-count');

    // Cek Login
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // Set Default Bulan (Bulan Ini)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    monthFilter.value = `${year}-${month}`;
    
    // --- Helper Functions ---
    const showLoader = () => loader.classList.remove('hidden');
    const hideLoader = () => loader.classList.add('hidden');

    // Format Tanggal & Waktu
    const formatDate = (isoString) => {
        const date = new Date(isoString);
        return {
            date: date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
            time: date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':')
        };
    };

    // Badge Aksi Warna-warni
    const getActionBadge = (action) => {
        let style = 'bg-gray-100 text-gray-600 border-gray-200';
        let icon = 'fa-info-circle';

        if (action === 'CREATE') { 
            style = 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-100'; 
            icon = 'fa-plus';
        } else if (action === 'UPDATE') { 
            style = 'bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-100'; 
            icon = 'fa-pencil-alt';
        } else if (action === 'DELETE') { 
            style = 'bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-100'; 
            icon = 'fa-trash';
        }

        return `<span class="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[10px] font-bold border ${style} uppercase tracking-wide min-w-[80px]">
                    <i class="fas ${icon} mr-1.5"></i> ${action}
                </span>`;
    };

    // Format Detail (Code Snippet Logic)
    const formatDetail = (detail) => {
        if (!detail) return '<span class="text-gray-400 italic">-</span>';
        
        // Cek apakah string adalah JSON
        if (typeof detail === 'string' && (detail.startsWith('{') || detail.startsWith('['))) {
            try {
                // Bersihkan tanda kutip berlebih untuk atribut title tooltip
                const cleanDetail = detail.replace(/"/g, '&quot;');
                // Tampilkan dalam tag code dengan class code-snippet (CSS handle wrapping)
                return `<code class="code-snippet" title="${cleanDetail}">${detail}</code>`;
            } catch (e) {
                return `<span class="text-gray-700 text-sm whitespace-normal">${detail}</span>`;
            }
        }
        // Text biasa
        return `<span class="text-gray-700 text-sm whitespace-normal block max-w-lg leading-relaxed">${detail}</span>`;
    };

    // --- MAIN FETCH FUNCTION ---
    const fetchLogs = async () => {
        showLoader();
        
        const selectedMonth = monthFilter.value;
        const selectedSite = siteFilter.value;
        const selectedAction = actionFilter.value;

        // Bangun URL Query Params
        const params = new URLSearchParams();
        if (selectedMonth) params.append('month', selectedMonth);
        if (selectedSite) params.append('site', selectedSite);
        
        let url = `/api/report/logs?${params.toString()}`;
        
        try {
            const response = await fetch(url, { headers: { 'x-access-token': token } });
            if (!response.ok) throw new Error('Gagal memuat data log.');
            
            let logs = await response.json();
            
            // Client-side Filter untuk Action (Jika backend belum support)
            if (selectedAction) {
                logs = logs.filter(log => log.action === selectedAction);
            }

            renderTable(logs);

        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center p-8 text-red-500 bg-red-50 rounded-lg mx-4 my-2"><i class="fas fa-exclamation-triangle mr-2"></i> ${error.message}</td></tr>`;
        } finally {
            hideLoader();
        }
    };

    // --- RENDER TABLE ---
    const renderTable = (logs) => {
        tableBody.innerHTML = '';

        if (logs.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-16 text-center text-gray-400 flex flex-col items-center justify-center">
                        <div class="bg-gray-50 p-4 rounded-full mb-3">
                            <i class="far fa-folder-open text-3xl text-gray-300"></i>
                        </div>
                        <span class="text-sm font-medium">Tidak ada aktivitas ditemukan untuk filter ini.</span>
                    </td>
                </tr>`;
            logCountLabel.textContent = 'Menampilkan 0 data';
            return;
        }

        logs.forEach((log) => {
            const { date, time } = formatDate(log.createdAt);
            const userName = log.User ? log.User.username : (log.user || 'System');
            const userInitial = userName.charAt(0).toUpperCase();
            
            // Zebra Striping + Align Top + Wrapping
            const rowHTML = `
                <tr class="odd:bg-white even:bg-slate-50 border-b border-gray-100 hover:bg-blue-50/40 transition-colors group">
                    
                    <td class="px-6 py-4 whitespace-nowrap align-top">
                        <div class="flex flex-col">
                            <span class="text-sm font-bold text-gray-800">${date}</span>
                            <span class="text-xs text-gray-500 font-mono mt-0.5">${time}</span>
                        </div>
                    </td>

                    <td class="px-6 py-4 align-top">
                        <div class="flex items-start">
                            <div class="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex-shrink-0 flex items-center justify-center font-bold text-xs mr-3 shadow-sm ring-2 ring-white mt-1">
                                ${userInitial}
                            </div>
                            <div class="flex flex-col">
                                <span class="text-sm font-semibold text-gray-800">${userName}</span>
                                <span class="text-[10px] text-gray-400 uppercase tracking-wide">ID: ${log.user_id || '-'}</span>
                            </div>
                        </div>
                    </td>

                    <td class="px-6 py-4 text-center align-top">
                        ${log.site || (log.module && log.module.includes('SMG')) ? 
                            '<span class="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md text-xs font-bold border border-gray-200 shadow-sm inline-block">' + (log.site || 'N/A') + '</span>' 
                            : '<span class="text-gray-400 text-xs">-</span>'}
                    </td>

                    <td class="px-6 py-4 text-center align-top">
                        <div class="flex flex-col items-center">
                            ${getActionBadge(log.action)}
                            <div class="text-[10px] text-gray-500 mt-1.5 font-medium px-2 py-0.5 bg-white rounded border border-gray-100 shadow-sm">
                                ${log.module}
                            </div>
                        </div>
                    </td>

                    <td class="px-6 py-4 align-top whitespace-normal min-w-[300px]">
                        ${formatDetail(log.details)}
                    </td>
                </tr>
            `;
            tableBody.innerHTML += rowHTML;
        });

        logCountLabel.textContent = `Menampilkan ${logs.length} aktivitas terbaru`;
    };

    // --- EVENT LISTENERS ---
    
    monthFilter.addEventListener('change', fetchLogs);
    siteFilter.addEventListener('change', fetchLogs);
    actionFilter.addEventListener('change', fetchLogs);

    // Refresh
    refreshBtn.addEventListener('click', () => {
        const icon = refreshBtn.querySelector('i');
        icon.classList.add('fa-spin');
        fetchLogs().then(() => setTimeout(() => icon.classList.remove('fa-spin'), 500));
    });

    // Export Excel
    exportBtn.addEventListener('click', async () => {
        showLoader();
        const selectedMonth = monthFilter.value;
        const selectedSite = siteFilter.value;
        
        const params = new URLSearchParams();
        if (selectedMonth) params.append('month', selectedMonth);
        if (selectedSite) params.append('site', selectedSite);
        
        const url = `/api/report/logs/excel?${params.toString()}`;
        
        try {
            const response = await fetch(url, { headers: { 'x-access-token': token } });
            if (!response.ok) throw new Error('Gagal membuat file Excel.');

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = downloadUrl;
            a.download = `Log_Aktivitas_${selectedMonth || 'All'}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            a.remove();

            Swal.fire({
                icon: 'success',
                title: 'Export Berhasil',
                text: 'File Excel telah diunduh.',
                timer: 2000,
                showConfirmButton: false
            });

        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Gagal', text: error.message });
        } finally {
            hideLoader();
        }
    });
    
    // Initial Load
    fetchLogs();
});
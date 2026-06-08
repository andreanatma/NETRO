document.addEventListener('DOMContentLoaded', async function () {
    const token = localStorage.getItem('token');
    
    // Container Element (Hanya 3 Modul)
    const containers = {
        sfp: document.getElementById('sfp-container'),
        lpuf: document.getElementById('lpuf-container'),
        card: document.getElementById('card-container')
    };
    const loader = document.getElementById('loader');
    
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const showLoader = () => loader.classList.remove('hidden');
    const hideLoader = () => loader.classList.add('hidden');

    // --- Helper: Warna Badge per Site ---
    const getSiteColor = (site) => {
        const colors = {
            'SMG': 'bg-blue-50 text-blue-700 border-blue-100',
            'JGJ': 'bg-purple-50 text-purple-700 border-purple-100',
            'KDS': 'bg-orange-50 text-orange-700 border-orange-100',
            'SLO': 'bg-yellow-50 text-yellow-700 border-yellow-100',
            'PWT': 'bg-emerald-50 text-emerald-700 border-emerald-100',
            'PKL': 'bg-cyan-50 text-cyan-700 border-cyan-100',
            'MGL': 'bg-pink-50 text-pink-700 border-pink-100'
        };
        return colors[site] || 'bg-gray-50 text-gray-700 border-gray-100';
    };

    // --- Helper: Proses Data Mentah menjadi Group ---
    const processData = (rawData, keyFields) => {
        if (!Array.isArray(rawData)) return {};
        
        const grouped = {};
        
        rawData.forEach(item => {
            const site = item.site;
            if (!site) return;

            if (!grouped[site]) grouped[site] = {};

            // Buat kunci unik (misal: "SFP+ 10G 10KM")
            const detailName = keyFields.map(k => item[k]).filter(Boolean).join(' ');
            
            if (!grouped[site][detailName]) {
                grouped[site][detailName] = { name: detailName, idle: 0, used: 0 };
            }

            // Hitung (Per baris = 1 unit)
            // Jika backend mengirim field 'count' (hasil aggrerasi), pakai itu. Jika raw, pakai 1.
            const count = parseInt(item.count || 1);
            const status = (item.status || '').toLowerCase();

            if (status === 'idle') grouped[site][detailName].idle += count;
            if (status === 'used') grouped[site][detailName].used += count;
        });

        // Ubah Object menjadi Array agar mudah di-loop
        const result = {};
        Object.keys(grouped).forEach(site => {
            result[site] = Object.values(grouped[site]);
        });
        
        // Urutkan Site secara Alfabetis
        return Object.keys(result).sort().reduce(
            (obj, key) => { 
                obj[key] = result[key]; 
                return obj;
            }, 
            {}
        );
    };

    // --- RENDER ACCORDION ITEM ---
    const createAccordionItem = (site, items, type) => {
        // Hitung Total Summary per Site
        let totalIdle = 0;
        let totalUsed = 0;
        items.forEach(i => { totalIdle += i.idle; totalUsed += i.used; });
        
        const siteColorClass = getSiteColor(site);
        const accordionId = `acc-${type}-${site}`;

        // Render List Barang di dalam Accordion
        let detailsHTML = items.map(item => {
            const itemTotal = item.idle + item.used;
            const usedPercent = itemTotal > 0 ? Math.round((item.used / itemTotal) * 100) : 0;
            const idlePercent = 100 - usedPercent;

            return `
                <div class="mb-6 last:mb-0 group">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-base font-bold text-gray-700 group-hover:text-blue-600 transition-colors">${item.name}</span>
                        <span class="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">${usedPercent}% Used</span>
                    </div>
                    
                    <div class="w-full bg-gray-200 rounded-full h-3 mb-3 overflow-hidden flex shadow-inner">
                        <div class="bg-red-500 h-full transition-all duration-500" style="width: ${usedPercent}%"></div>
                        <div class="bg-green-500 h-full transition-all duration-500" style="width: ${idlePercent}%"></div>
                    </div>

                    <div class="flex gap-3 text-xs font-bold">
                        <span class="px-3 py-1 bg-green-50 text-green-700 rounded-md border border-green-200 flex items-center">
                            Idle: <span class="ml-1 text-sm">${item.idle}</span>
                        </span>
                        <span class="px-3 py-1 bg-red-50 text-red-700 rounded-md border border-red-200 flex items-center">
                            Used: <span class="ml-1 text-sm">${item.used}</span>
                        </span>
                        <span class="px-3 py-1 bg-gray-50 text-gray-600 rounded-md border border-gray-200 ml-auto flex items-center">
                            Total: <span class="ml-1 text-sm">${itemTotal}</span>
                        </span>
                    </div>
                </div>
            `;
        }).join('');

        if (items.length === 0) detailsHTML = '<p class="text-gray-400 text-sm text-center italic py-2">Tidak ada data.</p>';

        // HTML Struktur Accordion
        return `
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-md hover:border-blue-200">
                <div class="p-5 cursor-pointer flex justify-between items-center bg-white hover:bg-gray-50 transition-colors select-none" onclick="toggleAccordion('${accordionId}')">
                    <div class="flex items-center gap-3">
                        <span class="px-3 py-1.5 text-sm font-bold rounded-lg border shadow-sm ${siteColorClass}">${site}</span>
                        
                        <div class="text-sm text-gray-500 font-medium">
                            <span class="text-green-600 font-bold">${totalIdle}</span> Idle &bull; 
                            <span class="text-red-600 font-bold">${totalUsed}</span> Used
                        </div>
                    </div>
                    <div class="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-400">
                        <i id="icon-${accordionId}" class="fas fa-chevron-down text-sm rotate-chevron transition-transform duration-300"></i>
                    </div>
                </div>

                <div id="${accordionId}" class="accordion-content bg-white">
                    <div class="p-6 border-t border-dashed border-gray-200 custom-scroll max-h-[400px] overflow-y-auto">
                        ${detailsHTML}
                    </div>
                </div>
            </div>
        `;
    };

    // --- MAIN LOGIC ---
    try {
        showLoader();
        
        // 1. Fetch Existing Detailed Data
        const response = await fetch('/api/count/detailed', {
            headers: { 'x-access-token': token }
        });
        
        let rawData = {};
        if (response.ok) {
            rawData = await response.json();
        }

        // 2. Process Data (SFP, LPUF, Card Only)
        const processedSFP = processData(rawData.sfp || [], ['jenis', 'kapasitas', 'jarak']);
        const processedLPUF = processData(rawData.lpuf || [], ['lpuf']);
        const processedCard = processData(rawData.card || [], ['card_name', 'type']);

        // 3. Render Helper
        const renderModule = (containerKey, processedData, typeKey) => {
            const container = containers[containerKey];
            if (!container) return;

            if (Object.keys(processedData).length > 0) {
                container.innerHTML = Object.keys(processedData).map(site => 
                    createAccordionItem(site, processedData[site], typeKey)
                ).join('');
            } else {
                container.innerHTML = `<div class="text-center text-gray-400 text-sm py-4 bg-white rounded-xl border border-dashed border-gray-300">Belum ada data ${typeKey.toUpperCase()}.</div>`;
            }
        };

        // Render All Modules
        renderModule('sfp', processedSFP, 'sfp');
        renderModule('lpuf', processedLPUF, 'lpuf');
        renderModule('card', processedCard, 'card');

    } catch (error) {
        console.error(error);
        Object.values(containers).forEach(el => {
            if(el) el.innerHTML = `<p class="text-red-400 text-xs italic">Gagal memuat data.</p>`;
        });
    } finally {
        hideLoader();
    }

    // Fungsi Toggle Accordion Global
    window.toggleAccordion = (id) => {
        const content = document.getElementById(id);
        const icon = document.getElementById(`icon-${id}`);
        
        if (content.classList.contains('open')) {
            content.classList.remove('open');
            icon.classList.remove('open');
        } else {
            content.classList.add('open');
            icon.classList.add('open');
        }
    };
});
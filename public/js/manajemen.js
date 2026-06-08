document.addEventListener('DOMContentLoaded', function () {
    const token = localStorage.getItem('token');
    
    // Cek Role
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userRole = user.role || 'viewer'; 
    const isViewer = userRole === 'viewer'; 

    // State Variables
    let currentModule = 'tempat';
    let currentFilters = { site: '' };
    let currentSearchTerm = '';
    let currentData = []; 
    
    // Pagination State
    let currentPage = 1;
    const rowsPerPage = 10;
    let filteredDataGlobal = []; 

    // --- DOM Elements ---
    const tableHead = document.getElementById('data-table-head');
    const tableBody = document.getElementById('data-table-body');
    const loader = document.getElementById('loader');
    const modal = document.getElementById('form-modal');
    const form = document.getElementById('data-form');
    const modalBody = document.getElementById('modal-body');
    const addBtn = document.getElementById('add-btn');
    const modalTitle = document.getElementById('modal-title');
    const pageTitle = document.getElementById('page-title');
    const infoSubtitle = document.getElementById('info-subtitle');
    const dataIdInput = document.getElementById('data-id');
    const moduleBtns = document.querySelectorAll('.module-btn');
    const siteFilter = document.getElementById('site-filter');
    const searchInput = document.getElementById('search-input');
    const formActionsContainer = document.getElementById('modal-form-actions');
    
    const paginationInfo = document.getElementById('pagination-info');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const pageNumbersContainer = document.getElementById('page-numbers');

    // Sembunyikan tombol tambah jika viewer
    if (isViewer && addBtn) addBtn.classList.add('hidden');

    // --- 1. KONFIGURASI MODUL ---
    const moduleConfig = {
        tempat: {
            endpoint: '/api/tempat',
            title: 'Manajemen Data Tempat',
            columns: [
                { header: 'No', key: 'nomor_urut' },
                { header: 'Kode Tempat', key: 'kode_tempat', isCode: true },
                { header: 'Site', key: 'site' },
                { header: 'Jenis', key: 'jenis' }
            ],
            fields: [
                { id: 'site', label: 'Site', type: 'select', options: ['SMG', 'JGJ', 'KDS', 'SLO', 'PWT', 'PKL', 'MGL'], required: true, icon: 'fa-map-marker-alt' },
                { id: 'jenis', label: 'Jenis', type: 'text', required: true, icon: 'fa-tag' },
                { id: 'kapasitas', label: 'Kapasitas', type: 'text', required: true, icon: 'fa-weight-hanging' },
                { id: 'jarak', label: 'Jarak', type: 'text', required: true, icon: 'fa-ruler-horizontal' }
            ],
            relations: {
                endpoint: '/api/sfp',
                key: 'kode_tempat',
                title: 'SFP Terkait',
                displayFields: ['kode_sfp', 'serial_number', 'status']
            }
        },
        sfp: {
            endpoint: '/api/sfp',
            title: 'Manajemen Data SFP',
            columns: [
                { header: 'No', key: 'nomor_urut' },
                { header: 'Kode SFP', key: 'kode_sfp', isCode: true },
                { header: 'Site', key: 'site' },
                { header: 'Serial', key: 'serial_number' },
                { header: 'Kondisi', key: 'kondisi' }, 
                { header: 'Status', key: 'status' }
            ],
            fields: [
                { id: 'kode_tempat', label: 'Kode Tempat', type: 'text', required: false, icon: 'fa-location-arrow' },
                { id: 'site', label: 'Site (Wajib jika tanpa Kode Tempat)', type: 'select', options: ['SMG', 'JGJ', 'KDS', 'SLO', 'PWT', 'PKL', 'MGL'], required: false, icon: 'fa-map-marker-alt' },
                { id: 'kapasitas', label: 'Kapasitas', type: 'text', required: true, icon: 'fa-bolt' },
                { id: 'jarak', label: 'Jarak', type: 'text', required: true, icon: 'fa-ruler-horizontal' },
                { id: 'merk', label: 'Merk', type: 'text', required: true, icon: 'fa-industry' },
                { id: 'serial_number', label: 'Serial Number', type: 'text', required: true, icon: 'fa-barcode' },
                { id: 'kondisi', label: 'Kondisi', type: 'select', options: ['normal', 'rusak'], required: true, icon: 'fa-heartbeat' },
                { id: 'status', label: 'Status', type: 'select', options: ['idle', 'used'], required: true, icon: 'fa-toggle-on' },
                { id: 'keterangan', label: 'Keterangan', type: 'text', icon: 'fa-info-circle' }
            ]
        },
        lpuf: {
            endpoint: '/api/lpuf',
            title: 'Manajemen Data LPUF',
            columns: [
                { header: 'No', key: 'nomor_urut' },
                { header: 'Kode LPUF', key: 'kode_lpuf', isCode: true },
                { header: 'Site', key: 'site' },
                { header: 'Serial', key: 'serial' },
                { header: 'Status', key: 'status' }
            ],
            fields: [
                { id: 'site', label: 'Site', type: 'select', options: ['SMG', 'JGJ', 'KDS', 'SLO', 'PWT', 'PKL', 'MGL'], required: true, icon: 'fa-map-marker-alt' },
                { id: 'lpuf', label: 'LPUF Name', type: 'text', required: true, icon: 'fa-tag' },
                { id: 'serial', label: 'Serial', type: 'text', required: true, icon: 'fa-barcode' },
                // PERBAIKAN: Ubah status menjadi dropdown
                { id: 'status', label: 'Status', type: 'select', options: ['idle', 'used'], required: true, icon: 'fa-toggle-on' },
                { id: 'keterangan', label: 'Keterangan', type: 'text', icon: 'fa-info-circle' }
            ],
            relations: {
                endpoint: '/api/card',
                key: 'kode_lpuf',
                title: 'Card Terkait',
                displayFields: ['kode_card', 'card_name', 'status']
            }
        },
        card: {
            endpoint: '/api/card',
            title: 'Manajemen Data Card',
            columns: [
                { header: 'No', key: 'nomor_urut' },
                { header: 'Kode Card', key: 'kode_card', isCode: true },
                { header: 'Site', key: 'site' },
                { header: 'Serial', key: 'serial' },
                { header: 'Status', key: 'status' }
            ],
            fields: [
                { id: 'kode_lpuf', label: 'Kode LPUF (Opsional)', type: 'text', required: false, icon: 'fa-hashtag' },
                { id: 'site', label: 'Site (Wajib jika tanpa LPUF)', type: 'select', options: ['SMG', 'JGJ', 'KDS', 'SLO', 'PWT', 'PKL', 'MGL'], required: false, icon: 'fa-map-marker-alt' },
                { id: 'card_name', label: 'Card Name', type: 'text', required: true, icon: 'fa-id-card' },
                { id: 'type', label: 'Type', type: 'text', required: true, icon: 'fa-layer-group' },
                { id: 'serial', label: 'Serial', type: 'text', required: true, icon: 'fa-barcode' },
                // PERBAIKAN: Ubah status menjadi dropdown
                { id: 'status', label: 'Status', type: 'select', options: ['idle', 'used'], required: true, icon: 'fa-toggle-on' },
                { id: 'keterangan', label: 'Keterangan', type: 'text', icon: 'fa-info-circle' }
            ],
            relations: {
                endpoint: '/api/lpuf',
                key: 'kode_lpuf',
                title: 'LPUF Terkait',
                displayFields: ['kode_lpuf', 'lpuf', 'status']
            }
        }
    };

    // --- Helper Functions ---
    const showLoader = () => loader.classList.remove('hidden');
    const hideLoader = () => loader.classList.add('hidden');
    const showAlert = (icon, title) => Swal.fire({ icon, title, showConfirmButton: false, timer: 1500 });

    const extractSiteFromCode = (code) => {
        if (!code) return '';
        const parts = code.split('-');
        return parts[0] || '';
    };

    const fetchWithAuth = async (url, options = {}) => {
        showLoader();
        const defaultOptions = { headers: { 'Content-Type': 'application/json', 'x-access-token': token } };
        try {
            const response = await fetch(url, { ...defaultOptions, ...options });
            if (response.status === 403) { window.location.href = '403.html'; return null; }
            return response;
        } finally { hideLoader(); }
    };

    // --- BADGES ---
    const getStatusBadge = (status) => {
        const s = (status || '').toLowerCase();
        let colorClass = 'bg-gray-100 text-gray-600 border-gray-200';
        let icon = '';
        if (s === 'idle') { colorClass = 'bg-green-100 text-green-700 border-green-200'; icon = '<i class="fas fa-check-circle mr-1"></i>'; }
        else if (s === 'used') { colorClass = 'bg-red-100 text-red-700 border-red-200'; icon = '<i class="fas fa-times-circle mr-1"></i>'; }
        else if (s === 'rusak') { colorClass = 'bg-gray-200 text-gray-700 border-gray-300'; icon = '<i class="fas fa-tools mr-1"></i>'; }
        return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wide ${colorClass}">${icon} ${s}</span>`;
    };

    const getKondisiBadge = (kondisi) => {
        const k = (kondisi || '').toLowerCase();
        let colorClass = 'bg-gray-100 text-gray-600 border-gray-200';
        let icon = '';
        if (k === 'normal') { colorClass = 'bg-green-100 text-green-700 border-green-200'; icon = '<i class="fas fa-heart mr-1"></i>'; }
        else if (k === 'rusak') { colorClass = 'bg-red-100 text-red-700 border-red-200'; icon = '<i class="fas fa-heart-broken mr-1"></i>'; }
        return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wide ${colorClass}">${icon} ${k}</span>`;
    };

    const getSiteBadge = (site) => {
        const s = (site || '').toUpperCase();
        let colorClass = 'bg-gray-100 text-gray-600 border-gray-200';
        switch (s) {
            case 'SMG': colorClass = 'bg-blue-100 text-blue-700 border-blue-200'; break;
            case 'JGJ': colorClass = 'bg-purple-100 text-purple-700 border-purple-200'; break;
            case 'KDS': colorClass = 'bg-orange-100 text-orange-700 border-orange-200'; break;
            case 'SLO': colorClass = 'bg-yellow-100 text-yellow-700 border-yellow-200'; break;
            case 'PWT': colorClass = 'bg-emerald-100 text-emerald-700 border-emerald-200'; break;
            case 'PKL': colorClass = 'bg-cyan-100 text-cyan-700 border-cyan-200'; break;
            case 'MGL': colorClass = 'bg-pink-100 text-pink-700 border-pink-200'; break;
        }
        return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold border shadow-sm ${colorClass}"><i class="fas fa-building mr-1"></i> ${s}</span>`;
    };

    // --- FILTER & PAGINATION ---
    const applyFilters = () => {
        let filteredData = currentData;

        if (currentFilters.site) {
            filteredData = filteredData.filter(item => {
                const itemSite = item.site || (item.Tempat ? item.Tempat.site : extractSiteFromCode(item[getCodeKey(currentModule)]));
                return itemSite === currentFilters.site;
            });
        }

        if (currentSearchTerm) {
            const term = currentSearchTerm.toLowerCase();
            filteredData = filteredData.filter(item => {
                const config = moduleConfig[currentModule];
                const getVal = (key) => {
                    if (key === 'site' && currentModule === 'sfp') {
                         return (item.Tempat ? item.Tempat.site : extractSiteFromCode(item.kode_sfp)).toLowerCase();
                    }
                    return (item[key] || '').toString().toLowerCase();
                };
                return config.columns.some(col => {
                    if (col.key === 'nomor_urut') return false; 
                    return getVal(col.key).includes(term);
                });
            });
        }

        filteredDataGlobal = filteredData;
        renderPagination();
        renderTableForPage();
    };

    const renderPagination = () => {
        const totalItems = filteredDataGlobal.length;
        const totalPages = Math.ceil(totalItems / rowsPerPage);
        
        if (totalItems === 0) {
            paginationInfo.textContent = 'Menampilkan 0 data';
            pageNumbersContainer.innerHTML = '';
            prevPageBtn.disabled = true;
            nextPageBtn.disabled = true;
            return;
        }

        const startItem = (currentPage - 1) * rowsPerPage + 1;
        const endItem = Math.min(currentPage * rowsPerPage, totalItems);
        paginationInfo.textContent = `Menampilkan ${startItem} - ${endItem} dari ${totalItems} data`;

        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage === totalPages;

        pageNumbersContainer.innerHTML = `
            <button class="px-4 py-2 text-sm font-bold text-blue-600 bg-blue-50 border-t border-b border-gray-300 cursor-default">
                ${currentPage} / ${totalPages}
            </button>
        `;
    };

    const renderTableForPage = () => {
        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        const pageData = filteredDataGlobal.slice(startIndex, endIndex);
        renderTable(pageData, startIndex);
    };

    // --- RENDER TABLE ---
    const renderTable = (data, startIndex = 0) => {
        tableBody.innerHTML = '';
        const config = moduleConfig[currentModule];

        if (!data || data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="${config.columns.length + 1}" class="text-center p-8 text-gray-500 italic bg-white border-b">Tidak ada data ditemukan.</td></tr>`;
        } else {
            data.forEach((item, index) => {
                let rowHTML = config.columns.map(col => {
                    let cellContent = item[col.key] || '';

                    if (col.key === 'nomor_urut') return `<td class="p-4 text-center text-gray-500 font-medium">${startIndex + index + 1}</td>`;
                    if (col.key === 'status') return `<td class="p-4">${getStatusBadge(cellContent)}</td>`;
                    if (col.key === 'kondisi') return `<td class="p-4">${getKondisiBadge(cellContent)}</td>`;
                    
                    if (col.key === 'site') {
                        let siteVal = cellContent;
                        if (currentModule === 'sfp' && !siteVal) {
                            siteVal = item.Tempat ? item.Tempat.site : extractSiteFromCode(item.kode_sfp);
                        }
                        return `<td class="p-4">${getSiteBadge(siteVal)}</td>`;
                    }

                    if (col.isCode) {
                        return `<td class="p-4">
                                    <span class="text-gray-900 font-bold hover:text-blue-600 hover:underline cursor-pointer transition-colors view-detail-btn" onclick="window.showDetail(${item.id})">
                                        ${cellContent}
                                    </span>
                                </td>`;
                    }

                    return `<td class="p-4 text-sm text-gray-700 font-medium">${cellContent}</td>`;
                }).join('');

                const rowBg = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';

                let actionButtonsHTML = '';
                if (isViewer) {
                    actionButtonsHTML = `<div class="flex items-center justify-end text-gray-400 text-xs italic"><i class="fas fa-lock mr-1"></i> Read Only</div>`;
                } else {
                    actionButtonsHTML = `
                        <div class="flex items-center space-x-2">
                            <button class="btn-action btn-edit text-xs flex items-center bg-blue-600 text-white hover:bg-blue-700 shadow-sm px-3 py-1.5 rounded-md transition-all transform active:scale-95" data-id="${item.id}"><i class="fas fa-pencil-alt mr-1"></i> Edit</button>
                            <button class="btn-action btn-delete text-xs flex items-center bg-red-600 text-white hover:bg-red-700 shadow-sm px-3 py-1.5 rounded-md transition-all transform active:scale-95" data-id="${item.id}"><i class="fas fa-trash-alt mr-1"></i> Hapus</button>
                        </div>`;
                }

                rowHTML += `<td class="p-4">${actionButtonsHTML}</td>`;
                tableBody.innerHTML += `<tr class="${rowBg} border-b border-gray-100 hover:bg-blue-50 transition-colors">${rowHTML}</tr>`;
            });
        }
        
        const siteText = currentFilters.site ? `untuk Site ${currentFilters.site}` : 'di semua site';
        infoSubtitle.textContent = `Menampilkan ${data ? data.length : 0} data ${siteText}.`;
        
        if (!isViewer) attachActionListeners();
    };

    const getCodeKey = (module) => {
        return moduleConfig[module]?.columns.find(c => c.isCode)?.key || '';
    };

    const fetchData = async () => {
        const config = moduleConfig[currentModule];
        const url = config.endpoint; 
        const response = await fetchWithAuth(url);

        if (response && response.ok) {
            currentData = await response.json(); 
            currentPage = 1; 
            applyFilters(); 
        } else {
            showAlert('error', 'Gagal memuat data.');
            currentData = [];
            filteredDataGlobal = [];
            renderTable([]); 
            renderPagination();
        }
    };

    const loadModule = (moduleName) => {
        currentModule = moduleName;
        currentFilters.site = '';
        currentSearchTerm = '';
        siteFilter.value = '';
        searchInput.value = '';
        currentPage = 1;

        const config = moduleConfig[currentModule];
        if (!config) return;

        pageTitle.textContent = config.title;
        
        moduleBtns.forEach(btn => {
            const isActive = btn.dataset.module === moduleName;
            btn.className = 'module-btn px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center space-x-2 focus:outline-none';
            if (isActive) {
                btn.classList.add('bg-blue-600', 'text-white', 'shadow-md', 'transform', 'scale-105');
            } else {
                btn.classList.add('text-gray-500', 'hover:text-gray-700', 'hover:bg-gray-200');
            }
        });
        
        let headerHTML = config.columns.map(col => {
            let align = col.key === 'nomor_urut' ? 'text-center' : 'text-left';
            return `<th class="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider ${align} border-b border-gray-200 bg-gray-100 first:rounded-tl-lg">${col.header}</th>`;
        }).join('');
        
        headerHTML += `<th class="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-left border-b border-gray-200 bg-gray-100 last:rounded-tr-lg">Aksi</th>`;
        
        tableHead.innerHTML = `<tr>${headerHTML}</tr>`;
        closeModal();
        fetchData();
    };

    const fetchRelationData = async (relationConfig, keyValue) => {
        if (!relationConfig || !keyValue) return [];
        try {
            const response = await fetchWithAuth(relationConfig.endpoint);
            if (response && response.ok) {
                const data = await response.json();
                return Array.isArray(data) ? data.filter(item => item[relationConfig.key] === keyValue) : [];
            }
        } catch (error) {
            console.error('Error fetching relation data:', error);
        }
        return [];
    };

    // --- FORM & CRUD ---
    const openModal = (item = null, mode = 'edit') => {
        const config = moduleConfig[currentModule];
        const isDetail = mode === 'detail';
        
        modalTitle.textContent = isDetail ? 'Detail Data' : (item ? 'Edit Data' : 'Tambah Data');
        dataIdInput.value = item ? item.id : '';
        modalBody.innerHTML = '';

        if (formActionsContainer) {
            isDetail ? formActionsContainer.classList.add('hidden') : formActionsContainer.classList.remove('hidden');
        }

        if (isDetail) {
            renderDetailView(item, config);
        } else {
            if (isViewer) {
                showAlert('error', 'Anda tidak memiliki akses untuk mengubah data.');
                return;
            }
            renderFormView(item, config);
        }
        modal.classList.remove('hidden');
    };

    const renderDetailView = async (item, config) => {
        const codeKey = getCodeKey(currentModule);
        let mainDetailsHTML = '';
        
        const fieldsToDisplay = config.fields.filter(field => field.id !== codeKey);
        fieldsToDisplay.forEach(field => {
            let value = item[field.id] || '-';
            const iconClass = field.icon ? `fas ${field.icon}` : 'fas fa-info-circle';
            
            if (field.id === 'status') value = getStatusBadge(value);
            if (field.id === 'site') value = getSiteBadge(value);
            if (field.id === 'kondisi') value = getKondisiBadge(value);

            mainDetailsHTML += `
                <div class="flex items-center p-3 hover:bg-gray-50 rounded-lg transition-colors">
                    <div class="flex-shrink-0 w-10 h-10 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mr-4 shadow-sm">
                        <i class="${iconClass} text-lg"></i>
                    </div>
                    <div class="flex-grow">
                        <p class="text-xs font-bold text-gray-400 uppercase tracking-wide">${field.label}</p>
                        <div class="text-sm font-semibold text-gray-800 mt-0.5">${value}</div>
                    </div>
                </div>
            `;
        });
        
        modalBody.innerHTML = `
            <div class="space-y-6">
                ${codeKey && item[codeKey] ? `
                <div class="text-center pb-4 border-b border-gray-100">
                    <div class="inline-flex items-center bg-blue-600 text-white px-6 py-2 rounded-full shadow-md transform hover:scale-105 transition-transform">
                        <i class="fas fa-cube text-lg mr-2"></i>
                        <span class="text-xl font-bold tracking-wider">${item[codeKey]}</span>
                    </div>
                </div>` : ''}

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${mainDetailsHTML}
                </div>

                <div id="relation-container" class="mt-6 pt-6 border-t border-gray-100"></div>
            </div>
            
            <div class="mt-8 text-center">
                <button type="button" id="detail-close-btn" class="px-6 py-2 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-colors shadow-sm">
                    Tutup
                </button>
            </div>
        `;
        
        if (config.relations) {
            const relationKey = config.relations.key;
            let keyValue = item[relationKey];
            if (currentModule === 'sfp') keyValue = item['kode_tempat'];

            if (keyValue) {
                 const relationData = await fetchRelationData(config.relations, keyValue);
                 renderRelationData(config.relations, relationData);
            }
        }
        
        document.getElementById('detail-close-btn').addEventListener('click', closeModal);
    };

    const renderRelationData = (relationConfig, data) => {
        const container = document.getElementById('relation-container');
        if (!container) return;

        container.innerHTML = `
            <div class="flex items-center mb-4">
                <div class="bg-indigo-100 text-indigo-600 p-2 rounded-lg mr-3">
                    <i class="fas fa-link"></i>
                </div>
                <div>
                    <h3 class="text-md font-bold text-gray-800">${relationConfig.title}</h3>
                    <span class="text-xs text-gray-500">Total: ${data.length} item</span>
                </div>
            </div>
            ${data.length === 0 ? 
                `<div class="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center text-gray-400 text-sm">
                    <i class="far fa-folder-open text-2xl mb-2 block"></i> Tidak ada data terkait.
                 </div>` :
                `<div class="bg-gray-50 border border-gray-200 rounded-xl max-h-60 overflow-y-auto custom-scrollbar p-2">
                    ${data.map(item => `
                        <div class="bg-white p-3 rounded-lg shadow-sm mb-2 last:mb-0 border border-gray-100 hover:shadow-md transition-shadow">
                            <div class="grid grid-cols-3 gap-2 text-sm">
                                ${relationConfig.displayFields.map(field => `
                                    <div>
                                        <span class="block text-xs text-gray-400 capitalize font-medium">${field.replace(/_/g, ' ')}</span>
                                        <span class="font-bold text-gray-700">
                                            ${field === 'status' ? getStatusBadge(item[field]) : (item[field] || '-')}
                                        </span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>`
            }
        `;
    };

    const renderFormView = (item, config) => {
        config.fields.forEach(field => {
            const value = item ? (item[field.id] || '') : '';
            const iconClass = field.icon ? `<i class="fas ${field.icon} text-gray-400 absolute left-3 top-3.5"></i>` : '';
            const paddingLeft = field.icon ? 'pl-10' : 'pl-3';
            let inputHTML = '';

            // PERBAIKAN: UI Select Dropdown yang lebih cantik dan jelas dengan panah chevron
            if (field.type === 'select') {
                inputHTML = `
                <div class="relative">
                    ${iconClass}
                    <select id="${field.id}" name="${field.id}" class="w-full border border-gray-300 rounded-lg p-3 ${paddingLeft} pr-10 appearance-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white cursor-pointer" ${field.required ? 'required' : ''}>
                        <option value="" disabled ${!value ? 'selected' : ''}>-- Pilih ${field.label} --</option>
                        ${(field.options || []).map(opt => `<option value="${opt}" ${(value || '').toLowerCase() === opt.toLowerCase() ? 'selected' : ''}>${opt.toUpperCase()}</option>`).join('')}
                    </select>
                    <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                        <i class="fas fa-chevron-down text-sm"></i>
                    </div>
                </div>`;
            } else if (field.type === 'textarea') {
                inputHTML = `
                <div class="relative">
                    ${iconClass}
                    <textarea id="${field.id}" name="${field.id}" rows="4"
                        class="w-full border border-gray-300 rounded-lg p-3 ${paddingLeft} focus:ring-2 focus:ring-blue-500 transition-all bg-gray-50 text-xs font-mono" 
                        ${field.readonly ? 'readonly' : ''}>${value}</textarea>
                </div>`;
            } else {
                inputHTML = `
                <div class="relative">
                    ${iconClass}
                    <input type="${field.type}" id="${field.id}" name="${field.id}" value="${value}" 
                        class="w-full border border-gray-300 rounded-lg p-3 ${paddingLeft} focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                        ${field.required ? 'required' : ''} 
                        placeholder="Masukkan ${field.label.toLowerCase()}"/>
                </div>`;
            }

            modalBody.innerHTML += `
                <div class="mb-5">
                    <label for="${field.id}" class="block mb-2 text-sm font-bold text-gray-700">
                        ${field.label} ${field.required ? '<span class="text-red-500">*</span>' : ''}
                    </label>
                    ${inputHTML}
                </div>`;
        });
    };
    
    const closeModal = () => {
        modal.classList.add('hidden');
        if (form) form.reset();
        dataIdInput.value = '';
        if (formActionsContainer) {
            formActionsContainer.classList.remove('hidden');
        }
    };

    const attachActionListeners = () => {
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                const config = moduleConfig[currentModule];
                const response = await fetchWithAuth(`${config.endpoint}/${id}`);
                if (response && response.ok) {
                    const item = await response.json();
                    openModal(item, 'edit');
                } else {
                    showAlert('error', 'Gagal memuat data untuk diedit.');
                }
            });
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                Swal.fire({
                    title: 'Yakin hapus data ini?',
                    text: "Data yang dihapus tidak dapat dikembalikan!",
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#ef4444',
                    cancelButtonColor: '#6b7280',
                    confirmButtonText: 'Ya, Hapus!',
                    cancelButtonText: 'Batal'
                }).then(async (result) => {
                    if (result.isConfirmed) {
                        const config = moduleConfig[currentModule];
                        const response = await fetchWithAuth(`${config.endpoint}/${id}`, { method: 'DELETE' });
                        if (response && response.ok) {
                            showAlert('success', 'Data berhasil dihapus.');
                            fetchData();
                        } else {
                            showAlert('error', 'Gagal menghapus data.');
                        }
                    }
                });
            });
        });
    };

    // --- Global Access ---
    window.showDetail = async (id) => {
        const config = moduleConfig[currentModule];
        const response = await fetchWithAuth(`${config.endpoint}/${id}`);
        if (response && response.ok) {
            const item = await response.json();
            openModal(item, 'detail');
        } else {
            showAlert('error', 'Gagal memuat detail data.');
        }
    };

    // --- Listeners ---
    if (!isViewer && addBtn) {
        addBtn.addEventListener('click', () => openModal(null, 'add'));
    }
    
    if (formActionsContainer) {
        const cancelBtn = formActionsContainer.querySelector('#cancel-btn');
        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (isViewer) return;

        const config = moduleConfig[currentModule];
        const id = dataIdInput.value;
        const formData = {};
        
        config.fields.forEach(field => {
            const element = document.getElementById(field.id);
            if (element) {
                let value = element.value.trim();
                if (!field.required && value === '') value = null; 
                formData[field.id] = value;
            }
        });

        const method = id ? 'PUT' : 'POST';
        const url = id ? `${config.endpoint}/${id}` : config.endpoint;
        const response = await fetchWithAuth(url, {
            method,
            body: JSON.stringify(formData)
        });

        if (response && response.ok) {
            showAlert('success', `Data berhasil ${id ? 'diperbarui' : 'ditambahkan'}.`);
            closeModal();
            fetchData();
        } else {
             const errorData = await response.json().catch(() => ({ message: `Gagal ${id ? 'memperbarui' : 'menambahkan'} data.` }));
             showAlert('error', errorData.message);
        }
    });

    siteFilter.addEventListener('change', () => {
        currentFilters.site = siteFilter.value || undefined;
        currentPage = 1;
        applyFilters(); 
    });

    searchInput.addEventListener('input', (e) => {
        currentSearchTerm = e.target.value;
        currentPage = 1;
        applyFilters(); 
    });

    // --- PAGINATION LISTENERS ---
    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderPagination();
            renderTableForPage();
        }
    });

    nextPageBtn.addEventListener('click', () => {
        const totalItems = filteredDataGlobal.length;
        const totalPages = Math.ceil(totalItems / rowsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderPagination();
            renderTableForPage();
        }
    });

    moduleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            loadModule(btn.dataset.module);
        });
    });

    // Inisialisasi
    loadModule(currentModule);
});
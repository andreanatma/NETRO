document.addEventListener('DOMContentLoaded', function() {
    const loader = document.getElementById('loader');
    const token = localStorage.getItem('token');

    // Cek login
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const showLoader = () => loader.classList.remove('hidden');
    const hideLoader = () => loader.classList.add('hidden');

    const handleExport = async (format) => {
        showLoader();
        const category = document.getElementById('category').value;
        const site = document.getElementById('site').value;
        
        // URL Endpoint Dinamis
        let url = `/api/export/${format}?category=${category}`;
        if (site) {
            url += `&site=${site}`;
        }
        
        try {
            const response = await fetch(url, { 
                method: 'GET',
                headers: { 'x-access-token': token } 
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Gagal mengunduh file.');
            }
            
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = downloadUrl;

            // Penamaan File
            const date = new Date().toISOString().slice(0,10);
            const extension = format === 'excel' ? 'xlsx' : 'pdf';
            a.download = `Laporan-${category.toUpperCase()}-${site || 'ALL'}-${date}.${extension}`;

            document.body.appendChild(a);
            a.click();
            
            // Cleanup
            window.URL.revokeObjectURL(downloadUrl);
            a.remove();
            
            // Notifikasi Sukses dengan Gaya Modern
            Swal.fire({ 
                icon: 'success', 
                title: 'Unduhan Berhasil', 
                text: `Laporan ${format.toUpperCase()} (${category.toUpperCase()}) telah disimpan.`,
                confirmButtonColor: '#4f46e5',
                timer: 3000,
                timerProgressBar: true
            });

        } catch (error) {
            console.error(error);
            Swal.fire({ 
                icon: 'error', 
                title: 'Gagal Mengunduh', 
                text: error.message,
                confirmButtonColor: '#ef4444'
            });
        } finally {
            hideLoader();
        }
    };

    // Event Listener untuk Tombol Kartu
    const exportButtons = document.querySelectorAll('.export-action-btn');
    
    exportButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Ambil format dari atribut data-format (pdf/excel)
            const format = this.getAttribute('data-format');
            if (format) {
                handleExport(format);
            }
        });
    });
});
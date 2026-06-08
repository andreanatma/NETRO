// controllers/dashboard.controller.js

'use strict';

const db = require('../models');
const { Sfp, Lpuf, Card, Tempat } = db;
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const sequelize = db.sequelize;

/**
 * Helper function untuk mengubah hasil query count dari Sequelize.
 * @param {Array<Object>} countResult - Hasil dari query Sequelize `count` dengan `group`.
 * @returns {Object} Objek yang diformat dengan site sebagai key dan count sebagai value.
 */
const formatSiteCount = (countResult) => {
    const formatted = {};
    if (Array.isArray(countResult)) {
        countResult.forEach(item => {
            if (item.site) {
                formatted[item.site] = item.count;
            }
        });
    }
    return formatted;
};

/**
 * Mengambil rekap jumlah total modul per site untuk Dashboard.
 */
exports.getCounts = async (req, res) => {
    try {
        const sequelize = db.sequelize;

        // --- PERBAIKAN SQLITE: Mengganti SUBSTRING_INDEX menjadi SUBSTR dan INSTR ---
        const siteAttribute = [sequelize.literal(`COALESCE(Tempat.site, SUBSTR(Sfp.kode_sfp, 1, INSTR(Sfp.kode_sfp || '-', '-') - 1))`), 'site'];
        const groupAttribute = sequelize.literal(`COALESCE(Tempat.site, SUBSTR(Sfp.kode_sfp, 1, INSTR(Sfp.kode_sfp || '-', '-') - 1))`);

        const sfpIdleCounts = await Sfp.findAll({
            attributes: [siteAttribute, [sequelize.fn('COUNT', sequelize.col('Sfp.id')), 'count']],
            where: sequelize.where(sequelize.fn('LOWER', sequelize.col('Sfp.status')), 'idle'),
            include: [{ 
                model: Tempat, 
                attributes: [], 
                required: false // (LEFT JOIN)
            }],
            group: [groupAttribute],
            raw: true
        });

        const sfpUsedCounts = await Sfp.findAll({
            attributes: [siteAttribute, [sequelize.fn('COUNT', sequelize.col('Sfp.id')), 'count']],
            where: sequelize.where(sequelize.fn('LOWER', sequelize.col('Sfp.status')), 'used'),
            include: [{ 
                model: Tempat, 
                attributes: [], 
                required: false // (LEFT JOIN)
            }],
            group: [groupAttribute],
            raw: true
        });

        // --- Query untuk LPUF dan Card tidak berubah ---
        const lpufIdleCounts = await Lpuf.count({ where: sequelize.where(sequelize.fn('LOWER', sequelize.col('status')), 'idle'), group: ['site'] });
        const lpufUsedCounts = await Lpuf.count({ where: sequelize.where(sequelize.fn('LOWER', sequelize.col('status')), 'used'), group: ['site'] });
        const cardIdleCounts = await Card.count({ where: sequelize.where(sequelize.fn('LOWER', sequelize.col('status')), 'idle'), group: ['site'] });
        const cardUsedCounts = await Card.count({ where: sequelize.where(sequelize.fn('LOWER', sequelize.col('status')), 'used'), group: ['site'] });

        res.status(200).json({
            sfp_idle: formatSiteCount(sfpIdleCounts),
            sfp_used: formatSiteCount(sfpUsedCounts),
            lpuf_idle: formatSiteCount(lpufIdleCounts),
            lpuf_used: formatSiteCount(lpufUsedCounts),
            card_idle: formatSiteCount(cardIdleCounts),
            card_used: formatSiteCount(cardUsedCounts)
        });

    } catch (error) {
        console.error("Error fetching counts:", error);
        res.status(500).send({ message: "Gagal mengambil data count: " + error.message });
    }
};

/**
 * Mengambil rincian jumlah modul untuk halaman "Count Modul".
 */
exports.getDetailedCounts = async (req, res) => {
    try {
        const sfpCounts = await Sfp.findAll({
            attributes: [
                // --- PERBAIKAN SQLITE: Mengganti SUBSTRING_INDEX menjadi SUBSTR dan INSTR ---
                [sequelize.literal("COALESCE(`Tempat`.`site`, SUBSTR(`Sfp`.`kode_sfp`, 1, INSTR(`Sfp`.`kode_sfp` || '-', '-') - 1))"), 'site'],
                [sequelize.col('Tempat.jenis'), 'jenis'],
                [sequelize.col('Sfp.kapasitas'), 'kapasitas'], // <-- DIPERBAIKI (Tadinya ambigu)
                [sequelize.col('Tempat.jarak'), 'jarak'],
                [sequelize.col('Sfp.status'), 'status'],       // <-- DIPERBAIKI (Tadinya ambigu)
                [sequelize.fn('COUNT', sequelize.col('Sfp.id')), 'count']
            ],
            include: [{ model: Tempat, attributes: [], required: false }], // Gunakan LEFT JOIN
            group: [
                sequelize.literal("`site`"), // Grup berdasarkan alias 'site'
                sequelize.col('Tempat.jenis'),
                sequelize.col('Sfp.kapasitas'), // <-- DIPERBAIKI (Tadinya ambigu)
                sequelize.col('Tempat.jarak'),
                sequelize.col('Sfp.status')     // <-- DIPERBAIKI (Tadinya ambigu)
            ],
            order: [
                [sequelize.literal("`site`"), 'ASC'],
                [sequelize.col('Tempat.jenis'), 'ASC']
            ],
            raw: true
        });

        const lpufCounts = await Lpuf.findAll({
            attributes: ['site', 'lpuf', 'status', [sequelize.fn('COUNT', 'id'), 'count']],
            group: ['site', 'lpuf', 'status'],
            order: [['site', 'ASC'], ['lpuf', 'ASC']],
            raw: true
        });

        const cardCounts = await Card.findAll({
            attributes: ['site', 'card_name', 'type', 'status', [sequelize.fn('COUNT', 'id'), 'count']],
            group: ['site', 'card_name', 'type', 'status'],
            order: [['site', 'ASC'], ['card_name', 'ASC']],
            raw: true
        });

        res.status(200).json({
            sfp: sfpCounts,
            lpuf: lpufCounts,
            card: cardCounts
        });

    } catch (error) {
        console.error("Error fetching detailed counts:", error);
        res.status(500).send({ message: "Gagal mengambil data rincian: " + error.message });
    }
};

/**
 * Menghasilkan dan mengirim file PDF berisi laporan data modul (versi dasar).
 */
exports.exportPdf = async (req, res) => {
    const { category, site } = req.query;
    if (!category) return res.status(400).send({ message: "Parameter 'category' wajib diisi." });

    try {
        const doc = new PDFDocument({ margin: 30, size: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="report_pdf_${category}_${site || 'all'}_${Date.now()}.pdf"`);
        doc.pipe(res);

        const lowerCaseCategory = category.toLowerCase();

        let Model, title, queryOptions = {};

        switch (lowerCaseCategory) {
            case 'sfp':
                Model = Sfp; title = "Laporan Modul SFP"; queryOptions.include = [{ model: Tempat, attributes: ['site'], required: false }]; break;
            case 'lpuf':
                Model = Lpuf; title = "Laporan Modul LPUF"; break;
            case 'card':
                Model = Card; title = "Laporan Modul Card"; break;
            default:
                return res.status(400).send({ message: "Kategori tidak valid." });
        }
    
        let whereCondition = {};
        if (site) {
            if (lowerCaseCategory === 'sfp') {
                whereCondition[db.Sequelize.Op.or] = [
                    { '$Tempat.site$': site },
                    { kode_tempat: null, kode_sfp: { [db.Sequelize.Op.like]: `${site}-%` } }
                ];
            } else { 
                whereCondition.site = site; 
            }
            title += ` - Site ${site}`;
        }
        queryOptions.where = whereCondition;
        queryOptions.order = lowerCaseCategory === 'sfp' ? [[sequelize.col('kode_sfp'), 'ASC']] : [['site', 'ASC']];
        const data = await Model.findAll(queryOptions);

        doc.fontSize(18).text('Inventory IP Network', { align: 'center' });
        doc.fontSize(14).text(title, { align: 'center' });
        doc.moveDown(2);

        const drawTableRow = (y, ...cols) => {
            const positions = [30, 80, 150, 350, 480];
            const widths = [40, 60, 200, 130, 90];
            cols.forEach((text, i) => doc.text(String(text), positions[i], y, { width: widths[i] }));
        };
        const tableTop = doc.y;
        doc.font('Helvetica-Bold');
        drawTableRow(tableTop, 'No.', 'Site', 'Kode Modul', 'Serial', 'Status');
        const headerBottom = doc.y + 5;
        doc.moveTo(30, headerBottom).lineTo(570, headerBottom).stroke();
        doc.font('Helvetica');
        let y = headerBottom + 10;
        data.forEach((item, index) => {
            const itemSite = lowerCaseCategory === 'sfp' ? (item.Tempat?.site || item.kode_sfp.split('-')[0]) : item.site;
            const kode = item.kode_sfp || item.kode_lpuf || item.kode_card;
            const serial = item.serial_number || item.serial;
            drawTableRow(y, index + 1, itemSite, kode || '-', serial || '-', item.status);
            y = doc.y + 15;
            if (y > 750 && index < data.length - 1) { doc.addPage(); y = 50; }
        });
        
        doc.end();
    } catch (error) {
        console.error("Error creating PDF:", error);
        res.status(500).send({ message: "Gagal membuat PDF: " + error.message });
    }
};

/**
 * Endpoint untuk Export ke Excel.
 */
exports.exportExcel = async (req, res) => {
    const { category, site } = req.query;
    if (!category) {
        return res.status(400).send({ message: "Parameter 'category' (sfp, lpuf, card, all) wajib diisi." });
    }

    const lowerCaseCategory = category.toLowerCase();

    try {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Inventory IP Network App';
        workbook.created = new Date();

        const fetchDataAndAddToSheet = async (Model, sheetName, includeOptions = []) => {
            const sheet = workbook.addWorksheet(sheetName);
            let queryOptions = { where: {}, include: includeOptions, order: [['createdAt', 'DESC']] };
            
            if (site) {
                if (sheetName === 'SFP') {
                    queryOptions.where[db.Sequelize.Op.or] = [
                        { '$Tempat.site$': site },
                        { kode_tempat: null, kode_sfp: { [db.Sequelize.Op.like]: `${site}-%` } }
                    ];
                } else {
                    queryOptions.where.site = site;
                }
            }
            
            const items = await Model.findAll(queryOptions);
            const data = items.map(item => item.toJSON());

            if (data.length > 0) {
                 // Untuk SFP, tambahkan kolom 'site' secara eksplisit
                if (sheetName === 'SFP') {
                    data.forEach(d => {
                        d.site = d.Tempat ? d.Tempat.site : d.kode_sfp.split('-')[0];
                        delete d.Tempat; // Hapus objek relasi agar tidak masuk ke excel
                    });
                }
                const columns = Object.keys(data[0]).map(key => ({ header: key.replace(/([A-Z])/g, ' $1').toUpperCase(), key: key, width: 25 }));
                sheet.columns = columns;
                sheet.addRows(data);
                
                sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
                sheet.getRow(1).fill = { type: 'pattern', pattern:'solid', fgColor:{argb:'FF002060'} };
            } else {
                sheet.columns = [{ header: 'Status', key: 'status', width: 30 }];
                sheet.addRow({ status: 'Tidak ada data ditemukan.' });
            }
        };

        if (lowerCaseCategory === 'sfp' || lowerCaseCategory === 'all') {
            await fetchDataAndAddToSheet(Sfp, 'SFP', [{ model: Tempat, required: false }]);
        }
        if (lowerCaseCategory === 'lpuf' || lowerCaseCategory === 'all') {
            await fetchDataAndAddToSheet(Lpuf, 'LPUF');
        }
        if (lowerCaseCategory === 'card' || lowerCaseCategory === 'all') {
            await fetchDataAndAddToSheet(Card, 'Card');
        }

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="report_excel_${category}_${site || 'all'}.xlsx"`);

        await workbook.xlsx.write(res);
        res.end(); // PENTING: Mengakhiri response setelah stream selesai.

    } catch (error) {
        console.error("Error creating Excel report:", error);
        if (!res.headersSent) {
            res.status(500).send({ message: "Gagal membuat laporan Excel: " + error.message });
        }
    }
};
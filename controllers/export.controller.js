'use strict';

const db = require('../models');
const { Sfp, Lpuf, Card, Tempat } = db;
const PDFDocument = require('pdfkit');
const excel = require('exceljs');
const { Op } = require("sequelize");

// --- PALET WARNA PROFESIONAL ---
const COLORS = {
    headerBg: '#1e293b',     // Header Dokumen Gelap
    headerText: '#ffffff',
    siteHeader: '#f1f5f9',   // Background Header Site
    summaryBg: '#f8fafc',    // Background Kotak Ringkasan
    textMain: '#334155',
    textMuted: '#64748b',
    border: '#e2e8f0',
    // Warna Badge
    badgeSFP: '#2563eb',     // Biru Royal
    badgeLPUF: '#7c3aed',    // Ungu Deep
    badgeCard: '#ea580c',    // Oranye Gelap
    // Warna Status
    statusIdle: '#10b981',   // Hijau Emerald
    statusUsed: '#ef4444',   // Merah
    statusRusak: '#64748b'   // Abu Slate
};

// --- HELPER FUNCTIONS ---

/** Menggambar Badge/Pil Warna Kecil */
function drawBadge(doc, x, y, text, color, width = 50) {
    doc.save();
    doc.roundedRect(x, y, width, 14, 4).fill(color);
    doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold')
       .text(text, x, y + 3, { width: width, align: 'center' });
    doc.restore();
}

/** Menggambar Kotak Ringkasan Statistik (DIPERBARUI: ADA IDLE & USED) */
function drawSummaryBox(doc, y, summary) {
    // 1. Kotak Container
    doc.save();
    doc.roundedRect(50, y, 500, 45, 6)
       .fillAndStroke(COLORS.summaryBg, COLORS.border);
    doc.restore();

    // 2. Label Judul
    doc.fillColor(COLORS.textMuted).fontSize(8).font('Helvetica-Bold')
       .text("RINGKASAN:", 65, y + 18);

    // --- BAGIAN 1: JENIS MODUL ---
    
    // SFP
    doc.fillColor(COLORS.badgeSFP).fontSize(14).font('Helvetica-Bold')
       .text(summary.SFP, 140, y + 10);
    doc.fontSize(7).text("SFP", 140, y + 26);

    // LPUF
    doc.fillColor(COLORS.badgeLPUF).fontSize(14)
       .text(summary.LPUF, 190, y + 10);
    doc.fontSize(7).text("LPUF", 190, y + 26);

    // Card
    doc.fillColor(COLORS.badgeCard).fontSize(14)
       .text(summary.Card, 240, y + 10);
    doc.fontSize(7).text("CARD", 240, y + 26);

    // Garis Pemisah 1
    doc.strokeColor(COLORS.border).lineWidth(1)
       .moveTo(290, y + 10).lineTo(290, y + 35).stroke();

    // --- BAGIAN 2: STATUS (BARU) ---

    // IDLE (Hijau)
    doc.fillColor(COLORS.statusIdle).fontSize(14)
       .text(summary.Idle, 310, y + 10);
    doc.fontSize(7).text("IDLE", 310, y + 26);

    // USED (Merah)
    doc.fillColor(COLORS.statusUsed).fontSize(14)
       .text(summary.Used, 360, y + 10);
    doc.fontSize(7).text("USED", 360, y + 26);

    // Garis Pemisah 2
    doc.strokeColor(COLORS.border).lineWidth(1)
       .moveTo(410, y + 10).lineTo(410, y + 35).stroke();

    // --- BAGIAN 3: TOTAL ---
    
    // Grand Total
    doc.fillColor(COLORS.textMain).fontSize(14)
       .text(summary.Total, 430, y + 10);
    doc.fontSize(7).text("TOTAL UNIT", 430, y + 26);
}

/** Menggambar Header Tabel */
function drawTableHeader(doc, y) {
    doc.fillColor(COLORS.siteHeader).rect(50, y, 500, 20).fill();
    doc.fillColor(COLORS.textMuted).fontSize(9).font('Helvetica-Bold')
       .text("NO", 55, y + 5)
       .text("MODUL", 85, y + 5)
       .text("KODE / NAMA", 150, y + 5)
       .text("SERIAL NUMBER", 350, y + 5)
       .text("STATUS", 480, y + 5, { align: 'right', width: 60 });
}

/** Header Dokumen Utama */
function generateDocumentHeader(doc, title, subtitle) {
    doc.rect(0, 0, 595, 80).fill(COLORS.headerBg);
    
    doc.fillColor(COLORS.headerText).fontSize(20).font('Helvetica-Bold')
       .text('NETRO INVENTORY', 50, 25);
    
    doc.fontSize(10).font('Helvetica')
       .text(title.toUpperCase(), 50, 50)
       .text(subtitle, 50, 65, { align: 'left' });

    doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, 400, 25, { align: 'right', width: 150 });
}

/** UTAMA: EXPORT PDF */
exports.exportPdf = async (req, res) => {
    const { category, site } = req.query;
    
    try {
        // 1. PENGAMBILAN DATA
        let data = [];
        let titleDoc = "";

        const normalize = (items, type) => items.map(d => ({
            type,
            site: d.site || (d.Tempat ? d.Tempat.site : (d.kode_sfp ? d.kode_sfp.split('-')[0] : '-')),
            kode: d.kode_sfp || d.kode_lpuf || d.kode_card || d.card_name || '-',
            serial: d.serial_number || d.serial || '-',
            status: (d.status || '').toUpperCase()
        }));

        if (category === 'sfp') {
            titleDoc = "Laporan Aset SFP";
            const raw = await Sfp.findAll({ include: [{ model: Tempat, attributes: ['site'] }] });
            data = normalize(raw, 'SFP');
        } else if (category === 'lpuf') {
            titleDoc = "Laporan Aset LPUF";
            const raw = await Lpuf.findAll();
            data = normalize(raw, 'LPUF');
        } else if (category === 'card') {
            titleDoc = "Laporan Aset Card";
            const raw = await Card.findAll();
            data = normalize(raw, 'Card');
        } else {
            titleDoc = "Laporan Gabungan Aset";
            const sfp = await Sfp.findAll({ include: [{ model: Tempat, attributes: ['site'] }] });
            const lpuf = await Lpuf.findAll();
            const card = await Card.findAll();
            data = [...normalize(sfp, 'SFP'), ...normalize(lpuf, 'LPUF'), ...normalize(card, 'Card')];
        }

        // 2. FILTER & SORTING
        if (site) data = data.filter(d => d.site === site);

        data.sort((a, b) => {
            if (a.site === b.site) {
                return a.type.localeCompare(b.type);
            }
            return a.site.localeCompare(b.site);
        });

        // --- 3. HITUNG RINGKASAN (DIPERBARUI) ---
        const summary = {
            // Per Jenis
            SFP: data.filter(d => d.type === 'SFP').length,
            LPUF: data.filter(d => d.type === 'LPUF').length,
            Card: data.filter(d => d.type === 'Card').length,
            // Per Status (BARU)
            Idle: data.filter(d => d.status === 'IDLE').length,
            Used: data.filter(d => d.status === 'USED').length,
            // Total
            Total: data.length
        };

        // 4. GENERATE PDF
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Laporan-${Date.now()}.pdf`);
        doc.pipe(res);

        generateDocumentHeader(doc, titleDoc, site ? `Filter Site: ${site}` : "Semua Site");

        // Gambar Kotak Ringkasan
        let y = 100;
        drawSummaryBox(doc, y, summary);
        y += 65; 

        let currentSite = null;
        let no = 1;

        if (data.length === 0) {
            doc.fillColor('black').text("Tidak ada data ditemukan.", 50, y);
        }

        data.forEach((item, index) => {
            if (y > 720) {
                doc.addPage();
                y = 50; 
                currentSite = null; 
            }

            if (currentSite !== item.site) {
                if (index > 0 && currentSite !== null) y += 15;
                
                doc.fillColor(COLORS.headerBg).fontSize(12).font('Helvetica-Bold')
                   .text(`SITE: ${item.site}`, 50, y);
                
                doc.strokeColor(COLORS.border).lineWidth(2)
                   .moveTo(50, y + 15).lineTo(550, y + 15).stroke();
                
                y += 25;
                drawTableHeader(doc, y);
                y += 25;
                
                currentSite = item.site;
                no = 1;
            }

            doc.fillColor(COLORS.textMain).fontSize(9).font('Helvetica')
               .text(no++, 55, y + 2);

            let typeColor = COLORS.badgeSFP;
            if (item.type === 'LPUF') typeColor = COLORS.badgeLPUF;
            if (item.type === 'Card') typeColor = COLORS.badgeCard;
            drawBadge(doc, 80, y, item.type, typeColor, 40);

            doc.fillColor(COLORS.textMain).text(item.kode, 150, y + 2, { width: 190, lineBreak: false, ellipsis: true });
            doc.fillColor(COLORS.textMuted).text(item.serial, 350, y + 2);

            let statusColor = COLORS.statusIdle;
            if (item.status === 'USED') statusColor = COLORS.statusUsed;
            if (item.status === 'RUSAK') statusColor = COLORS.statusRusak;
            drawBadge(doc, 490, y, item.status, statusColor, 60);

            doc.strokeColor(COLORS.border).lineWidth(0.5)
               .moveTo(50, y + 18).lineTo(550, y + 18).stroke();

            y += 22;
        });

        doc.fontSize(8).fillColor(COLORS.textMuted)
           .text("Dicetak otomatis oleh Sistem Netro Inventory.", 50, 780, { align: 'center', width: 500 });

        doc.end();

    } catch (error) {
        console.error("PDF Export Error:", error);
        res.status(500).send("Gagal generate PDF.");
    }
};

/** EXPORT EXCEL */
exports.exportExcel = async (req, res) => {
    const { category, site } = req.query;
    try {
        const workbook = new excel.Workbook();
        const fillSheet = (sheet, data, typeName) => {
            sheet.columns = [
                { header: 'No', key: 'no', width: 5 },
                { header: 'Tipe', key: 'type', width: 10 },
                { header: 'Site', key: 'site', width: 10 },
                { header: 'Kode Modul', key: 'kode', width: 30 },
                { header: 'Serial Number', key: 'serial', width: 25 },
                { header: 'Status', key: 'status', width: 10 }
            ];
            let no = 1;
            data.forEach(item => {
                const itemSite = item.siteFinal || item.site;
                if (!site || itemSite === site) {
                    sheet.addRow({
                        no: no++,
                        type: typeName,
                        site: itemSite,
                        kode: item.kode || item.kode_sfp || item.kode_lpuf || item.kode_card,
                        serial: item.serial || item.serial_number,
                        status: item.status
                    });
                }
            });
        };

        if (category === 'all') {
            const sfpRaw = await Sfp.findAll({ include: [{ model: Tempat, attributes: ['site'] }] });
            const sfpMapped = sfpRaw.map(d => ({ ...d.toJSON(), siteFinal: d.Tempat ? d.Tempat.site : (d.kode_sfp.split('-')[0]) }));
            fillSheet(workbook.addWorksheet('Data SFP'), sfpMapped, 'SFP');
            fillSheet(workbook.addWorksheet('Data LPUF'), await Lpuf.findAll(), 'LPUF');
            fillSheet(workbook.addWorksheet('Data Card'), await Card.findAll(), 'Card');
        } else if (category === 'sfp') {
            const raw = await Sfp.findAll({ include: [{ model: Tempat, attributes: ['site'] }] });
            const mapped = raw.map(d => ({ ...d.toJSON(), siteFinal: d.Tempat ? d.Tempat.site : (d.kode_sfp.split('-')[0]) }));
            fillSheet(workbook.addWorksheet('Data SFP'), mapped, 'SFP');
        } else if (category === 'lpuf') {
            fillSheet(workbook.addWorksheet('Data LPUF'), await Lpuf.findAll(), 'LPUF');
        } else if (category === 'card') {
            fillSheet(workbook.addWorksheet('Data Card'), await Card.findAll(), 'Card');
        }

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Inventory-${category}-${Date.now()}.xlsx`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error("Excel Export Error:", error);
        res.status(500).send("Gagal export Excel.");
    }
};
'use strict';

const db = require('../models');
const { Op } = require("sequelize");

// Menggunakan destructuring untuk mengambil model agar lebih ringkas
const { Tempat, Sfp, Lpuf, Card } = db;

/**
 * Membuat kode unik untuk Tempat.
 * @param {object} data Objek berisi { site, kapasitas, jarak, jenis }.
 * @returns {Promise<string>} Kode Tempat baru, format: SITE-NO-JENIS-KAPASITAS-JARAK.
 */
async function generateKodeTempat(data) {
    const { site, kapasitas, jarak, jenis } = data;

    // Cari tempat terakhir berdasarkan site
    const lastTempat = await Tempat.findOne({
        where: { site },
        order: [['createdAt', 'DESC']]
    });

    let nextNumber = 1;
    if (lastTempat && lastTempat.kode_tempat) {
        const parts = lastTempat.kode_tempat.split('-');
        // Format lama: SITE-NO-JENIS-KAPASITAS-JARAK
        if (parts.length > 1) {
            const lastNumber = parseInt(parts[1], 10);
            if (!isNaN(lastNumber)) {
                nextNumber = lastNumber + 1;
            }
        }
    }

    // Selalu pakai 3 digit angka
    const sequenceNumber = String(nextNumber).padStart(3, '0');

    // Susun kode baru
    return `${site}-${sequenceNumber}-${jenis}-${kapasitas}-${jarak}`;
}

/**
 * FUNGSI GABUNGAN: Membuat kode unik SFP (stok atau terpasang) dengan logika "cari lubang".
 * @param {string|null} kode_tempat - Kode tempat jika SFP terpasang.
 * @param {string} [site] - Kode site (wajib jika kode_tempat null).
 * @param {string} [kapasitas] - Kapasitas SFP (wajib jika kode_tempat null).
 * @param {string} [jarak] - Jarak SFP (wajib jika kode_tempat null).
 * @returns {Promise<string|null>} Kode SFP yang baru.
 */
async function generateKodeSfp(kode_tempat, site, kapasitas, jarak) {
    let prefix;
    let whereClause;
    
    // Skenario 1: SFP terpasang di suatu tempat (menggunakan kode_tempat)
    if (kode_tempat) {
        prefix = kode_tempat;
        whereClause = { kode_sfp: { [Op.startsWith]: `${prefix}-` } };
    } 
    // Skenario 2: SFP adalah stok gudang (standalone)
    else if (site && kapasitas && jarak) {
        prefix = `${site}-${kapasitas}-${jarak}`;
        whereClause = { 
            kode_sfp: { [Op.startsWith]: `${prefix}-` },
            kode_tempat: { [Op.is]: null } // Pastikan hanya mencari SFP stok
        };
    }
    // Jika parameter tidak lengkap untuk kedua skenario
    else {
        // Mengembalikan null jika SFP akan dijadikan stok dari update (tanpa info site, dll)
        // atau jika parameter untuk membuat SFP baru tidak lengkap.
        return null;
    }

    // --- LOGIKA "CARI LUBANG" DITERAPKAN DI SINI ---
    const sfps = await Sfp.findAll({
        where: whereClause,
        attributes: ['kode_sfp'],
        raw: true
    });
    
    const existingNums = sfps
        .map(sfp => parseInt(sfp.kode_sfp.split('-').pop(), 10))
        .filter(num => !isNaN(num))
        .sort((a, b) => a - b);

    let nextId = 1;
    if (existingNums.length > 0) {
        let foundGap = false;
        // Cari "lubang" pertama dalam urutan
        for (let i = 0; i < existingNums.length; i++) {
            if (existingNums[i] !== i + 1) {
                nextId = i + 1;
                foundGap = true;
                break;
            }
        }
        // Jika tidak ada lubang, gunakan nomor urut terakhir + 1
        if (!foundGap) {
            nextId = existingNums.length + 1;
        }
    }
    
    const sequenceNumber = String(nextId).padStart(4, '0');
    return `${prefix}-${sequenceNumber}`;
}


/**
 * Membuat kode unik untuk LPUF.
 * Format: SITE-XXX-LPUF (XXX = 3 digit angka).
 * @param {object} data Objek berisi { site, lpuf }.
 * @returns {Promise<string>} Kode LPUF yang baru.
 */
async function generateKodeLpuf(data) {
    const { site, lpuf } = data;

    // Cari kode terakhir di site yang sama
    const lastLpuf = await Lpuf.findOne({
        where: { site: site },
        order: [['createdAt', 'DESC']]
    });

    let nextNumber = 1;
    if (lastLpuf && lastLpuf.kode_lpuf) {
        const parts = lastLpuf.kode_lpuf.split('-');
        // Ambil angka di tengah: SITE-XXX-LPUF
        if (parts.length >= 3) {
            const lastNumber = parseInt(parts[1], 10);
            if (!isNaN(lastNumber)) {
                nextNumber = lastNumber + 1;
            }
        }
    }

    // Selalu 3 digit
    const sequenceNumber = String(nextNumber).padStart(3, '0');
    return `${site}-${sequenceNumber}-${lpuf}`;
}

/**
 * Membuat kode unik untuk Card Standalone berdasarkan site.
 * @param {string} site Kode site.
 * @returns {Promise<string>} Kode Card Standalone yang baru, format: SITE-CARD-XXX.
 */
async function generateStandaloneCardCode(site) {
    const lastCard = await Card.findOne({
        where: {
            site: site,
            kode_lpuf: { [db.Sequelize.Op.is]: null }
        },
        order: [['kode_card', 'DESC']]
    });

    let nextNumber = 1;
    if (lastCard) {
        const parts = lastCard.kode_card.split('-');
        const lastSequence = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastSequence)) {
            nextNumber = lastSequence + 1;
        }
    }
    
    // UBAH BAGIAN INI: Kembalikan angkanya saja
    return nextNumber; 
}

/**
 * Membuat kode unik untuk Card (dengan 2 skenario).
 * @param {object} data Objek berisi { kode_lpuf, site }.
 * @returns {Promise<string>} Kode Card yang baru.
 */
async function generateKodeCard(data) {
    if (data.kode_lpuf) {
        const prefix = data.kode_lpuf;
        const lastCard = await Card.findOne({
            where: { kode_lpuf: data.kode_lpuf },
            order: [['kode_card', 'DESC']]
        });
        
        let nextNumber = 1;
        if (lastCard) {
            const parts = lastCard.kode_card.split('-');
            const lastSequence = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(lastSequence)) {
                nextNumber = lastSequence + 1;
            }
        }
        
        const sequenceNumber = String(nextNumber).padStart(3, '0');
        return `${prefix}-CARD-${sequenceNumber}`;
    } else {
        // PERBAIKAN DI SINI
        const nextNumber = await generateStandaloneCardCode(data.site);
        const sequenceNumber = String(nextNumber).padStart(3, '0');
        return `${data.site}-CARD-${sequenceNumber}`;
    }
}

// EXPORT SEMUA FUNGSI DALAM SATU OBJECT
module.exports = { 
    generateKodeTempat,
    generateKodeSfp,
    generateKodeLpuf,
    generateKodeCard,
    generateStandaloneCardCode
};
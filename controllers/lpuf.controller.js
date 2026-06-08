'use strict';

const db = require('../models');
const { generateKodeLpuf, generateStandaloneCardCode } = require('../helpers/kodeGenerator');
const Lpuf = db.Lpuf;
const Card = db.Card;
const { logActivity } = require('../helpers/logActivity'); // <-- IMPORT HELPER LOG

/**
 * Membuat data LPUF baru.
 */
exports.create = async (req, res) => {
    const { site, lpuf, serial, status } = req.body;
    if (!site || !lpuf || !serial || !status) {
        return res.status(400).send({ message: "Field wajib: 'site', 'lpuf', 'serial', dan 'status'." });
    }

    try {
        const existingSerial = await Lpuf.findOne({ where: { serial: serial } });
        if (existingSerial) {
            return res.status(409).send({ message: `Gagal! Serial '${serial}' sudah terdaftar.` });
        }

        const kode_lpuf = await generateKodeLpuf({ site, lpuf });
        const newLpuf = await Lpuf.create({ ...req.body, kode_lpuf });

        // --- LOGGING ---
        await logActivity({
            userId: req.userId,
            action: 'CREATE',
            module: 'LPUF',
            moduleId: newLpuf.id,
            newData: newLpuf.toJSON()
        });

        res.status(201).send({ message: "✅ Data LPUF berhasil dibuat!", data: newLpuf });
    } catch (error) {
        console.error("Error saat membuat LPUF:", error);
        res.status(500).send({ message: error.message || "Terjadi kesalahan saat membuat data LPUF." });
    }
};

/**
 * Mengambil semua data LPUF dengan opsi filter.
 */
exports.findAll = async (req, res) => {
    // Fungsi ini tidak mengubah data, jadi tidak perlu logging aktivitas.
    const { site, status } = req.query;
    let condition = {};
    if (site) condition.site = site;
    if (status) condition.status = status;

    try {
        const data = await Lpuf.findAll({
            where: condition,
            include: [{
                model: Card,
                as: 'cards',
                attributes: ['id', 'kode_card', 'status']
            }],
            order: [['createdAt', 'DESC']]
        });
        res.send(data);
    } catch (error) {
        console.error("Error saat mencari semua LPUF:", error);
        res.status(500).send({ message: error.message || "Terjadi kesalahan saat mengambil data LPUF." });
    }
};

/**
 * Mengambil satu LPUF beserta semua Card-nya berdasarkan ID.
 */
exports.findOne = async (req, res) => {
    // Fungsi ini tidak mengubah data, jadi tidak perlu logging aktivitas.
    const id = req.params.id;
    try {
        const data = await Lpuf.findByPk(id, {
            include: [{ model: Card, as: 'cards' }]
        });

        if (data) {
            res.send(data);
        } else {
            res.status(404).send({ message: `Data LPUF dengan id=${id} tidak ditemukan.` });
        }
    } catch (error) {
        console.error(`Error saat mencari LPUF dengan id=${id}:`, error);
        res.status(500).send({ message: "Terjadi kesalahan saat mengambil data LPUF." });
    }
};

/**
 * Memperbarui data LPUF berdasarkan ID.
 */
exports.update = async (req, res) => {
    const id = req.params.id;
    try {
        const lpufToUpdate = await Lpuf.findByPk(id);
        if (!lpufToUpdate) {
            return res.status(404).send({ message: `Data LPUF dengan id=${id} tidak ditemukan.` });
        }
        
        // Simpan data lama SEBELUM diupdate untuk keperluan logging
        const oldData = lpufToUpdate.toJSON();

        const updateData = req.body;
        if ((updateData.site && updateData.site !== lpufToUpdate.site) || (updateData.lpuf && updateData.lpuf !== lpufToUpdate.lpuf)) {
            updateData.kode_lpuf = await generateKodeLpuf({
                site: updateData.site || lpufToUpdate.site,
                lpuf: updateData.lpuf || lpufToUpdate.lpuf
            });
        }

        await lpufToUpdate.update(updateData);
        
        // --- LOGGING ---
        await logActivity({
            userId: req.userId,
            action: 'UPDATE',
            module: 'LPUF',
            moduleId: id,
            oldData: oldData,
            newData: lpufToUpdate.toJSON() // lpufToUpdate sekarang berisi data terbaru
        });
        
        res.send({ message: `✅ Data LPUF berhasil diperbarui.`, data: lpufToUpdate });
    } catch (error) {
        console.error(`Error saat memperbarui LPUF dengan id=${id}:`, error);
        res.status(500).send({ message: "Terjadi kesalahan saat memperbarui data LPUF." });
    }
};

/**
 * Menghapus LPUF dan mengubah Card terkait menjadi standalone.
 */
exports.destroy = async (req, res) => {
    const id = req.params.id;
    const transaction = await db.sequelize.transaction();

    try {
        const lpufToDelete = await Lpuf.findByPk(id, { transaction });
        if (!lpufToDelete) {
            await transaction.rollback();
            return res.status(404).send({ message: `LPUF dengan id=${id} tidak ditemukan.` });
        }

        const oldData = lpufToDelete.toJSON();
        
        const relatedCards = await Card.findAll({
            where: { kode_lpuf: lpufToDelete.kode_lpuf },
            transaction
        });

        const updatedCardsInfo = [];

        // HANYA JALANKAN LOGIKA INI JIKA ADA CARD TERKAIT
        if (relatedCards.length > 0) {
            // ================================================================
            // AWAL PERBAIKAN
            // ================================================================

            // 1. Dapatkan nomor urut AWAL sekali saja SEBELUM loop
            let nextSequenceNumber = await generateStandaloneCardCode(lpufToDelete.site);

            for (const card of relatedCards) {
                const oldKodeCard = card.kode_card;
                
                // 2. Buat kode baru menggunakan nomor urut dari variabel
                const sequenceString = String(nextSequenceNumber).padStart(3, '0');
                const newKodeCard = `${lpufToDelete.site}-CARD-${sequenceString}`;

                await card.update({
                    kode_lpuf: null,
                    kode_card: newKodeCard
                }, { transaction });
                
                updatedCardsInfo.push(`${oldKodeCard} ➝ ${newKodeCard}`);

                // 3. NAIKKAN NOMOR URUT untuk iterasi berikutnya
                nextSequenceNumber++;
            }
            // ================================================================
            // AKHIR PERBAIKAN
            // ================================================================
        }

        await lpufToDelete.destroy({ transaction });
        await transaction.commit();

        // --- LOGGING --- (Setelah transaksi berhasil)
        await logActivity({
            userId: req.userId,
            action: 'DELETE',
            module: 'LPUF',
            moduleId: id,
            oldData: oldData,
            newData: { updatedCards: updatedCardsInfo } // Catat juga card yg berubah
        });

        let message = `✅ LPUF ${lpufToDelete.kode_lpuf} berhasil dihapus.`;
        if (updatedCardsInfo.length > 0) {
            message += ` ${updatedCardsInfo.length} card terkait diubah menjadi standalone.`;
        }

        res.send({ message: message, updatedCards: updatedCardsInfo });

    } catch (error) {
        await transaction.rollback();
        console.error("Error saat menghapus LPUF:", error);
        // Kirim error yang lebih spesifik jika itu adalah unique constraint
        if (error.name === 'SequelizeUniqueConstraintError') {
             res.status(409).send({ message: "Gagal menghapus LPUF: Terjadi duplikasi kode card. " + error.message });
        } else {
             res.status(500).send({ message: "Gagal menghapus LPUF: " + error.message });
        }
    }
};
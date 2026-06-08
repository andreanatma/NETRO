'use strict';

const db = require('../models');
const { generateKodeCard } = require('../helpers/kodeGenerator');
const Card = db.Card;
const Lpuf = db.Lpuf;
const { logActivity } = require('../helpers/logActivity'); // <-- IMPORT HELPER LOG

/**
 * @description Membuat data Card baru, baik yang terikat LPUF maupun standalone.
 * @route POST /api/card
 */
exports.create = async (req, res) => {
    const { kode_lpuf, site, card_name, type, serial, status } = req.body;

    if (!card_name || !type || !serial || !status) {
        return res.status(400).send({ message: "Field 'card_name', 'type', 'serial', dan 'status' wajib diisi." });
    }
    if (!kode_lpuf && !site) {
        return res.status(400).send({ message: "Field 'kode_lpuf' atau 'site' wajib diisi." });
    }

    try {
        const existingSerial = await Card.findOne({ where: { serial: serial } });
        if (existingSerial) {
            return res.status(409).send({ message: `Gagal! Serial '${serial}' sudah terdaftar.` });
        }

        let newCardData = { ...req.body };
        let generationParams = {};

        if (kode_lpuf) {
            // Skenario 1: Card terikat pada LPUF
            const lpuf = await Lpuf.findOne({ where: { kode_lpuf: kode_lpuf } });
            if (!lpuf) {
                return res.status(404).send({ message: `LPUF dengan kode '${kode_lpuf}' tidak ditemukan.` });
            }
            newCardData.site = lpuf.site;
            generationParams = { kode_lpuf };
        } else {
            // Skenario 2: Card berdiri sendiri (standalone)
            newCardData.kode_lpuf = null;
            generationParams = { site };
        }

        const kode_card = await generateKodeCard(generationParams);
        newCardData.kode_card = kode_card;

        const createdCard = await Card.create(newCardData);

        // --- LOGGING ---
        await logActivity({
            userId: req.userId,
            action: 'CREATE',
            module: 'CARD',
            moduleId: createdCard.id,
            newData: createdCard.toJSON()
        });
        
        res.status(201).send({ message: "✅ Data Card berhasil dibuat!", data: createdCard });

    } catch (error) {
        console.error("Error saat membuat Card:", error);
        res.status(500).send({ message: error.message || "Terjadi kesalahan saat membuat data Card." });
    }
};

/**
 * @description Mengambil semua data Card dengan opsi filter.
 * @route GET /api/card
 */
exports.findAll = async (req, res) => {
    // Fungsi ini tidak mengubah data, jadi tidak perlu logging aktivitas.
    const { site, serial, kode_lpuf, status, type } = req.query;
    let condition = {};

    if (site) condition.site = site;
    if (serial) condition.serial = serial;
    if (kode_lpuf) condition.kode_lpuf = kode_lpuf;
    if (status) condition.status = status;
    if (type) condition.type = type;

    try {
        const data = await Card.findAll({
            where: condition,
            include: [{
                model: Lpuf,
                attributes: ['lpuf']
            }],
            order: [['createdAt', 'DESC']]
        });
        res.send(data);
    } catch (error) {
        console.error("Error saat mencari semua Card:", error);
        res.status(500).send({ message: error.message || "Terjadi kesalahan saat mengambil data Card." });
    }
};

/**
 * @description Mengambil satu Card beserta detail LPUF-nya (jika ada).
 * @route GET /api/card/:id
 */
exports.findOne = async (req, res) => {
    // Fungsi ini tidak mengubah data, jadi tidak perlu logging aktivitas.
    const id = req.params.id;
    try {
        const data = await Card.findByPk(id, {
            include: [{ model: Lpuf }]
        });

        if (data) {
            res.send(data);
        } else {
            res.status(404).send({ message: `Data Card dengan id=${id} tidak ditemukan.` });
        }
    } catch (error) {
        console.error(`Error saat mencari Card dengan id=${id}:`, error);
        res.status(500).send({ message: "Terjadi kesalahan saat mengambil data Card." });
    }
};

/**
 * @description Memperbarui data Card berdasarkan ID.
 * @route PUT /api/card/:id
 */
exports.update = async (req, res) => {
    const id = req.params.id;
    try {
        const cardToUpdate = await Card.findByPk(id);
        if (!cardToUpdate) {
            return res.status(404).send({ message: `Data Card dengan id=${id} tidak ditemukan.` });
        }
        
        // Simpan data lama SEBELUM diupdate untuk logging
        const oldData = cardToUpdate.toJSON();

        let updateData = req.body;
        let needsNewCode = false;
        const originalCode = cardToUpdate.kode_card;

        if (updateData.kode_lpuf !== undefined && updateData.kode_lpuf !== cardToUpdate.kode_lpuf) {
            needsNewCode = true;
        } else if (updateData.site !== undefined && updateData.site !== cardToUpdate.site && cardToUpdate.kode_lpuf === null) {
            needsNewCode = true;
        }

        if (needsNewCode) {
            const generationParams = updateData.kode_lpuf ? { kode_lpuf: updateData.kode_lpuf } : { site: updateData.site };
            updateData.kode_card = await generateKodeCard(generationParams);
        }
        
        await cardToUpdate.update(updateData);
        
        // --- LOGGING ---
        await logActivity({
            userId: req.userId,
            action: 'UPDATE',
            module: 'CARD',
            moduleId: id,
            oldData: oldData,
            newData: cardToUpdate.toJSON()
        });
        
        let message = `✅ Data Card '${originalCode}' berhasil diperbarui.`;
        if(needsNewCode) {
            message = `✅ Data Card berhasil diperbarui (Kode berubah dari '${originalCode}' menjadi '${cardToUpdate.kode_card}').`
        }

        res.send({ message, data: cardToUpdate });

    } catch (error) {
        console.error(`Error saat memperbarui Card dengan id=${id}:`, error);
        res.status(500).send({ message: "Terjadi kesalahan saat memperbarui data Card." });
    }
};

/**
 * @description Menghapus data Card berdasarkan ID.
 * @route DELETE /api/card/:id
 */
exports.destroy = async (req, res) => {
    const id = req.params.id;
    try {
        // Cari dulu data yang akan dihapus untuk logging
        const cardToDelete = await Card.findByPk(id);
        if (!cardToDelete) {
             return res.status(404).send({ message: `Gagal menghapus. Data Card dengan id=${id} tidak ditemukan.` });
        }

        // Simpan data lama SEBELUM dihapus
        const oldData = cardToDelete.toJSON();

        await Card.destroy({ where: { id: id } }); // Lanjutkan proses hapus

        // --- LOGGING ---
        await logActivity({
            userId: req.userId,
            action: 'DELETE',
            module: 'CARD',
            moduleId: id,
            oldData: oldData,
            newData: {}
        });

        res.send({ message: "✅ Data Card berhasil dihapus!" });

    } catch (error) {
        console.error(`Error saat menghapus Card dengan id=${id}:`, error);
        res.status(500).send({ message: "Terjadi kesalahan saat menghapus data Card." });
    }
};
// controllers/tempat.controller.js
const db = require('../models');
const { Sequelize } = require('sequelize');
const Tempat = db.Tempat;
const { logActivity } = require('../helpers/logActivity');

/**
 * Helper function untuk mencari nomor urut kosong (lubang) atau nomor urut berikutnya.
 * Exclude record tertentu (untuk update) agar seq lama bisa di-reuse jika ada gap.
 */
const findNextTempatCode = async ({ site, jenis, kapasitas, jarak, excludeId = null }) => {
    // --- PERBAIKAN SQLITE: Menggunakan SUBSTR dan INSTR untuk memotong teks ---
    let query = `
        SELECT CAST(
            SUBSTR(
                SUBSTR(kode_tempat, INSTR(kode_tempat, '-') + 1), 
                1, 
                INSTR(SUBSTR(kode_tempat, INSTR(kode_tempat, '-') + 1) || '-', '-') - 1
            ) AS INTEGER
        ) AS seq_num
        FROM tempat
        WHERE site = :site
    `;
    const replacements = { site: site.toUpperCase() };
    
    if (excludeId) {
        query += ' AND id != :excludeId';
        replacements.excludeId = excludeId;
    }
    
    query += ' ORDER BY seq_num ASC';
    
    const results = await db.sequelize.query(query, {
        replacements,
        type: Sequelize.QueryTypes.SELECT
    });

    const existingNums = results.map(r => r.seq_num).filter(num => num !== null && !isNaN(num));

    let nextId = 1;
    if (existingNums.length > 0) {
        // Logika untuk mencari "lubang" atau nomor berikutnya sudah benar.
        const sortedNums = existingNums.sort((a, b) => a - b);
        let expectedNum = 1;
        let foundGap = false;
        for (const num of sortedNums) {
            if (num > expectedNum) {
                nextId = expectedNum;
                foundGap = true;
                break;
            }
            expectedNum++;
        }
        if (!foundGap) {
            nextId = sortedNums[sortedNums.length - 1] + 1;
        }
    }
    
    return `${site.toUpperCase()}-${String(nextId).padStart(3, '0')}-${kapasitas.toUpperCase()}-${jarak.toUpperCase()}-${jenis.toUpperCase()}`;
};

// 1. Membuat Tempat baru
exports.create = async (req, res) => {
    const { site, jenis, kapasitas, jarak } = req.body;

    if (!site || !jenis || !kapasitas || !jarak) {
        return res.status(400).send({ message: "Semua field wajib diisi!" });
    }

    try {
        const kode_tempat = await findNextTempatCode({ site, jenis, kapasitas, jarak });
        const newTempatData = { 
            site: site.toUpperCase(), 
            jenis: jenis.toUpperCase(), 
            kapasitas: kapasitas.toUpperCase(), 
            jarak: jarak.toUpperCase(), 
            kode_tempat 
        };

        const newTempat = await Tempat.create(newTempatData); // Buat data dulu

        // --- LOGGING --- (Setelah data berhasil dibuat)
        await logActivity({
            userId: req.userId,
            action: 'CREATE',
            module: 'TEMPAT', 
            moduleId: newTempat.id, 
            newData: newTempat.toJSON() 
        });

        res.status(201).send({ message: "✅ Data Tempat berhasil dibuat!", data: newTempat });
    } catch (error) {
        console.error('Error saat membuat Tempat:', error);
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).send({ message: `Validasi gagal: ${error.errors.map(e => e.message).join(', ')}` });
        }
        res.status(500).send({ message: error.message || "Terjadi kesalahan saat membuat data Tempat." });
    }
};

// 2. Mengambil semua data Tempat
exports.findAll = async (req, res) => {
    try {
        const { site } = req.query;
        const condition = site ? { site: site.toUpperCase() } : null;
        const data = await Tempat.findAll({ 
            where: condition, 
            order: [['kode_tempat', 'ASC']] 
        });
        res.send(data);
    } catch (error) {
        console.error('Error saat mengambil semua Tempat:', error);
        res.status(500).send({ message: error.message || "Terjadi kesalahan saat mengambil data Tempat." });
    }
};

// 3. Mengambil satu data Tempat
exports.findOne = async (req, res) => {
    const id = req.params.id;
    try {
        const data = await Tempat.findByPk(id);
        if (data) {
            res.send(data);
        } else {
            res.status(404).send({ message: `Data Tempat dengan id=${id} tidak ditemukan.` }); // PERBAIKAN: Dari 44 menjadi 404
        }
    } catch (error) {
        console.error(`Error saat mencari Tempat dengan id=${id}:`, error);
        res.status(500).send({ message: "Terjadi kesalahan saat mengambil data Tempat." });
    }
};

// 4. Memperbarui Tempat
exports.update = async (req, res) => {
    const id = req.params.id;
    const transaction = await db.sequelize.transaction();

    try {
        const tempatLama = await Tempat.findByPk(id, { transaction });
        if (!tempatLama) {
            await transaction.rollback();
            return res.status(404).send({ message: `Tempat dengan id=${id} tidak ditemukan.` });
        }

        // Simpan data lama untuk logging SEBELUM diubah
        const oldData = tempatLama.toJSON();

        const { site, jenis, kapasitas, jarak } = req.body;
        
        if (!site || !jenis || !kapasitas || !jarak) {
            await transaction.rollback();
            return res.status(400).send({ message: "Semua field wajib diisi!" });
        }

        const siteNew = site.toUpperCase();
        const jenisNew = jenis.toUpperCase();
        const kapasitasNew = kapasitas.toUpperCase();
        const jarakNew = jarak.toUpperCase();
        
        let kode_tempat_baru = tempatLama.kode_tempat;

        const hasChanges = (
            siteNew !== tempatLama.site ||
            jenisNew !== tempatLama.jenis ||
            kapasitasNew !== tempatLama.kapasitas ||
            jarakNew !== tempatLama.jarak
        );

        if (hasChanges) {
            kode_tempat_baru = await findNextTempatCode({ 
                site: siteNew, jenis: jenisNew, kapasitas: kapasitasNew, jarak: jarakNew, 
                excludeId: id 
            });
        }

        const dataToUpdate = { site: siteNew, jenis: jenisNew, kapasitas: kapasitasNew, jarak: jarakNew, kode_tempat: kode_tempat_baru };
        
        await Tempat.update(dataToUpdate, { where: { id: id }, transaction });
        
        await transaction.commit();

        const updatedTempat = await Tempat.findByPk(id); // Ambil data terbaru untuk log

        // --- LOGGING ---
        await logActivity({
            userId: req.userId,
            action: 'UPDATE',
            module: 'TEMPAT',
            moduleId: id,
            oldData: oldData, 
            newData: updatedTempat.toJSON() 
        });
        
        res.send({ 
            message: `✅ Tempat berhasil diperbarui. Kode lama: ${oldData.kode_tempat}, Kode baru: ${kode_tempat_baru}`,
            data: updatedTempat
        });

    } catch (error) {
        await transaction.rollback();
        console.error(`Error saat memperbarui Tempat dengan id=${id}:`, error);
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).send({ message: `Validasi gagal: ${error.errors.map(e => e.message).join(', ')}` });
        }
        res.status(500).send({ message: "Terjadi kesalahan saat memperbarui data Tempat." });
    }
};

// 5. Menghapus Tempat
exports.destroy = async (req, res) => {
    const id = req.params.id;
    try {
        const tempatToDelete = await Tempat.findByPk(id); // Cari dulu data yang akan dihapus
        if (!tempatToDelete) {
            return res.status(404).send({ message: `Gagal menghapus. Tempat dengan id=${id} tidak ditemukan.` });
        }

        // Simpan data lama untuk logging SEBELUM dihapus
        const oldData = tempatToDelete.toJSON();

        await Tempat.destroy({ where: { id: id } }); // Hapus data

        // --- LOGGING --- (Setelah data berhasil dihapus)
        await logActivity({
            userId: req.userId,
            action: 'DELETE',
            module: 'TEMPAT', 
            moduleId: id,
            oldData: oldData, 
            newData: {}
        });

        res.send({ message: "✅ Tempat berhasil dihapus!" });

    } catch (error) {
        console.error(`Error saat menghapus Tempat dengan id=${id}:`, error);
        res.status(500).send({ message: "Terjadi kesalahan saat menghapus data Tempat." });
    }
};
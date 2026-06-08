'use strict';

const db = require('../models');
const { Sfp, Tempat } = db;
const { generateKodeSfp } = require('../helpers/kodeGenerator');
const { logActivity } = require('../helpers/logActivity');
const sequelize = db.sequelize;
const { Op } = require("sequelize");

/**
 * Helper untuk normalisasi input (misal: "NONE", "-", spasi menjadi null).
 */
const normalizeInput = (value) => {
    if (value === null || value === undefined) return null;
    const strValue = String(value).trim().toUpperCase();
    if (["NONE", "-", ""].includes(strValue)) return null;
    return strValue;
};

/**
 * Membuat data SFP baru.
 */
exports.create = async (req, res) => {
    // Ambil semua field yang relevan dari body
    const { kode_tempat, kapasitas, jarak, merk, serial_number, kondisi, status, keterangan } = req.body;

    // Validasi field wajib yang baru dan lebih sederhana
    if (!kode_tempat || !kapasitas || !jarak || !merk || !serial_number || !kondisi || !status) {
        return res.status(400).send({ message: "Semua field (selain keterangan) wajib diisi." });
    }

    try {
        // Validasi apakah kode_tempat ada di tabel Tempat
        const tempatExists = await Tempat.findOne({ where: { kode_tempat } });
        if (!tempatExists) {
            return res.status(400).send({ message: `Gagal! Kode Tempat '${kode_tempat}' tidak ditemukan.` });
        }

        // Validasi keunikan Serial Number
        const existingSerial = await Sfp.findOne({ where: { serial_number } });
        if (existingSerial) {
            return res.status(409).send({ message: `Gagal! Serial Number '${serial_number}' sudah terdaftar.` });
        }

        // Generate kode SFP baru berdasarkan kode_tempat
        const kode_sfp = await generateKodeSfp(kode_tempat);
        
        const newSfp = await Sfp.create({
            kode_sfp, kode_tempat, kapasitas, jarak, merk, serial_number, kondisi, status, keterangan
        });

        await logActivity({
            userId: req.userId, action: 'CREATE', module: 'SFP',
            moduleId: newSfp.id, newData: newSfp.toJSON()
        });

        res.status(201).send({ message: "✅ Data SFP berhasil dibuat!", data: newSfp });

    } catch (error) {
        console.error("Error saat membuat SFP:", error);
        res.status(500).send({ message: error.message || "Terjadi kesalahan saat membuat data SFP." });
    }
};

/**
 * Mengambil semua data SFP dengan filter.
 */
exports.findAll = async (req, res) => {
    const { status, site } = req.query;
    
    const whereClauses = [];
    if (status) {
        whereClauses.push({ status: status });
    }
    if (site) {
        // Ini adalah logika fallback: cari site di tabel Tempat, ATAU dari potongan kode_sfp
        const siteLiteral = sequelize.literal(`COALESCE(Tempat.site, SUBSTRING_INDEX(Sfp.kode_sfp, '-', 1)) = '${site}'`);
        whereClauses.push(siteLiteral);
    }

    try {
        const data = await Sfp.findAll({
            include: [{
                model: Tempat,
                // PERBAIKAN: Ambil atribut di sini, bukan di 'attributes' utama
                attributes: ['site', 'jenis'],
                required: false // Gunakan LEFT JOIN agar SFP tanpa tempat tetap muncul
            }],
            where: {
                [Op.and]: whereClauses // Gabungkan semua kondisi dengan aman menggunakan Op.and
            },
            order: [['createdAt', 'DESC']]
        });

        // Proses data secara manual untuk menambahkan 'site' virtual jika perlu
        const processedData = data.map(item => {
            const itemJson = item.toJSON();
            if (!itemJson.Tempat) {
                itemJson.site = itemJson.kode_sfp.split('-')[0] || 'N/A';
            } else {
                itemJson.site = itemJson.Tempat.site;
            }
            return itemJson;
        });

        res.send(processedData);
    } catch (error) {
        console.error("Error saat mencari semua SFP:", error);
        res.status(500).send({ message: "Gagal mengambil data SFP: " + error.message });
    }
};

/**
 * Mengambil satu data SFP.
 */
exports.findOne = async (req, res) => {
    const { id } = req.params;
    try {
        const data = await Sfp.findByPk(id, {
            include: [{ model: Tempat, attributes: ['site', 'jenis'], required: false }]
        });
        if (data) {
            res.send(data);
        } else {
            res.status(404).send({ message: `Data SFP dengan id=${id} tidak ditemukan.` });
        }
    } catch (error) {
        res.status(500).send({ message: "Terjadi kesalahan saat mengambil data SFP." });
    }
};

/**
 * Memperbarui data SFP.
 */
exports.update = async (req, res) => {
    const { id } = req.params;
    try {
        const sfpToUpdate = await Sfp.findByPk(id);
        if (!sfpToUpdate) {
            return res.status(404).send({ message: `Data SFP dengan id=${id} tidak ditemukan.` });
        }

        const oldData = sfpToUpdate.toJSON();
        const updateData = req.body;
        const kodeTempatLama = normalizeInput(sfpToUpdate.kode_tempat);
        const kodeTempatBaru = normalizeInput(updateData.kode_tempat);
        const oldKodeSfp = sfpToUpdate.kode_sfp;
        
        updateData.kode_tempat = kodeTempatBaru;

        if (kodeTempatBaru && kodeTempatLama !== kodeTempatBaru) {
            const tempatExists = await Tempat.findOne({ where: { kode_tempat: kodeTempatBaru } });
            if (!tempatExists) {
                return res.status(400).send({ message: `Gagal! KODE_TEMPAT '${kodeTempatBaru}' tidak terdaftar.` });
            }
        }

        const hasRelevantChange = (kodeTempatBaru !== kodeTempatLama) || 
                                  (updateData.site && updateData.site !== oldData.site) ||
                                  (updateData.kapasitas && updateData.kapasitas !== oldData.kapasitas) ||
                                  (updateData.jarak && updateData.jarak !== oldData.jarak);

        if (hasRelevantChange) {
            const newKodeSfp = await generateKodeSfp(
                kodeTempatBaru,
                updateData.site || oldData.site,
                updateData.kapasitas || sfpToUpdate.kapasitas,
                updateData.jarak || sfpToUpdate.jarak
            );
            if (newKodeSfp) {
                updateData.kode_sfp = newKodeSfp;
            }
        }
        
        const [num] = await Sfp.update(updateData, { where: { id: id } });

        if (num === 1) {
            const updatedSfp = await Sfp.findByPk(id);
            await logActivity({
                userId: req.userId, action: 'UPDATE', module: 'SFP',
                moduleId: id, oldData: oldData, newData: updatedSfp.toJSON()
            });
            const newKodeSfp = updatedSfp.kode_sfp;
            let message = `✅ Berhasil update ${newKodeSfp}`;
            if (newKodeSfp !== oldKodeSfp) {
                message = `✅ Berhasil update: ${oldKodeSfp} ➝ ${newKodeSfp}`;
            }
            res.send({ message, data: updatedSfp });
        } else {
            res.send({ message: `Tidak ada perubahan yang dilakukan pada SFP dengan id=${id}.`, data: sfpToUpdate });
        }
    } catch (error) {
        if (error.name === 'SequelizeForeignKeyConstraintError') {
            return res.status(400).send({ message: `Gagal! Kode Tempat '${req.body.kode_tempat}' tidak valid.` });
        }
        console.error(`Error saat memperbarui SFP dengan id=${id}:`, error);
        res.status(500).send({ message: "Terjadi kesalahan saat memperbarui data SFP." });
    }
};

/**
 * Menghapus data SFP.
 */
exports.destroy = async (req, res) => {
    const { id } = req.params;
    try {
        const sfpToDelete = await Sfp.findByPk(id);
        if (!sfpToDelete) {
            return res.status(404).send({ message: `Gagal menghapus. Data SFP dengan id=${id} tidak ditemukan.` });
        }
        const oldData = sfpToDelete.toJSON();
        const num = await Sfp.destroy({ where: { id: id } });
        if (num === 1) {
            await logActivity({
                userId: req.userId, action: 'DELETE', module: 'SFP',
                moduleId: id, oldData: oldData, newData: {}
            });
            res.send({ message: "✅ Data SFP berhasil dihapus!" });
        }
    } catch (error) {
        console.error(`Error saat menghapus SFP dengan id=${id}:`, error);
        res.status(500).send({ message: "Terjadi kesalahan." });
    }
};
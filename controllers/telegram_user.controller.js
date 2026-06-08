// controllers/telegram_user.controller.js
const db = require('../models');
const TelegramUser = db.TelegramUser;

exports.findAll = async (req, res) => {
    try {
        // PENTING: Urutkan berdasarkan joined_at, bukan createdAt
        const users = await TelegramUser.findAll({ order: [['joined_at', 'DESC']] });
        res.status(200).send(users);
    } catch (error) {
        console.error("Error Get Telegram Users:", error);
        res.status(500).send({ message: "Terjadi kesalahan saat mengambil data user Telegram." });
    }
};

exports.update = async (req, res) => {
    const id = req.params.id;
    try {
        const { role } = req.body; // Hanya update role, tanpa status
        const user = await TelegramUser.findByPk(id);
        
        if (!user) return res.status(404).send({ message: "User Telegram tidak ditemukan." });

        await TelegramUser.update({ role }, { where: { id: id } });
        res.status(200).send({ message: "Akses User Telegram berhasil diperbarui." });
    } catch (error) {
        console.error("Error Update Telegram User:", error);
        res.status(500).send({ message: "Gagal memperbarui data user Telegram." });
    }
};

exports.destroy = async (req, res) => {
    const id = req.params.id;
    try {
        await TelegramUser.destroy({ where: { id: id } });
        res.status(200).send({ message: "User Telegram berhasil dihapus." });
    } catch (error) {
        console.error("Error Delete Telegram User:", error);
        res.status(500).send({ message: "Gagal menghapus user Telegram." });
    }
};
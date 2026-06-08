// controllers/user.controller.js
const db = require('../models');
const User = db.User;
const bcrypt = require('bcryptjs');
const { logActivity } = require('../helpers/logActivity');

const sanitizeUserForLog = (userObject) => {
    const sanitized = { ...userObject };
    delete sanitized.password;
    return sanitized;
};

exports.create = async (req, res) => {
    try {
        const newUser = await User.create({
            name: req.body.name,
            email: req.body.email,
            nik: req.body.nik, // Simpan NIK
            password: bcrypt.hashSync(req.body.password, 8),
            role: req.body.role,
        });

        await logActivity({
            userId: req.userId,
            action: 'CREATE',
            module: 'USER',
            moduleId: newUser.id,
            newData: sanitizeUserForLog(newUser.toJSON())
        });

        res.status(201).send({ message: "✅ User berhasil dibuat!" });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

exports.findAll = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: { exclude: ['password'] }
        });
        res.send(users);
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

exports.findOne = async (req, res) => {
    const id = req.params.id;
    try {
        const user = await User.findByPk(id, {
            attributes: { exclude: ['password'] }
        });
        if (user) res.send(user);
        else res.status(404).send({ message: `User dengan id=${id} tidak ditemukan.` });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

exports.update = async (req, res) => {
    const id = req.params.id;
    const updateData = req.body;

    try {
        const userToUpdate = await User.findByPk(id);
        if (!userToUpdate) {
            return res.status(404).send({ message: `User dengan id=${id} tidak ditemukan.` });
        }

        const oldData = sanitizeUserForLog(userToUpdate.toJSON());

        // Handle Password
        if (updateData.password && updateData.password.length > 0) {
            updateData.password = bcrypt.hashSync(updateData.password, 8);
        } else {
            delete updateData.password;
        }
        
        // NIK akan otomatis terupdate karena ada di req.body (updateData)

        await userToUpdate.update(updateData);

        await logActivity({
            userId: req.userId,
            action: 'UPDATE',
            module: 'USER',
            moduleId: id,
            oldData: oldData,
            newData: sanitizeUserForLog(userToUpdate.toJSON())
        });

        res.send({ message: "✅ User berhasil diupdate." });

    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

exports.destroy = async (req, res) => {
    const id = req.params.id;
    try {
        const userToDelete = await User.findByPk(id);
        if (!userToDelete) {
            return res.status(404).send({ message: `Gagal menghapus. User dengan id=${id} tidak ditemukan.` });
        }

        const oldData = sanitizeUserForLog(userToDelete.toJSON());

        await userToDelete.destroy();

        await logActivity({
            userId: req.userId,
            action: 'DELETE',
            module: 'USER',
            moduleId: id,
            oldData: oldData,
            newData: {}
        });

        res.send({ message: "✅ User berhasil dihapus." });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

exports.updateCurrentUser = async (req, res) => {
    const id = req.userId; 
    const { name, password } = req.body;

    if (!name) return res.status(400).send({ message: "Nama tidak boleh kosong." });

    try {
        const userToUpdate = await User.findByPk(id);
        if (!userToUpdate) return res.status(404).send({ message: "User tidak ditemukan." });

        const updateData = { name };
        if (password && password.length > 0) {
            updateData.password = bcrypt.hashSync(password, 8);
        }

        await userToUpdate.update(updateData);
        
        await logActivity({
            userId: id,
            action: 'UPDATE',
            module: 'Profile',
            moduleId: id,
            newData: { name: name }
        });

        res.send({ message: "Profil Anda berhasil diperbarui." });

    } catch (error) {
        res.status(500).send({ message: "Gagal memperbarui profil: " + error.message });
    }
};
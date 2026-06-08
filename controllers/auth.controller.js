// controllers/auth.controller.js
const db = require('../models');
const config = require('../config/auth.config');
const User = db.User;
const Op = db.Sequelize.Op; // PENTING: Operator Sequelize untuk logika "ATAU"

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

exports.register = async (req, res) => {
  try {
    // Terima data dari request body, termasuk NIK
    const { name, email, nik, password, role } = req.body;

    // Simpan User ke Database
    const user = await User.create({
      name: name,
      email: email,
      nik: nik, // Simpan NIK ke database
      password: bcrypt.hashSync(password, 8),
      role: role || 'viewer' // Default role adalah viewer jika tidak diisi
    });

    res.status(201).send({ message: "User was registered successfully!" });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    // Frontend mengirim data inputan di field 'email'
    // Input ini bisa berupa Email address ATAU Nomor NIK
    const identifier = req.body.email; 

    // Cari User di database
    // Logika: SELECT * FROM users WHERE email = identifier OR nik = identifier
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { email: identifier },
          { nik: identifier }
        ]
      }
    });

    if (!user) {
      return res.status(404).send({ message: "User Not found." });
    }

    // Validasi Password
    const passwordIsValid = bcrypt.compareSync(
      req.body.password,
      user.password
    );

    if (!passwordIsValid) {
      return res.status(401).send({
        accessToken: null,
        message: "Invalid Password!"
      });
    }

    // Generate Token JWT
    const token = jwt.sign({ id: user.id, role: user.role }, config.secret, {
      expiresIn: 86400 // Token berlaku 24 jam
    });

    // Kirim response data user + token
    res.status(200).send({
      id: user.id,
      name: user.name,
      email: user.email,
      nik: user.nik, // Sertakan NIK agar bisa disimpan di localStorage frontend jika perlu
      role: user.role,
      accessToken: token
    });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};
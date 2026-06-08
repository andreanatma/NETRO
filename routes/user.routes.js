// routes/user.routes.js
const userController = require("../controllers/user.controller.js");
const tgUserController = require("../controllers/telegram_user.controller.js"); 
const verifyToken = require('../middleware/verifyToken');
const { isAdmin } = require('../middleware/authorizeRole');
const express = require('express');
const router = express.Router();

// 1. Route untuk pengguna mengelola profilnya sendiri
router.put("/me", [verifyToken], userController.updateCurrentUser);

// =====================================================================
// Terapkan middleware khusus Admin untuk SEMUA route di bawah baris ini
// =====================================================================
router.use(verifyToken, isAdmin);

// 2. Endpoints CRUD untuk USER TELEGRAM (PINDAHKAN KE SINI - DI ATAS /:id)
router.get("/telegram-users", tgUserController.findAll);
router.put("/telegram-users/:id", tgUserController.update);
router.delete("/telegram-users/:id", tgUserController.destroy);

// 3. Endpoints CRUD untuk USER WEB
router.post("/", userController.create);
router.get("/", userController.findAll);
router.get("/:id", userController.findOne); // <--- Rute ini sekarang ada di bawah telegram-users
router.put("/:id", userController.update);
router.delete("/:id", userController.destroy);

module.exports = router;
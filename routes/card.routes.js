// routes/card.routes.js
const controller = require("../controllers/card.controller.js");
const verifyToken = require('../middleware/verifyToken');
const { isStaff } = require('../middleware/authorizeRole');
const express = require('express');
const router = express.Router();

// 1. Cek Token dulu untuk SEMUA request (Authentication)
router.use(verifyToken);

// 2. Route READ (Bisa diakses Viewer, Staff, Admin)
router.get("/", controller.findAll);
router.get("/:id", controller.findOne);

// 3. Route WRITE (Hanya bisa diakses Staff/Admin)
router.post("/", isStaff, controller.create);
router.put("/:id", isStaff, controller.update);
router.delete("/:id", isStaff, controller.destroy);

module.exports = router;
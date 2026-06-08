// routes/dashboard.routes.js
const controller = require("../controllers/dashboard.controller.js");
const verifyToken = require('../middleware/verifyToken');
const express = require('express');
const router = express.Router();

// Semua role yang sudah login bisa akses route ini
router.use(verifyToken);

// Endpoint untuk statistik
router.get("/count", controller.getCounts);
router.get("/count/detailed", controller.getDetailedCounts);

// Endpoint untuk export PDF dan Excel
router.get("/export", controller.exportPdf); // PDF Sederhana
router.get("/export/excel", controller.exportExcel); // <-- EXCEL BARU

module.exports = router;
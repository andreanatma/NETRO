// routes/export.routes.js
const express = require('express');
const router = express.Router();

// PERBAIKAN DI SINI:
// Menggunakan 'verifyToken' sesuai dengan struktur project Anda
const verifyToken = require("../middleware/verifyToken"); 
const controller = require("../controllers/export.controller");

// Middleware untuk header (Opsional, menjaga agar tidak ada masalah CORS)
router.use(function(req, res, next) {
  res.header(
    "Access-Control-Allow-Headers",
    "x-access-token, Origin, Content-Type, Accept"
  );
  next();
});

// Route untuk PDF
// URL: /api/export/pdf
router.get(
  "/pdf",
  [verifyToken], // Gunakan verifyToken langsung
  controller.exportPdf
);

// Route untuk Excel
// URL: /api/export/excel
router.get(
  "/excel",
  [verifyToken], // Gunakan verifyToken langsung
  controller.exportExcel
);

module.exports = router;
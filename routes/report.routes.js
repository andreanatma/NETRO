// routes/report.routes.js
const controller = require("../controllers/report.controller.js");
const verifyToken = require('../middleware/verifyToken');
const express = require('express');
const router = express.Router();

router.use(verifyToken); // Proteksi route
router.get("/logs", controller.getLogs);
router.get("/logs/excel", controller.exportLogsExcel);

module.exports = router;
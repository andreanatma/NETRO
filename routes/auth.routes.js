// routes/auth.routes.js
const controller = require("../controllers/auth.controller");
const express = require('express');
const router = express.Router();

router.post("/register", controller.register);
router.post("/login", controller.login);

module.exports = router;
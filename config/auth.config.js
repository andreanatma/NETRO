// config/auth.config.js
require('dotenv').config();

module.exports = {
  secret: process.env.JWT_SECRET
};
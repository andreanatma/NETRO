// models/telegram_user.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TelegramUser extends Model {
    static associate(models) {}
  }
  
  TelegramUser.init({
    user_id: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    username: DataTypes.STRING,
    full_name: DataTypes.STRING, // Mengikuti kolom di DB Anda
    role: {
      type: DataTypes.STRING, 
      defaultValue: 'viewer'
    },
    joined_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
    // Kolom 'status' dihapus karena tidak ada di DB
  }, {
    sequelize,
    modelName: 'TelegramUser',
    tableName: 'telegram_users',
    timestamps: false // PENTING: Mematikan pencarian kolom createdAt & updatedAt
  });
  
  return TelegramUser;
};
'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // define association here
    }
  }
  User.init({
    name: DataTypes.STRING,
    
    // --- TAMBAHAN STRUKTUR NIK ---
    nik: {
      type: DataTypes.STRING,
      unique: true // Pastikan NIK unik
    },
    // -----------------------------
    
    // email: DataTypes.STRING,
    // password: DataTypes.STRING,
    // role: DataTypes.ENUM('admin', 'staff', 'viewer')
    email: DataTypes.STRING,
    password: DataTypes.STRING,
    role: DataTypes.STRING // <-- PERBAIKAN: Ubah jadi STRING
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'users', 
  });
  return User;
};
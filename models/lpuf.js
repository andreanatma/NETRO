'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Lpuf extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Definisikan relasi: Satu LPUF memiliki banyak Card
      Lpuf.hasMany(models.Card, {
        foreignKey: 'kode_lpuf', // Kolom di tabel Card yang menjadi foreign key
        sourceKey: 'kode_lpuf',  // Kolom di tabel Lpuf yang menjadi acuan
        as: 'cards'              // Nama alias untuk relasi saat mengambil data
      });
    }
  }
  
  Lpuf.init({
    kode_lpuf: {
        type: DataTypes.STRING,
        unique: true
    },
    site: {
        type: DataTypes.STRING, // <-- PERBAIKAN: Ubah jadi STRING
        allowNull: false
    },
    lpuf: {
        type: DataTypes.STRING,
        allowNull: false
    },
    serial: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false
    },
    keterangan: DataTypes.TEXT
  }, {
    sequelize,
    modelName: 'Lpuf',
    tableName: 'lpuf'
  });
  
  return Lpuf; // <-- Pastikan baris ini ada
};
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Sfp extends Model {
    static associate(models) {
      Sfp.belongsTo(models.Tempat, {
        foreignKey: 'kode_tempat',
        targetKey: 'kode_tempat'
      });
    }
  }
  
  Sfp.init({
    kode_tempat: DataTypes.STRING,
    kapasitas: DataTypes.STRING,
    jarak: DataTypes.STRING,
    merk: DataTypes.STRING,
    serial_number: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    // UBAH DARI ENUM MENJADI STRING
    kondisi: DataTypes.STRING, 
    status: DataTypes.STRING,
    kode_sfp: {
      type: DataTypes.STRING,
      unique: true
    },
    keterangan: DataTypes.TEXT
  }, {
    sequelize,
    modelName: 'Sfp',
    tableName: 'sfp'
    // Catatan: Jika di tabel SQLite Anda tidak ada kolom createdAt dan updatedAt,
    // Anda harus menambahkan baris ini: timestamps: false
  });
  
  return Sfp;
};
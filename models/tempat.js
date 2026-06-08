'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Tempat extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Definisikan relasi: Satu Tempat memiliki banyak SFP
      Tempat.hasMany(models.Sfp, {
        foreignKey: 'kode_tempat',
        sourceKey: 'kode_tempat',
        as: 'sfp'
      });
    }
  }

  Tempat.init({
    site: {
      type: DataTypes.STRING, // <-- PERBAIKAN: Ubah jadi STRING
      allowNull: false
    },
    jenis: {
        type: DataTypes.STRING,
        allowNull: false
    },
    kapasitas: {
        type: DataTypes.STRING,
        allowNull: false
    },
    jarak: {
        type: DataTypes.STRING,
        allowNull: false
    },
    kode_tempat: {
        type: DataTypes.STRING,
        unique: true
    }
  }, {
    sequelize,
    modelName: 'Tempat',
    tableName: 'tempat',
  });

  return Tempat;
};
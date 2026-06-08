'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Card extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Definisikan relasi: Satu Card milik satu Lpuf
      Card.belongsTo(models.Lpuf, {
        foreignKey: 'kode_lpuf',
        targetKey: 'kode_lpuf'
      });
    }
  }
  
  Card.init({
    kode_card: {
      type: DataTypes.STRING,
      unique: true
    },
    kode_lpuf: {
      type: DataTypes.STRING,
      allowNull: true // Mengizinkan card untuk tidak terikat LPUF (standalone)
    },
    site: {
      type: DataTypes.STRING,
      allowNull: false // SITE selalu wajib diisi
    },
    card_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false
    },
    serial: {
      type: DataTypes.STRING,
      unique: true, // Serial number harus unik
      allowNull: false
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false
    },
    keterangan: DataTypes.TEXT
  }, {
    sequelize,
    modelName: 'Card',
    tableName: 'card'
  });
  
  return Card;
};
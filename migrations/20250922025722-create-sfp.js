'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sfp', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      kode_tempat: {
        type: Sequelize.STRING
      },
      kapasitas: {
        type: Sequelize.STRING
      },
      jarak: {
        type: Sequelize.STRING
      },
      merk: {
        type: Sequelize.STRING
      },
      serial_number: {
        type: Sequelize.STRING
      },
      kondisi: {
        type: Sequelize.ENUM('normal', 'rusak')
      },
      status: {
        type: Sequelize.ENUM('idle', 'used')
      },
      kode_sfp: {
        type: Sequelize.STRING
      },
      keterangan: {
        type: Sequelize.TEXT
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('sfp');
  }
};
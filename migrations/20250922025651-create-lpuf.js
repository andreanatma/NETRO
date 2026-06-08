'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('lpuf', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      kode_lpuf: {
        type: Sequelize.STRING
      },
      site: {
        type: Sequelize.STRING
      },
      lpuf: {
        type: Sequelize.STRING
      },
      serial: {
        type: Sequelize.STRING
      },
      status: {
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
    await queryInterface.dropTable('lpuf');
  }
};
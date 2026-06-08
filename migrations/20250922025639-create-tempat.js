'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tempat', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      site: {
        type: Sequelize.STRING
      },
      jenis: {
        type: Sequelize.STRING
      },
      kapasitas: {
        type: Sequelize.STRING
      },
      jarak: {
        type: Sequelize.STRING
      },
      kode_tempat: {
        type: Sequelize.STRING
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
    await queryInterface.dropTable('tempat');
  }
};
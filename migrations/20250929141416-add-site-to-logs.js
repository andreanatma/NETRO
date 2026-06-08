'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Logs', 'site', { // Nama tabel default adalah 'Logs'
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Logs', 'site');
  }
};
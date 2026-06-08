'use strict';
const bcrypt = require('bcryptjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const hashedPasswordAdmin = await bcrypt.hash('admin', 10);
    const hashedPasswordStaff = await bcrypt.hash('staff', 10);
    const hashedPasswordViewer = await bcrypt.hash('viewer', 10);

    await queryInterface.bulkInsert('Users', [
      {
        name: 'Admin User',
        email: 'admin@example.com',
        password: hashedPasswordAdmin,
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Staff User',
        email: 'staff@example.com',
        password: hashedPasswordStaff,
        role: 'staff',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Viewer User',
        email: 'viewer@example.com',
        password: hashedPasswordViewer,
        role: 'viewer',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Users', null, {});
  }
};
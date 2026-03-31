'use strict';
 
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('rescue_teams', 'memberIds', {
      type: Sequelize.TEXT,
      allowNull: true,
      defaultValue: '[]',
      comment: 'JSON array of user IDs who are members of this team',
    });
 
    await queryInterface.addColumn('rescue_teams', 'area', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: '',
      comment: 'Operational area or zone for this team',
    });
  },
 
  down: async (queryInterface) => {
    await queryInterface.removeColumn('rescue_teams', 'memberIds');
    await queryInterface.removeColumn('rescue_teams', 'area');
  },
};
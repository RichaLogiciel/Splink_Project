module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("program_details", "overview", {
      type: Sequelize.TEXT,
      allowNull: true
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("program_details", "overview");
  }
};

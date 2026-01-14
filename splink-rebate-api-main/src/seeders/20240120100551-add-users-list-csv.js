"use strict";

require("ts-node/register");
const { readCsvFile, getHashedPassword } = require("../utils/helpers.ts");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const hashedPassword = await getHashedPassword("Password@123");
    const superAdminPassword = await getHashedPassword("Sup3r@dM!n#1");

    const superAdminUser = {
      first_name: "SUPER",
      last_name: "ADMIN",
      email: "superadmin@example.com",
      password_hash: superAdminPassword,
      status: "ACTIVE",
      created_at: new Date(),
      updated_at: new Date()
    };

    const superAdminRole = {
      user_id: 1,
      role: "SUPER_ADMIN",
      associated_user_id: 1,
      associated_entity_type: "SUPER_ADMIN",
      created_at: new Date(),
      updated_at: new Date()
    };

    // Path to the manufacturers CSV file
    const csvFilePath = "src/seeders/csv/users.csv";

    // Read data from the CSV file
    const manufacturersData = await readCsvFile(csvFilePath);

    // Generate `users` array
    const users = manufacturersData.map((item) => {
      const email = `${item.Manufacturer.replace(/[\s']/g, "").toLowerCase()}@example.com`;
      const [firstName, ...lastNameParts] = item.Manufacturer.split(" ");
      return {
        email,
        password_hash: hashedPassword,
        first_name: firstName || "",
        last_name: lastNameParts.join(" ") || "",
        status: "ACTIVE",
        created_at: new Date(),
        updated_at: new Date()
      };
    });

    // Generate `userRoles` array
    const userRoles = manufacturersData.map((_, index) => ({
      user_id: index + 2,
      role: "MANUFACTURER",
      associated_user_id: index + 1,
      associated_entity_type: "MANUFACTURER",
      created_at: new Date(),
      updated_at: new Date()
    }));

    // Generate `manufacturers` array
    const manufacturers = manufacturersData.map((item) => ({
      name: item.Manufacturer,
      logo: item.Logo,
      created_at: new Date(),
      updated_at: new Date()
    }));

    const combineUsers = [superAdminUser, ...users];
    const combineRoles = [superAdminRole, ...userRoles];

    // Insert data into the respective tables
    await queryInterface.bulkInsert("users", combineUsers);
    await queryInterface.bulkInsert("user_roles", combineRoles);
    await queryInterface.bulkInsert("manufacturers", manufacturers);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("manufacturers", null, {});
    await queryInterface.bulkDelete("user_roles", null, {});
    await queryInterface.bulkDelete("users", null, {});
  }
};

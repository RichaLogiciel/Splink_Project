"use strict";

const manufacturerDistributorsData = [
  {
    manufacturer_id: 1,
    distributors: [1, 10, 11]
  },
  {
    manufacturer_id: 2,
    distributors: [1, 10, 11]
  },
  {
    manufacturer_id: 3,
    distributors: [1, 10, 11]
  },
  {
    manufacturer_id: 4,
    distributors: [1, 10, 11]
  },
  {
    manufacturer_id: 5,
    distributors: [1, 10, 11]
  },
  {
    manufacturer_id: 6,
    distributors: [1, 10, 11]
  },
  {
    manufacturer_id: 7,
    distributors: [1, 10, 11]
  },
  {
    manufacturer_id: 8,
    distributors: [1, 10, 11]
  },
  {
    manufacturer_id: 9,
    distributors: [1, 10, 11]
  },
  {
    manufacturer_id: 11,
    distributors: [1, 10, 11]
  },
  {
    manufacturer_id: 12,
    distributors: [1]
  },
  {
    manufacturer_id: 13,
    distributors: [1]
  },
  {
    manufacturer_id: 14,
    distributors: [1]
  },
  {
    manufacturer_id: 15,
    distributors: [1]
  },
  {
    manufacturer_id: 16,
    distributors: [1]
  }
];

module.exports = {
  up: async (queryInterface) => {
    const seedData = [];
    for (const dataItem of manufacturerDistributorsData) {
      dataItem.distributors.forEach((distributorId) => {
        seedData.push({
          manufacturer_id: dataItem.manufacturer_id,
          distributor_id: distributorId,
          created_at: new Date(),
          updated_at: new Date()
        });
      });
    }

    return queryInterface.bulkInsert(
      "authorized_distributor_manufacturers",
      seedData
    );
  },

  down: async (queryInterface) => {
    return queryInterface.bulkDelete(
      "authorized_distributor_manufacturers",
      null,
      {}
    );
  }
};

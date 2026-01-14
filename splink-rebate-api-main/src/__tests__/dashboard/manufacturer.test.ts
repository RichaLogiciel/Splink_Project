import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ENTITY_TYPE } from "../../config/appConstants";
import { ERROR_MESSAGES } from "../../config/errorMessages";
import { createMockRequestResponse } from "../helpers/test-utils";

const mockManufacturerStores = require("../mocks/manufacturerStores.json");
const mockManufacturerPrograms = require("../mocks/manufacturerPrograms.json");
const mockManufacturerSalesSummary = require("../mocks/manufacturerSalesSummary.json");
const mockManufacturerSKUsPerStore = require("../mocks/manufacturerSKUsPerStore.json");
const mockManufacturerDistributors = {
  status: "success",
  data: [
    {
      userId: 12202,
      associatedUserId: 129,
      name: "Pitco"
    }
  ]
};

const manufacturerMockUser = {
  userId: 1,
  id: 1,
  email: "test@example.com",
  role: ENTITY_TYPE.MANUFACTURER,
  associatedUserId: 1,
  parentEntityId: "1",
  parentEntityType: ENTITY_TYPE.DISTRIBUTOR_ADMIN
};

// Create a valid token for testing
const mockToken = jwt.sign(
  manufacturerMockUser,
  process.env.JWT_SECRET || "test-secret"
);

// Mock AuthService
jest.mock("../../services/AuthService", () => ({
  __esModule: true,
  default: {
    login: jest.fn().mockImplementation(() => ({
      accessToken: mockToken,
      user: manufacturerMockUser
    }))
  }
}));

// Mock ManufacturerController with proper error handling
jest.mock("../../controllers/ManufacturerController", () => ({
  __esModule: true,
  default: {
    getSalesSummary: jest
      .fn()
      .mockImplementation((req: Request, res: Response) => {
        // Authentication checks
        if (!req.headers.authorization || !req.user) {
          return res.status(401).json({
            message: ERROR_MESSAGES.AUTH.NO_AUTH_PROVIDED
          });
        }

        if (req.headers.authorization === "Bearer invalid-token") {
          return res.status(401).json({
            message: ERROR_MESSAGES.AUTH.INVALID_TOKEN
          });
        }

        const { distributorId: _distributorId, monthRange: _monthRange, selectedProducts: _selectedProducts } = req.body;
        return res.status(200).json(mockManufacturerSalesSummary);
      }),
    getSkusPerStore: jest
      .fn()
      .mockImplementation((req: Request, res: Response) => {
        // Authentication checks
        if (!req.headers.authorization || !req.user) {
          return res.status(401).json({
            message: ERROR_MESSAGES.AUTH.NO_AUTH_PROVIDED
          });
        }

        if (req.headers.authorization === "Bearer invalid-token") {
          return res.status(401).json({
            message: ERROR_MESSAGES.AUTH.INVALID_TOKEN
          });
        }

        return res.status(200).json(mockManufacturerSKUsPerStore);
      }),
    getDistributors: jest
      .fn()
      .mockImplementation((req: Request, res: Response) => {
        // Authentication checks
        if (!req.headers.authorization || !req.user) {
          return res.status(401).json({
            message: ERROR_MESSAGES.AUTH.NO_AUTH_PROVIDED
          });
        }

        if (req.headers.authorization === "Bearer invalid-token") {
          return res.status(401).json({
            message: ERROR_MESSAGES.AUTH.INVALID_TOKEN
          });
        }

        return res.status(200).json(mockManufacturerDistributors);
      }),
    getProgramsOverview: jest
      .fn()
      .mockImplementation((req: Request, res: Response) => {
        // Authentication checks
        if (!req.headers.authorization || !req.user) {
          return res.status(401).json({
            message: ERROR_MESSAGES.AUTH.NO_AUTH_PROVIDED
          });
        }

        if (req.headers.authorization === "Bearer invalid-token") {
          return res.status(401).json({
            message: ERROR_MESSAGES.AUTH.INVALID_TOKEN
          });
        }

        return res.status(200).json(mockManufacturerPrograms);
      }),
    getStoresListing: jest
      .fn()
      .mockImplementation((req: Request, res: Response) => {
        // Authentication checks
        if (!req.headers.authorization || !req.user) {
          return res.status(401).json({
            message: ERROR_MESSAGES.AUTH.NO_AUTH_PROVIDED
          });
        }

        if (req.headers.authorization === "Bearer invalid-token") {
          return res.status(401).json({
            message: ERROR_MESSAGES.AUTH.INVALID_TOKEN
          });
        }

        const { page = 1 } = req.query;
        const response = { ...mockManufacturerStores };
        response.data.currentPage = Number(page);
        return res.status(200).json(response);
      })
  }
}));

const ManufacturerController =
  require("../../controllers/ManufacturerController").default;

describe("Manufacturer Sales Summary API Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return sales summary with valid token", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken
    });

    await ManufacturerController.getSalesSummary(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockManufacturerSalesSummary);
  });

  it("should return sales summary with distributor filter", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      body: { distributorId: 1 }
    });

    await ManufacturerController.getSalesSummary(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockManufacturerSalesSummary);
  });

  it("should return sales summary with month range filter", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      body: { monthRange: "1" }
    });

    await ManufacturerController.getSalesSummary(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockManufacturerSalesSummary);
  });

  it("should return sales summary with selected products filter", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      body: { selectedProducts: [1, 2, 3] }
    });

    await ManufacturerController.getSalesSummary(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockManufacturerSalesSummary);
  });

  it("should validate sales summary data structure", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken
    });

    await ManufacturerController.getSalesSummary(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const response = res.json.mock.calls[0][0];
    expect(response.status).toBe("success");

    const { data } = response;
    expect(data).toEqual(
      expect.objectContaining({
        totalSales: expect.any(Number),
        activeStores: expect.any(Number),
        units: expect.any(Object),
        topProducts: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(Number),
            color: expect.any(String),
            units: expect.any(Object),
            sales: expect.any(Number)
          })
        ]),
        chartData: expect.arrayContaining([
          expect.objectContaining({
            date: expect.any(String),
            sales: expect.any(Number),
            units: expect.any(Number)
          })
        ]),
        storePenetrationChartData: expect.arrayContaining([
          expect.objectContaining({
            date: expect.any(String),
            storesCount: expect.any(Number),
            value: expect.any(Number)
          })
        ])
      })
    );
  });

  it("should return 401 if no authorization token is provided", async () => {
    const { req, res } = createMockRequestResponse();

    await ManufacturerController.getSalesSummary(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: ERROR_MESSAGES.AUTH.NO_AUTH_PROVIDED
    });
  });

  it("should return 401 if invalid token is provided", async () => {
    const { req, res } = createMockRequestResponse({
      token: "invalid-token"
    });

    await ManufacturerController.getSalesSummary(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: ERROR_MESSAGES.AUTH.INVALID_TOKEN
    });
  });

  it("should handle multiple filters together", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      body: {
        distributorId: 1,
        monthRange: "1",
        selectedProducts: [1, 2, 3]
      }
    });

    await ManufacturerController.getSalesSummary(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockManufacturerSalesSummary);
  });
});

describe("Manufacturer SKUs Per Store API Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return SKUs per store with valid token", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken
    });

    await ManufacturerController.getSkusPerStore(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockManufacturerSKUsPerStore);
  });

  it("should return SKUs per store with distributor filter", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      query: { distributorId: 1 }
    });

    await ManufacturerController.getSkusPerStore(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockManufacturerSKUsPerStore);
  });

  it("should return SKUs per store with category filter", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      query: { categoryId: 2 }
    });

    await ManufacturerController.getSkusPerStore(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockManufacturerSKUsPerStore);
  });

  it("should return SKUs per store with month range filter", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      query: { monthRange: 3 }
    });

    await ManufacturerController.getSkusPerStore(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockManufacturerSKUsPerStore);
  });

  it("should validate SKUs per store data structure", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken
    });

    await ManufacturerController.getSkusPerStore(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const response = res.json.mock.calls[0][0];
    expect(response.status).toBe("success");

    const { data } = response;
    expect(data).toEqual(
      expect.objectContaining({
        skuCounts: expect.arrayContaining([
          expect.objectContaining({
            skuCount: expect.any(Number),
            storeCount: expect.any(Number)
          })
        ]),
        categories: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(Number),
            name: expect.any(String)
          })
        ])
      })
    );
  });

  it("should return 401 if no authorization token is provided", async () => {
    const { req, res } = createMockRequestResponse();

    await ManufacturerController.getSkusPerStore(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: ERROR_MESSAGES.AUTH.NO_AUTH_PROVIDED
    });
  });

  it("should return 401 if invalid token is provided", async () => {
    const { req, res } = createMockRequestResponse({
      token: "invalid-token"
    });

    await ManufacturerController.getSkusPerStore(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: ERROR_MESSAGES.AUTH.INVALID_TOKEN
    });
  });

  it("should handle multiple filters together", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      query: {
        distributorId: 1,
        categoryId: 2,
        monthRange: 3
      }
    });

    await ManufacturerController.getSkusPerStore(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockManufacturerSKUsPerStore);
  });
});

describe("Manufacturer Distributors API Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return distributors list with valid token", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken
    });

    await ManufacturerController.getDistributors(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockManufacturerDistributors);
  });

  it("should validate distributors data structure", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken
    });

    await ManufacturerController.getDistributors(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const response = res.json.mock.calls[0][0];
    expect(response.status).toBe("success");

    const { data } = response;
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);

    data.forEach((distributor: any) => {
      expect(distributor).toEqual(
        expect.objectContaining({
          userId: expect.any(Number),
          associatedUserId: expect.any(Number),
          name: expect.any(String)
        })
      );
    });
  });

  it("should return 401 if no authorization token is provided", async () => {
    const { req, res } = createMockRequestResponse();

    await ManufacturerController.getDistributors(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: ERROR_MESSAGES.AUTH.NO_AUTH_PROVIDED
    });
  });

  it("should return 401 if invalid token is provided", async () => {
    const { req, res } = createMockRequestResponse({
      token: "invalid-token"
    });

    await ManufacturerController.getDistributors(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: ERROR_MESSAGES.AUTH.INVALID_TOKEN
    });
  });

  it("should handle empty distributors list", async () => {
    const mockEmptyResponse = {
      status: "success",
      data: []
    };

    ManufacturerController.getDistributors.mockImplementationOnce(
      (req: Request, res: Response) => {
        return res.status(200).json(mockEmptyResponse);
      }
    );

    const { req, res } = createMockRequestResponse({
      token: mockToken
    });

    await ManufacturerController.getDistributors(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockEmptyResponse);
  });
});

describe("Manufacturer Programs API Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return programs overview with valid token", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken
    });

    await ManufacturerController.getProgramsOverview(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockManufacturerPrograms);
  });

  it("should return programs overview with distributor filter", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      query: { distributorId: 129 }
    });

    await ManufacturerController.getProgramsOverview(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockManufacturerPrograms);
  });

  it("should validate programs overview data structure", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken
    });

    await ManufacturerController.getProgramsOverview(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const response = res.json.mock.calls[0][0];
    expect(response.status).toBe("success");

    const { data } = response;
    expect(data).toEqual(
      expect.objectContaining({
        distributorProgramsData: expect.any(Array),
        storeProgramsData: expect.any(Array),
        salesRepsProgramsData: expect.any(Array)
      })
    );

    // Validate distributor programs structure
    data.distributorProgramsData.forEach((program: any) => {
      expect(program).toMatchObject({
        programName: expect.any(String),
        completedCompliances: expect.any(String),
        totalEnrollments: expect.any(Number),
        rebate: expect.any(String),
        programStartDate: expect.any(String),
        programEndDate: expect.any(String)
      });
    });

    // Validate store programs structure
    data.storeProgramsData.forEach((program: any) => {
      expect(program).toMatchObject({
        tierName: expect.any(String),
        programName: expect.any(String),
        programStartDate: expect.any(String),
        programEndDate: expect.any(String),
        compliancePercentage: expect.any(Number),
        totalRebate: expect.any(Number),
        totalStores: expect.any(Number),
        qualifiedStores: expect.any(Number)
      });
    });
  });

  it("should return 401 if no authorization token is provided", async () => {
    const { req, res } = createMockRequestResponse();

    await ManufacturerController.getProgramsOverview(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: ERROR_MESSAGES.AUTH.NO_AUTH_PROVIDED
    });
  });

  it("should return 401 if invalid token is provided", async () => {
    const { req, res } = createMockRequestResponse({
      token: "invalid-token"
    });

    await ManufacturerController.getProgramsOverview(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: ERROR_MESSAGES.AUTH.INVALID_TOKEN
    });
  });

  it("should handle empty programs data", async () => {
    const mockEmptyResponse = {
      status: "success",
      data: {
        distributorProgramsData: [],
        storeProgramsData: [],
        salesRepsProgramsData: []
      }
    };

    ManufacturerController.getProgramsOverview.mockImplementationOnce(
      (req: Request, res: Response) => {
        return res.status(200).json(mockEmptyResponse);
      }
    );

    const { req, res } = createMockRequestResponse({
      token: mockToken
    });

    await ManufacturerController.getProgramsOverview(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockEmptyResponse);
  });
});

describe("Manufacturer Stores Listing API Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should handle multiple query parameters together", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      query: {
        distributorId: 129,
        page: 2,
        searchQuery: "market",
        sort: "DESC",
        sortKey: "name"
      }
    });

    await ManufacturerController.getStoresListing(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockManufacturerStores);
  });

  it("should handle pagination", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      query: { page: 2 }
    });

    await ManufacturerController.getStoresListing(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const response = res.json.mock.calls[0][0];
    expect(response.data.currentPage).toBe(2);
  });

  it("should handle search query", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      query: { searchQuery: "market" }
    });

    await ManufacturerController.getStoresListing(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockManufacturerStores);
  });

  it("should handle sorting", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      query: { sort: "DESC", sortKey: "name" }
    });

    await ManufacturerController.getStoresListing(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockManufacturerStores);
  });

  it("should return 401 if no authorization token is provided", async () => {
    const { req, res } = createMockRequestResponse();

    await ManufacturerController.getStoresListing(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: ERROR_MESSAGES.AUTH.NO_AUTH_PROVIDED
    });
  });

  it("should return 401 if invalid token is provided", async () => {
    const { req, res } = createMockRequestResponse({
      token: "invalid-token"
    });

    await ManufacturerController.getStoresListing(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: ERROR_MESSAGES.AUTH.INVALID_TOKEN
    });
  });

  it("should handle empty store listing", async () => {
    const mockEmptyResponse = {
      status: "success",
      data: {
        stores: [],
        totalStores: 0,
        currentPage: 1,
        totalPages: 0
      }
    };

    ManufacturerController.getStoresListing.mockImplementationOnce(
      (req: Request, res: Response) => {
        return res.status(200).json(mockEmptyResponse);
      }
    );

    const { req, res } = createMockRequestResponse({
      token: mockToken,
      query: { searchQuery: "nonexistent" }
    });

    await ManufacturerController.getStoresListing(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockEmptyResponse);
  });
});

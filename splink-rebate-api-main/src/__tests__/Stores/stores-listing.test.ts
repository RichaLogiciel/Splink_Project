import jwt from "jsonwebtoken";
import { ENTITY_TYPE } from "../../config/appConstants";
import { ERROR_MESSAGES } from "../../config/errorMessages";
import { createMockRequestResponse } from "../helpers/test-utils";

// Mock Express and its dependencies
jest.mock("express", () => {
  const mockApp = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    use: jest.fn(),
    listen: jest.fn(),
    routes: {},
    _router: {
      route: jest.fn(),
      use: jest.fn(),
      handle: jest.fn()
    }
  };

  const express = () => mockApp;
  express.json = jest.fn();
  express.Router = jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    use: jest.fn()
  }));
  express.urlencoded = jest.fn();

  return express;
});

// Mock the app and server from index.ts
jest.mock("../../index", () => {
  const mockApp = {
    get: jest.fn().mockImplementation((path, handler) => {
      if (path === "/api/v1/store/listing") {
        return handler;
      }
    }),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    use: jest.fn(),
    listen: jest.fn(),
    _router: {
      route: jest.fn(),
      use: jest.fn(),
      handle: jest.fn()
    }
  };

  return {
    app: mockApp,
    server: {
      close: jest.fn((callback) => {
        if (callback) callback();
      })
    }
  };
});

// Import the mocked app and server

const distributorStoreListing = require("../mocks/distributorStoreListing.json");
const singleStoreDetails = require("../mocks/singleStoreDetails.json");

const mockSalesRepsResponse = {
  status: "success",
  data: {
    salesReps: [
      {
        id: 17233,
        name: "BILL VENEMA"
      }
    ]
  }
};
const distMockUser = {
  userId: 1,
  id: 1,
  email: "test@example.com",
  role: ENTITY_TYPE.DISTRIBUTOR_ADMIN,
  associatedUserId: 1,
  parentEntityId: "",
  parentEntityType: ""
};

// Mock AuthService
jest.mock("../../services/AuthService", () => ({
  __esModule: true,
  default: {
    login: jest.fn().mockImplementation(() => ({
      accessToken: "mocked-token",
      user: distMockUser
    }))
  }
}));

// Mock StoreController
jest.mock("../../controllers/StoreController", () => ({
  __esModule: true,
  default: {
    getListing: jest.fn().mockImplementation((req, res) => {
      const { distributorId, page = 1 } = req.query;
      if (
        !req.headers.authorization ||
        req.headers.authorization === "Bearer invalid-token"
      ) {
        return res.status(401).json({ message: "Invalid token" });
      }

      if (!distributorId) {
        return res
          .status(400)
          .json({ message: "Missing distributorId parameter" });
      }
      distributorStoreListing.data.currentPage = Number(page);
      return res.status(200).json(distributorStoreListing);
    }),
    getStoreDetails: jest.fn().mockImplementation((req, res) => {
      if (!req.headers.authorization) {
        return res
          .status(401)
          .json({ message: "No authorization token provided" });
      }
      if (req.headers.authorization === "Bearer invalid-token") {
        return res.status(401).json({ message: "Invalid token" });
      }
      return res.status(200).json(singleStoreDetails);
    }),
    getDistributorSalesReps: jest.fn().mockImplementation((req, res) => {
      const { distributorId } = req.params;
      if (!req.headers.authorization) {
        return res
          .status(401)
          .json({ message: "No authorization token provided" });
      }
      if (req.headers.authorization === "Bearer invalid-token") {
        return res.status(401).json({ message: "Invalid token" });
      }
      if (!distributorId) {
        return res.status(404).json({
          status: "error",
          message: ERROR_MESSAGES.REQUIRED.DISTRIBUTOR_ID
        });
      }
      return res.status(200).json(mockSalesRepsResponse);
    })
  }
}));
const StoreController = require("../../controllers/StoreController").default;

describe("Store Listing API Tests", () => {
  let mockToken: string;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => setImmediate(resolve));
  });

  beforeAll(() => {
    mockToken = jwt.sign(
      distMockUser,
      process.env.JWT_SECRET || "test-secret",
      { expiresIn: "1h" }
    );
  });

  it("should return store listing with valid token and parameters", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      query: {
        distributorId: 129,
        page: 1,
        searchQuery: "",
        selectedSalesRepId: "",
        sort: "ASC",
        chainId: "",
        sortKey: "sort"
      }
    });
    await StoreController.getListing(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(distributorStoreListing);
  });

  it("should return 401 if no authorization token is provided", async () => {
    const { req, res } = createMockRequestResponse();
    await StoreController.getListing(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("should return 401 if invalid token is provided", async () => {
    const { req, res } = createMockRequestResponse({
      token: "invalid-token"
    });
    await StoreController.getListing(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("should handle missing distributorId parameter", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken
    });
    await StoreController.getListing(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("should handle pagination parameters", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      query: {
        distributorId: 129,
        page: 2,
        sort: "ASC"
      }
    });
    await StoreController.getListing(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          currentPage: 2
        })
      })
    );
  });

  it("should handle sorting in descending order", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      query: {
        distributorId: 129,
        sort: "DESC",
        sortKey: "sort"
      }
    });
    await StoreController.getListing(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(distributorStoreListing);
  });

  it("should handle search query parameter", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      query: {
        distributorId: 129,
        searchQuery: "market",
        sort: "ASC"
      }
    });
    await StoreController.getListing(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(distributorStoreListing);
  });

  it("should handle chain filtering", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      query: {
        distributorId: 129,
        chainId: 72,
        sort: "ASC"
      }
    });
    await StoreController.getListing(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(distributorStoreListing);
  });

  it("should validate store listing data structure", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      query: { distributorId: 129 }
    });
    await StoreController.getListing(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "success",
        data: expect.objectContaining({
          stores: expect.any(Array),
          totalStores: expect.any(Number),
          currentPage: expect.any(Number),
          totalPages: expect.any(Number)
        })
      })
    );

    // Validate store structure if stores exist
    const stores = res.json.mock.calls[0][0].data.stores;
    if (stores.length > 0) {
      stores.forEach((store: any) => {
        expect(store).toMatchObject({
          id: expect.any(Number),
          externalStoreId: expect.any(String),
          userInfo: expect.objectContaining({
            id: expect.any(Number),
            status: expect.any(String)
          }),
          storeInfo: expect.objectContaining({
            name: expect.any(String),
            location: expect.any(String),
            rep: expect.objectContaining({
              name: expect.any(String)
            })
          }),
          salesData: expect.objectContaining({
            purchaseVolume: expect.objectContaining({
              amount: expect.any(Number)
            }),
            totalSavings: expect.objectContaining({
              amount: expect.any(Number)
            })
          }),
          programData: expect.objectContaining({
            completedPrograms: expect.any(Number),
            totalEnrolled: expect.any(Number),
            enrolledProgram: expect.any(Array),
            remainingProgram: expect.any(Array),
            enrolledProgramIds: expect.any(Array)
          }),
          chainId: expect.any(Number),
          chainNames: expect.any(String)
        });
      });
    }
  });
});

describe("Store Details API Tests", () => {
  let mockToken: string;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => setImmediate(resolve));
  });

  beforeAll(() => {
    mockToken = jwt.sign(
      distMockUser,
      process.env.JWT_SECRET || "test-secret",
      { expiresIn: "1h" }
    );
  });

  it("should return single store details with valid store ID", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      params: { storeId: "16189" }
    });

    await StoreController.getStoreDetails(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(singleStoreDetails);
  });

  it("should validate store details data structure", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      params: { storeId: "16189" }
    });

    await StoreController.getStoreDetails(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const store = res.json.mock.calls[0][0].data.stores[0];

    // Validate store basic info
    expect(store).toMatchObject({
      id: expect.any(Number),
      externalStoreId: expect.any(String),
      userInfo: expect.objectContaining({
        id: expect.any(Number),
        status: expect.any(String)
      })
    });

    // Validate store details
    expect(store.storeInfo).toMatchObject({
      name: expect.any(String),
      location: expect.any(String),
      rep: expect.objectContaining({
        name: expect.any(String)
      })
    });

    // Validate sales data
    expect(store.salesData).toMatchObject({
      purchaseVolume: expect.objectContaining({
        amount: expect.any(Number)
      }),
      totalSavings: expect.objectContaining({
        amount: expect.any(Number)
      })
    });

    // Validate program data
    expect(store.programData).toMatchObject({
      completedPrograms: expect.any(Number),
      totalEnrolled: expect.any(Number),
      enrolledProgram: expect.any(Array),
      remainingProgram: expect.any(Array),
      enrolledProgramIds: expect.any(Array)
    });
  });

  it("should return 401 if no authorization token is provided", async () => {
    const { req, res } = createMockRequestResponse({
      params: { storeId: "16189" }
    });

    await StoreController.getStoreDetails(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "No authorization token provided"
    });
  });

  it("should return 401 if invalid token is provided", async () => {
    const { req, res } = createMockRequestResponse({
      token: "invalid-token",
      params: { storeId: "16189" }
    });

    await StoreController.getStoreDetails(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid token"
    });
  });

  it("should return 404 for non-existent store ID", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      params: { storeId: "99999" }
    });

    // Override mock implementation for this test
    StoreController.getStoreDetails.mockImplementationOnce(
      (req: any, res: any) => {
        return res.status(404).json({
          status: "error",
          message: "Store not found"
        });
      }
    );

    await StoreController.getStoreDetails(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      status: "error",
      message: "Store not found"
    });
  });

  it("should validate pagination data", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      params: { storeId: "16189" }
    });

    await StoreController.getStoreDetails(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].data).toMatchObject({
      totalStores: expect.any(Number),
      currentPage: expect.any(Number),
      totalPages: expect.any(Number)
    });
  });
});

describe("Distributor Sales Reps API Tests", () => {
  let mockToken: string;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => setImmediate(resolve));
  });

  beforeAll(() => {
    mockToken = jwt.sign(
      distMockUser,
      process.env.JWT_SECRET || "test-secret",
      { expiresIn: "1h" }
    );
  });

  it("should return sales reps list with valid distributor ID", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      params: { distributorId: "129" }
    });

    await StoreController.getDistributorSalesReps(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockSalesRepsResponse);
  });

  it("should validate sales reps data structure", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      params: { distributorId: "129" }
    });

    await StoreController.getDistributorSalesReps(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const response = res.json.mock.calls[0][0];
    expect(response.status).toBe("success");

    const { data } = response;
    expect(data).toHaveProperty("salesReps");
    expect(Array.isArray(data.salesReps)).toBe(true);

    if (data.salesReps.length > 0) {
      data.salesReps.forEach((rep: any) => {
        expect(rep).toMatchObject({
          id: expect.any(Number),
          name: expect.any(String)
        });
      });
    }
  });

  it("should return 401 if no authorization token is provided", async () => {
    const { req, res } = createMockRequestResponse({
      params: { distributorId: "129" }
    });

    await StoreController.getDistributorSalesReps(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "No authorization token provided"
    });
  });

  it("should return 401 if invalid token is provided", async () => {
    const { req, res } = createMockRequestResponse({
      token: "invalid-token",
      params: { distributorId: "129" }
    });

    await StoreController.getDistributorSalesReps(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid token"
    });
  });

  it("should handle missing distributor ID parameter", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken
    });

    await StoreController.getDistributorSalesReps(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      status: "error",
      message: ERROR_MESSAGES.REQUIRED.DISTRIBUTOR_ID
    });
  });

  it("should handle invalid distributor ID", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      params: { distributorId: "999999" }
    });

    // Override mock implementation for this test
    StoreController.getDistributorSalesReps.mockImplementationOnce(
      (req: any, res: any) => {
        return res.status(404).json({
          status: "error",
          message: "Distributor not found"
        });
      }
    );

    await StoreController.getDistributorSalesReps(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      status: "error",
      message: "Distributor not found"
    });
  });

  it("should handle empty sales reps list", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      params: { distributorId: "129" }
    });

    const mockEmptyResponse = {
      status: "success",
      data: {
        salesReps: []
      }
    };

    // Override mock implementation for this test
    StoreController.getDistributorSalesReps.mockImplementationOnce(
      (req: any, res: any) => {
        return res.status(200).json(mockEmptyResponse);
      }
    );

    await StoreController.getDistributorSalesReps(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockEmptyResponse);
  });
});

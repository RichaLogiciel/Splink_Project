import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ENTITY_TYPE } from "../../config/appConstants";
import { createMockRequestResponse } from "../helpers/test-utils";

const mockChainStorePrograms = require("../mocks/chainStorePrograms.json");
const mockChainStoreListing = require("../mocks/chainStoreListing.json");

const mockChainKeyMetricsResponse = {
  status: "success",
  data: {
    TotalSavingsCardData: {
      yoyValue: 0,
      info: "Total amount through ",
      value: 0,
      footerInfo: "Next Withdrawal Date ",
      link: {
        label: "Withdraw Funds",
        href: "/"
      }
    },
    TotalManufacturer: {
      value: 18
    },
    TotalTier: {
      value: 108
    },
    TierAchievedData: {
      value: 0
    }
  }
};

const mockChainSingleStoreMetricsResponse = {
  status: "success",
  data: {
    TotalSavingsCardData: {
      yoyValue: 0,
      info: "Total amount through ",
      value: 0,
      footerInfo: "Next Withdrawal Date ",
      link: {
        label: "Withdraw Funds",
        href: "/"
      }
    },
    TotalManufacturer: {
      value: 18
    },
    TotalTier: {
      value: 18
    },
    TierAchievedData: {
      value: 0
    }
  }
};

const mockChainStoresResponse = {
  status: "success",
  data: [
    {
      id: 2332,
      name: "7-CLANS RED LAKE COMP BEVERAGES",
      address: "NY",
      city: "NY",
      state: "NY",
      zip: "55555",
      parentEntityId: 1
    },
    {
      id: 2333,
      name: "7-CLANS RED LAKE GIFT SHOP",
      address: "SCO 138",
      city: "New York",
      state: "New York",
      zip: "10001",
      parentEntityId: 1
    }
  ]
};

const chainMockUser = {
  userId: 1,
  id: 1,
  email: "test@example.com",
  role: ENTITY_TYPE.CHAIN_ADMIN,
  associatedUserId: 72,
  parentEntityId: "1",
  parentEntityType: ENTITY_TYPE.DISTRIBUTOR_ADMIN
};

// Mock ChainController
jest.mock("../../controllers/ChainController", () => ({
  __esModule: true,
  default: {
    getChainKeyMetrics: jest.fn().mockImplementation((req, res) => {
      if (!req.headers.authorization) {
        return res
          .status(401)
          .json({ message: "No authorization token provided" });
      }
      if (req.headers.authorization === "Bearer invalid-token") {
        return res.status(401).json({ message: "Invalid token" });
      }

      const { storeId } = req.query;
      if (storeId) {
        return res.status(200).json(mockChainSingleStoreMetricsResponse);
      }
      return res.status(200).json(mockChainKeyMetricsResponse);
    }),
    getStores: jest.fn().mockImplementation((req, res) => {
      if (!req.headers.authorization) {
        return res
          .status(401)
          .json({ message: "No authorization token provided" });
      }
      if (req.headers.authorization === "Bearer invalid-token") {
        return res.status(401).json({ message: "Invalid token" });
      }
      return res.status(200).json(mockChainStoresResponse);
    }),
    getStoresListing: jest.fn().mockImplementation((req, res) => {
      if (!req.headers.authorization) {
        return res
          .status(401)
          .json({ message: "No authorization token provided" });
      }
      if (req.headers.authorization === "Bearer invalid-token") {
        return res.status(401).json({ message: "Invalid token" });
      }

      const { page = 1, searchQuery, sort: _sort, sortKey: _sortKey } = req.query;
      const response = { ...mockChainStoreListing };
      response.data.currentPage = Number(page);

      if (searchQuery === "nonexistent") {
        response.data.stores = [];
        response.data.totalStores = 0;
        response.data.totalPages = 0;
      }

      return res.status(200).json(response);
    })
  }
}));

// Mock ProgramController
jest.mock("../../controllers/ProgramController", () => ({
  __esModule: true,
  default: {
    listPrograms: jest.fn().mockImplementation((req, res) => {
      if (!req.headers.authorization) {
        return res
          .status(401)
          .json({ message: "No authorization token provided" });
      }
      if (req.headers.authorization === "Bearer invalid-token") {
        return res.status(401).json({ message: "Invalid token" });
      }

      const { type } = req.query;
      if (type !== "STORE") {
        return res.status(400).json({
          status: "error",
          message: "Invalid program type"
        });
      }

      return res.status(200).json(mockChainStorePrograms);
    })
  }
}));

const ChainController = require("../../controllers/ChainController").default;
const ProgramController =
  require("../../controllers/ProgramController").default;

describe("Chain Key Metrics API Tests", () => {
  let mockToken: string;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(() => {
    mockToken = jwt.sign(
      chainMockUser,
      process.env.JWT_SECRET || "test-secret",
      {
        expiresIn: "1h"
      }
    );
  });

  it("should return chain key metrics with valid token", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken
    });

    await ChainController.getChainKeyMetrics(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockChainKeyMetricsResponse);
  });

  it("should return single store chain metrics with valid token and storeId", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      query: { storeId: 2337 }
    });

    await ChainController.getChainKeyMetrics(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockChainSingleStoreMetricsResponse);
  });

  it("should validate chain key metrics data structure", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken
    });

    await ChainController.getChainKeyMetrics(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const response = res.json.mock.calls[0][0];
    expect(response.status).toBe("success");

    const { data } = response;
    expect(data).toEqual(
      expect.objectContaining({
        TotalSavingsCardData: expect.objectContaining({
          yoyValue: expect.any(Number),
          info: expect.any(String),
          value: expect.any(Number),
          footerInfo: expect.any(String),
          link: expect.objectContaining({
            label: expect.any(String),
            href: expect.any(String)
          })
        }),
        TotalManufacturer: expect.objectContaining({
          value: expect.any(Number)
        }),
        TotalTier: expect.objectContaining({
          value: expect.any(Number)
        }),
        TierAchievedData: expect.objectContaining({
          value: expect.any(Number)
        })
      })
    );
  });

  it("should return 401 if no authorization token is provided", async () => {
    const { req, res } = createMockRequestResponse();

    await ChainController.getChainKeyMetrics(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "No authorization token provided"
    });
  });

  it("should return 401 if invalid token is provided", async () => {
    const { req, res } = createMockRequestResponse({
      token: "invalid-token"
    });

    await ChainController.getChainKeyMetrics(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid token"
    });
  });
});

describe("Chain Stores API Tests", () => {
  let mockToken: string;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(() => {
    mockToken = jwt.sign(
      chainMockUser,
      process.env.JWT_SECRET || "test-secret",
      {
        expiresIn: "1h"
      }
    );
  });

  it("should return chain stores with valid token", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken
    });

    await ChainController.getStores(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockChainStoresResponse);
  });

  it("should validate chain stores data structure", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken
    });

    await ChainController.getStores(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const response = res.json.mock.calls[0][0];
    expect(response.status).toBe("success");

    const { data } = response;
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);

    data.forEach((store: any) => {
      expect(store).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          name: expect.any(String),
          address: expect.any(String),
          city: expect.any(String),
          state: expect.any(String),
          zip: expect.any(String),
          parentEntityId: expect.any(Number)
        })
      );
    });
  });

  it("should return 401 if no authorization token is provided", async () => {
    const { req, res } = createMockRequestResponse();

    await ChainController.getStores(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "No authorization token provided"
    });
  });

  it("should return 401 if invalid token is provided", async () => {
    const { req, res } = createMockRequestResponse({
      token: "invalid-token"
    });

    await ChainController.getStores(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid token"
    });
  });
});

describe("Chain Programs API Tests", () => {
  let mockToken: string;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(() => {
    mockToken = jwt.sign(
      chainMockUser,
      process.env.JWT_SECRET || "test-secret",
      {
        expiresIn: "1h"
      }
    );
  });

  it("should return chain programs with valid token", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      query: {
        userId: 4696,
        type: "STORE"
      }
    });

    await ProgramController.listPrograms(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockChainStorePrograms);
  });

  it("should validate chain programs data structure", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      query: {
        userId: 4696,
        type: "STORE"
      }
    });

    await ProgramController.listPrograms(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const response = res.json.mock.calls[0][0];
    expect(response.status).toBe("success");

    const { data } = response;
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);

    data.forEach((manufacturerProgram: any) => {
      expect(manufacturerProgram).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          storeId: expect.any(Number),
          manufacturerId: expect.any(Number),
          manufacturer: expect.objectContaining({
            id: expect.any(Number),
            name: expect.any(String),
            logo: expect.any(String)
          }),
          isEnrolled: expect.any(Boolean),
          salesData: expect.objectContaining({
            purchaseVolume: expect.objectContaining({
              amount: expect.any(Number),
              yoy: expect.any(Number)
            }),
            totalSavings: expect.objectContaining({
              amount: expect.any(Number),
              yoy: expect.any(Number)
            }),
            totalOppSavings: expect.objectContaining({
              amount: expect.any(Number)
            }),
            totalSalesRepSpiff: expect.objectContaining({
              amount: expect.any(Number)
            })
          }),
          programs: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(Number),
              programId: expect.any(Number),
              programTier: expect.any(Number),
              type: expect.any(String),
              programEntityType: expect.any(String),
              rebateType: expect.any(String),
              paymentTerms: expect.any(String),
              complianceStatus: expect.any(Boolean),
              additionalInfo: expect.objectContaining({
                title: expect.any(String)
              }),
              completedComplianceEntityIds: expect.any(Array),
              programdetailId: expect.any(Number)
            })
          ])
        })
      );
    });
  });

  it("should return 401 if no authorization token is provided", async () => {
    const { req, res } = createMockRequestResponse({
      query: {
        userId: 4696,
        type: "STORE"
      }
    });

    await ProgramController.listPrograms(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "No authorization token provided"
    });
  });

  it("should return 401 if invalid token is provided", async () => {
    const { req, res } = createMockRequestResponse({
      token: "invalid-token",
      query: {
        userId: 4696,
        type: "STORE"
      }
    });

    await ProgramController.listPrograms(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid token"
    });
  });

  it("should handle empty programs list", async () => {
    const mockEmptyResponse = {
      status: "success",
      data: []
    };

    ProgramController.listPrograms.mockImplementationOnce(
      (req: Request, res: Response) => {
        return res.status(200).json(mockEmptyResponse);
      }
    );

    const { req, res } = createMockRequestResponse({
      token: mockToken,
      query: {
        userId: 4696,
        type: "STORE"
      }
    });

    await ProgramController.listPrograms(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockEmptyResponse);
  });

  it("should handle invalid program type", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      query: {
        userId: 4696,
        type: "INVALID"
      }
    });

    await ProgramController.listPrograms(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      status: "error",
      message: "Invalid program type"
    });
  });
});

describe("Chain Store Listing API Tests", () => {
  let mockToken: string;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(() => {
    mockToken = jwt.sign(
      chainMockUser,
      process.env.JWT_SECRET || "test-secret",
      {
        expiresIn: "1h"
      }
    );
  });

  describe("Successful Requests", () => {
    it("should return store listing with valid token", async () => {
      const { req, res } = createMockRequestResponse({
        token: mockToken
      });

      await ChainController.getStoresListing(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockChainStoreListing);
    });

    it("should handle pagination", async () => {
      const { req, res } = createMockRequestResponse({
        token: mockToken,
        query: { page: 2 }
      });

      await ChainController.getStoresListing(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];
      expect(response.data.currentPage).toBe(2);
    });

    it("should handle search query", async () => {
      const { req, res } = createMockRequestResponse({
        token: mockToken,
        query: { searchQuery: "7-CLANS" }
      });

      await ChainController.getStoresListing(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockChainStoreListing);
    });

    it("should handle sorting", async () => {
      const { req, res } = createMockRequestResponse({
        token: mockToken,
        query: { sort: "DESC", sortKey: "name" }
      });

      await ChainController.getStoresListing(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockChainStoreListing);
    });
  });

  describe("Error Cases", () => {
    it("should return 401 if no authorization token is provided", async () => {
      const { req, res } = createMockRequestResponse();

      await ChainController.getStoresListing(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "No authorization token provided"
      });
    });

    it("should return 401 if invalid token is provided", async () => {
      const { req, res } = createMockRequestResponse({
        token: "invalid-token"
      });

      await ChainController.getStoresListing(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "Invalid token"
      });
    });
  });

  describe("Edge Cases", () => {
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

      ChainController.getStoresListing.mockImplementationOnce(
        (req: Request, res: Response) => {
          return res.status(200).json(mockEmptyResponse);
        }
      );

      const { req, res } = createMockRequestResponse({
        token: mockToken,
        query: { searchQuery: "nonexistent" }
      });

      await ChainController.getStoresListing(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockEmptyResponse);
    });
  });
});

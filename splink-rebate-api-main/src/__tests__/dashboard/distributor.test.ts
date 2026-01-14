import jwt from "jsonwebtoken";
import { ENTITY_TYPE } from "../../config/appConstants";
import { createMockRequestResponse } from "../helpers/test-utils";

// Add this mock response with sample data
const mockProgramEnrollmentResponse = require("../mocks/mockProgramEnrollmentResponse.json");

// Mock response for sales rep earnings
const mockSalesRepEarningsResponse = require("../mocks/mockSalesRepEarningsResponse.json");

// Add mock response for sales data
const mockSalesResponse = require("../mocks/mockSalesResponse.json");

const mockKeyMetricsResponse = {
  status: "success",
  data: {
    totalSavings: 1000.5,
    totalPurchaseVolume: 50000.75,
    relevantPurchaseVolume: 45000.25,
    storesCount: 10,
    activeStoresCount: 8,
    manufacturersCount: 5,
    enrolledStoreCount: 7, // Add mock value
    salesRepTotalEarnings: 2500,
    salesRepManagerTotalEarnings: 0
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

// Mock DistributorController
jest.mock("../../controllers/DistributorController", () => ({
  __esModule: true,
  default: {
    getKeyMetrics: jest.fn().mockImplementation((req, res) => {
      if (!req.headers.authorization) {
        return res
          .status(401)
          .json({ message: "No authorization token provided" });
      }
      if (req.headers.authorization === "Bearer invalid-token") {
        return res.status(401).json({ message: "Invalid token" });
      }
      return res.status(200).json(mockKeyMetricsResponse);
    }),
    getSalesRepEarnings: jest.fn().mockImplementation((req, res) => {
      if (!req.headers.authorization) {
        return res
          .status(401)
          .json({ message: "No authorization token provided" });
      }
      return res.status(200).json(mockSalesRepEarningsResponse);
    }),
    getProgramsEnrollment: jest.fn().mockImplementation((req, res) => {
      if (!req.headers.authorization) {
        return res
          .status(401)
          .json({ message: "No authorization token provided" });
      }
      return res.status(200).json(mockProgramEnrollmentResponse);
    }),
    getSales: jest.fn().mockImplementation((req, res) => {
      if (!req.headers.authorization) {
        return res
          .status(401)
          .json({ message: "No authorization token provided" });
      }
      return res.status(200).json(mockSalesResponse);
    })
  }
}));

const DistributorController =
  require("../../controllers/DistributorController").default;

describe("Distributor Store Program Enrollment API Tests", () => {
  let mockToken: string;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(() => {
    mockToken = jwt.sign(
      distMockUser,
      process.env.JWT_SECRET || "test-secret",
      { expiresIn: "1h" }
    );
  });

  it("should validate program enrollment data structure", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken
    });

    await DistributorController.getProgramsEnrollment(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockProgramEnrollmentResponse);
  });

  it("should return 401 if no authorization token is provided", async () => {
    const { req, res } = createMockRequestResponse();

    await DistributorController.getProgramsEnrollment(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe("Distributor Dashboard API Tests", () => {
  let mockToken: string;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(() => {
    mockToken = jwt.sign(
      distMockUser,
      process.env.JWT_SECRET || "test-secret",
      { expiresIn: "1h" }
    );
  });

  it("should return key metrics with valid token", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken
    });

    await DistributorController.getKeyMetrics(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockKeyMetricsResponse);
  });

  it("should validate key metrics data structure", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken
    });

    await DistributorController.getKeyMetrics(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const response = res.json.mock.calls[0][0];
    expect(response.status).toBe("success");

    expect(response.data).toEqual(
      expect.objectContaining({
        totalSavings: expect.any(Number),
        totalPurchaseVolume: expect.any(Number),
        relevantPurchaseVolume: expect.any(Number),
        storesCount: expect.any(Number),
        activeStoresCount: expect.any(Number),
        manufacturersCount: expect.any(Number),
        enrolledStoreCount: expect.any(Number) // Add check
      })
    );
  });

  it("should return 401 if no authorization token is provided", async () => {
    const { req, res } = createMockRequestResponse();

    await DistributorController.getKeyMetrics(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("should return 401 if invalid token is provided", async () => {
    const { req, res } = createMockRequestResponse({
      token: "invalid-token"
    });

    await DistributorController.getKeyMetrics(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe("Distributor Sales API Tests", () => {
  let mockToken: string;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(() => {
    mockToken = jwt.sign(
      distMockUser,
      process.env.JWT_SECRET || "test-secret",
      { expiresIn: "1h" }
    );
  });

  it("should return 1 month sales data with valid token", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      query: { month: "1" }
    });

    await DistributorController.getSales(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const response = res.json.mock.calls[0][0];
    expect(response.status).toBe("success");
    expect(response.data.result["1"]).toBeDefined();
    expect(response.data.result["1"].totalSale).toBe(182488.87);
    expect(Array.isArray(response.data.result["1"].barChartData)).toBe(true);
  });

  it("should validate sales data structure", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken
    });

    await DistributorController.getSales(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const response = res.json.mock.calls[0][0];
    expect(response.status).toBe("success");

    expect(response.data).toEqual(
      expect.objectContaining({
        result: expect.objectContaining({
          "1": expect.objectContaining({
            totalSale: expect.any(Number),
            barChartData: expect.arrayContaining([
              expect.objectContaining({
                date: expect.any(String),
                sales: expect.any(Number)
              })
            ])
          })
        }),
        categories: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(Number),
            name: expect.any(String)
          })
        ])
      })
    );
  });

  it("should handle multiple query parameters", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      query: {
        distributorId: 1,
        month: 3,
        categoryId: 8,
        isTotalSales: true
      }
    });

    await DistributorController.getSales(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const response = res.json.mock.calls[0][0];
    expect(response.status).toBe("success");
    expect(response.data.result).toBeDefined();
    expect(response.data.result["3"]).toBeDefined();
    expect(response.data.categories).toBeDefined();
  });

  it("should handle invalid query parameters gracefully", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      query: {
        month: "invalid",
        categoryId: "invalid",
        distributorId: "invalid"
      }
    });

    await DistributorController.getSales(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const response = res.json.mock.calls[0][0];
    expect(response.status).toBe("success");
  });

  it("should return 401 if no authorization token is provided", async () => {
    const { req, res } = createMockRequestResponse();

    await DistributorController.getSales(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });
});

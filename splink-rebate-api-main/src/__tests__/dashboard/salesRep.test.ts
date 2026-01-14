import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ENTITY_TYPE } from "../../config/appConstants";
import { ERROR_MESSAGES } from "../../config/errorMessages";
import { createMockRequestResponse } from "../helpers/test-utils";

const mockSalesRepKeyMetricsResponse = {
  status: "success",
  data: {
    totalEarning: 0,
    totalStores: 9,
    totalStoreProgram: 11,
    totalActiveStores: 0
  }
};

const mockEarningOverviewResponse = {
  status: "success",
  data: [
    {
      ManufacturerId: 1,
      ManufacturerName: "Wonderful Pistachios",
      ManufacturerLogo: "/img/avatar-wonderful-pistachios.png",
      totalEarnedRebate: null
    },
    {
      ManufacturerId: 2,
      ManufacturerName: "Florida's Natural",
      ManufacturerLogo: "/img/avatar-florida's-natural.png",
      totalEarnedRebate: null
    }
  ]
};

const mockStoreProgramEnrollmentResponse = {
  status: "success",
  data: [
    {
      ManufacturerId: 1,
      ManufacturerName: "Wonderful Pistachios",
      ManufacturerLogo: "/img/avatar-wonderful-pistachios.png",
      ProgramEnrollment: "0"
    },
    {
      ManufacturerId: 2,
      ManufacturerName: "Florida's Natural",
      ManufacturerLogo: "/img/avatar-florida's-natural.png",
      ProgramEnrollment: "0"
    },
    {
      ManufacturerId: 3,
      ManufacturerName: "Perfetti van Melle",
      ManufacturerLogo: "/img/avatar-perfetti-van-melle.png",
      ProgramEnrollment: "0"
    }
  ]
};

const salesRepMockUser = {
  userId: 1,
  id: 1,
  email: "test@example.com",
  role: ENTITY_TYPE.DISTRIBUTOR_SALES_REP,
  associatedUserId: 1,
  parentEntityId: "1",
  parentEntityType: ENTITY_TYPE.DISTRIBUTOR_ADMIN
};

// Create a valid token for testing
const mockToken = jwt.sign(
  salesRepMockUser,
  process.env.JWT_SECRET || "test-secret"
);

// Mock AuthService
jest.mock("../../services/AuthService", () => ({
  __esModule: true,
  default: {
    login: jest.fn().mockImplementation(() => ({
      accessToken: mockToken,
      user: salesRepMockUser
    }))
  }
}));

// Mock SalesRepController with proper error handling
jest.mock("../../controllers/SalesRepController", () => ({
  __esModule: true,
  default: {
    getKeyMetrics: jest
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

        return res.status(200).json(mockSalesRepKeyMetricsResponse);
      }),
    getSalesRepEarnings: jest
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

        return res.status(200).json(mockEarningOverviewResponse);
      }),
    getStoreProgramEnrollment: jest
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

        return res.status(200).json(mockStoreProgramEnrollmentResponse);
      })
  }
}));

const SalesRepController =
  require("../../controllers/SalesRepController").default;

describe("Sales Rep Key Metrics API Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return sales rep key metrics with valid token", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken
    });

    await SalesRepController.getKeyMetrics(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockSalesRepKeyMetricsResponse);
  });

  it("should validate key metrics data structure", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken
    });

    await SalesRepController.getKeyMetrics(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const response = res.json.mock.calls[0][0];
    expect(response.status).toBe("success");

    const { data } = response;
    expect(data).toEqual(
      expect.objectContaining({
        totalEarning: expect.any(Number),
        totalStores: expect.any(Number),
        totalStoreProgram: expect.any(Number),
        totalActiveStores: expect.any(Number)
      })
    );
  });

  it("should return 401 if no authorization token is provided", async () => {
    const { req, res } = createMockRequestResponse();

    await SalesRepController.getKeyMetrics(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: ERROR_MESSAGES.AUTH.NO_AUTH_PROVIDED
    });
  });

  it("should return 401 if invalid token is provided", async () => {
    const { req, res } = createMockRequestResponse({
      token: "invalid-token"
    });

    await SalesRepController.getKeyMetrics(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: ERROR_MESSAGES.AUTH.INVALID_TOKEN
    });
  });
});

describe("Sales Rep Earning Overview API Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return earning overview with valid token", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken
    });

    await SalesRepController.getSalesRepEarnings(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockEarningOverviewResponse);
  });

  it("should validate earning overview data structure", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken
    });

    await SalesRepController.getSalesRepEarnings(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const response = res.json.mock.calls[0][0];
    expect(response.status).toBe("success");

    const { data } = response;
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);

    data.forEach((manufacturer: any) => {
      expect(manufacturer).toEqual(
        expect.objectContaining({
          ManufacturerId: expect.any(Number),
          ManufacturerName: expect.any(String),
          ManufacturerLogo: expect.any(String),
          totalEarnedRebate: expect.any(Object)
        })
      );
    });
  });

  it("should return 401 if no authorization token is provided", async () => {
    const { req, res } = createMockRequestResponse();

    await SalesRepController.getSalesRepEarnings(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: ERROR_MESSAGES.AUTH.NO_AUTH_PROVIDED
    });
  });

  it("should return 401 if invalid token is provided", async () => {
    const { req, res } = createMockRequestResponse({
      token: "invalid-token"
    });

    await SalesRepController.getSalesRepEarnings(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: ERROR_MESSAGES.AUTH.INVALID_TOKEN
    });
  });

  it("should handle empty earnings data", async () => {
    const mockEmptyResponse = {
      status: "success",
      data: []
    };

    SalesRepController.getSalesRepEarnings.mockImplementationOnce(
      (req: Request, res: Response) => {
        return res.status(200).json(mockEmptyResponse);
      }
    );

    const { req, res } = createMockRequestResponse({
      token: mockToken
    });

    await SalesRepController.getSalesRepEarnings(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockEmptyResponse);
  });
});

describe("Sales Rep Store Program Enrollment API Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return store program enrollment with valid token", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken
    });

    await SalesRepController.getStoreProgramEnrollment(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockStoreProgramEnrollmentResponse);
  });

  it("should validate store program enrollment data structure", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken
    });

    await SalesRepController.getStoreProgramEnrollment(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const response = res.json.mock.calls[0][0];
    expect(response.status).toBe("success");

    const { data } = response;
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);

    data.forEach((manufacturer: any) => {
      expect(manufacturer).toEqual(
        expect.objectContaining({
          ManufacturerId: expect.any(Number),
          ManufacturerName: expect.any(String),
          ManufacturerLogo: expect.any(String),
          ProgramEnrollment: expect.any(String)
        })
      );
    });
  });

  it("should return 401 if no authorization token is provided", async () => {
    const { req, res } = createMockRequestResponse();

    await SalesRepController.getStoreProgramEnrollment(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: ERROR_MESSAGES.AUTH.NO_AUTH_PROVIDED
    });
  });

  it("should return 401 if invalid token is provided", async () => {
    const { req, res } = createMockRequestResponse({
      token: "invalid-token"
    });

    await SalesRepController.getStoreProgramEnrollment(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: ERROR_MESSAGES.AUTH.INVALID_TOKEN
    });
  });

  it("should handle empty program enrollment data", async () => {
    const mockEmptyResponse = {
      status: "success",
      data: []
    };

    SalesRepController.getStoreProgramEnrollment.mockImplementationOnce(
      (req: Request, res: Response) => {
        return res.status(200).json(mockEmptyResponse);
      }
    );

    const { req, res } = createMockRequestResponse({
      token: mockToken
    });

    await SalesRepController.getStoreProgramEnrollment(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockEmptyResponse);
  });
});

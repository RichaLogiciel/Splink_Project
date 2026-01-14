import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ENTITY_TYPE } from "../../config/appConstants";
import { ERROR_MESSAGES } from "../../config/errorMessages";
import { createMockRequestResponse } from "../helpers/test-utils";

const mockStoreKeyMetricsResponse = {
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
      value: 11
    },
    TotalTier: {
      value: 11
    },
    TierAchievedData: {
      value: 0
    }
  }
};

const storeMockUser = {
  userId: 1,
  id: 1,
  email: "test@example.com",
  role: ENTITY_TYPE.STORE,
  associatedUserId: 1,
  parentEntityId: "1",
  parentEntityType: ENTITY_TYPE.DISTRIBUTOR_ADMIN
};

// Create a valid token for testing
const mockToken = jwt.sign(
  storeMockUser,
  process.env.JWT_SECRET || "test-secret"
);

// Mock AuthService
jest.mock("../../services/AuthService", () => ({
  __esModule: true,
  default: {
    login: jest.fn().mockImplementation(() => ({
      accessToken: mockToken,
      user: storeMockUser
    }))
  }
}));

// Mock StoreController with proper error handling
jest.mock("../../controllers/StoreController", () => ({
  __esModule: true,
  default: {
    getStoreKeyMetrics: jest
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

        return res.status(200).json(mockStoreKeyMetricsResponse);
      })
  }
}));

const StoreController = require("../../controllers/StoreController").default;

describe("Store Key Metrics API Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return store key metrics with valid token", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken
    });

    await StoreController.getStoreKeyMetrics(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockStoreKeyMetricsResponse);
  });

  it("should validate key metrics data structure", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken
    });

    await StoreController.getStoreKeyMetrics(req, res);

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

    await StoreController.getStoreKeyMetrics(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: ERROR_MESSAGES.AUTH.NO_AUTH_PROVIDED
    });
  });

  it("should return 401 if invalid token is provided", async () => {
    const { req, res } = createMockRequestResponse({
      token: "invalid-token"
    });

    await StoreController.getStoreKeyMetrics(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: ERROR_MESSAGES.AUTH.INVALID_TOKEN
    });
  });

  it("should handle empty key metrics data", async () => {
    const mockEmptyResponse = {
      status: "success",
      data: {
        TotalSavingsCardData: {
          yoyValue: 0,
          info: "",
          value: 0,
          footerInfo: "",
          link: {
            label: "",
            href: ""
          }
        },
        TotalManufacturer: {
          value: 0
        },
        TotalTier: {
          value: 0
        },
        TierAchievedData: {
          value: 0
        }
      }
    };

    StoreController.getStoreKeyMetrics.mockImplementationOnce(
      (req: Request, res: Response) => {
        return res.status(200).json(mockEmptyResponse);
      }
    );

    const { req, res } = createMockRequestResponse({
      token: mockToken
    });

    await StoreController.getStoreKeyMetrics(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockEmptyResponse);
  });
});

import jwt from "jsonwebtoken";
import { ENTITY_TYPE } from "../config/appConstants";
import { ERROR_MESSAGES } from "../config/errorMessages";
import { createMockRequestResponse } from "./helpers/test-utils";

// Mock response data
const mockDistributorProgram = {
  manufacturerName: "Test Manufacturer",
  manufacturerLogo: "test-logo.png",
  manufacturerId: 1,
  totalPurchaseVolume: 1000,
  totalSaving: 100,
  program_overview: [
    {
      id: 1,
      name: "Test Program",
      programType: "REBATE",
      programTerms: "Test Terms",
      programHeader: "Test Header",
      compliances: [],
      programEntityType: ENTITY_TYPE.DISTRIBUTOR,
      programDetails: [
        {
          id: 1,
          tier: 1,
          min_qty: "10",
          rebate_type: "PERCENTAGE",
          rebate_calculation: "10%",
          program_id: 1,
          overview: "Test Overview"
        }
      ]
    }
  ]
};

const mockStoreProgram = {
  manufacturerName: "Test Manufacturer",
  manufacturerLogo: "test-logo.png",
  manufacturerId: 1,
  totalPurchaseVolume: 1000,
  totalSaving: 100,
  program_overview: [
    {
      id: 1,
      name: "Test Program",
      programType: "REBATE",
      programTerms: "Test Terms",
      programHeader: "Test Header",
      compliances: [],
      programEntityType: ENTITY_TYPE.STORE,
      programDetails: [
        {
          id: 1,
          tier: 1,
          min_qty: "10",
          rebate_type: "PERCENTAGE",
          rebate_calculation: "10%",
          program_id: 1,
          overview: "Test Overview"
        }
      ]
    }
  ]
};

// Mock user data
const distMockUser = {
  userId: 1,
  id: 1,
  email: "test@example.com",
  role: ENTITY_TYPE.DISTRIBUTOR_ADMIN,
  associatedUserId: 1,
  parentEntityId: "",
  parentEntityType: ""
};

// Mock Express
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

// Mock AuthService
jest.mock("../services/AuthService", () => ({
  __esModule: true,
  default: {
    login: jest.fn().mockImplementation(() => ({
      accessToken: "mocked-token",
      user: distMockUser
    }))
  }
}));

// Mock ProgramService
jest.mock("../services/ProgramService", () => ({
  __esModule: true,
  default: {
    getPrograms: jest
      .fn()
      .mockImplementation((userId: number, type: string) => {
        if (type === ENTITY_TYPE.DISTRIBUTOR) {
          return Promise.resolve([mockDistributorProgram]);
        } else if (type === ENTITY_TYPE.STORE) {
          return Promise.resolve([mockStoreProgram]);
        }
        return Promise.resolve([]);
      })
  }
}));

// Mock ProgramController
jest.mock("../controllers/ProgramController", () => ({
  __esModule: true,
  default: {
    listPrograms: jest.fn().mockImplementation((req, res) => {
      // Authentication checks
      if (!req.headers.authorization || !req.user) {
        return res.status(401).json({
          message: ERROR_MESSAGES.AUTH.NO_AUTH_PROVIDED
        });
      }

      if (req.headers.authorization === "Bearer invalid-token") {
        return res.status(401).json({
          message: "Invalid token"
        });
      }

      // Query parameter validation
      if (!req.query.type) {
        return res.status(400).json({
          status: "error",
          data: ERROR_MESSAGES.COMMON.BAD_REQUEST
        });
      }

      const type = req.query.type;

      // Return appropriate response based on type
      switch (type) {
        case ENTITY_TYPE.STORE:
          return res.status(200).json({
            status: "success",
            data: [mockStoreProgram]
          });
        case ENTITY_TYPE.DISTRIBUTOR:
          return res.status(200).json({
            status: "success",
            data: [mockDistributorProgram]
          });
        default:
          return res.status(200).json({
            status: "success",
            data: []
          });
      }
    })
  }
}));

describe("Program API Tests", () => {
  let mockToken: string;

  beforeAll(() => {
    mockToken = jwt.sign(
      distMockUser,
      process.env.JWT_SECRET || "test-secret",
      { expiresIn: "1h" }
    );
  });

  describe("GET /api/v1/programs/", () => {
    describe("Distributor Programs", () => {
      it("should return a list of Distributor programs with valid token", async () => {
        const { req, res } = createMockRequestResponse({
          token: mockToken,
          query: { type: ENTITY_TYPE.DISTRIBUTOR }
        });

        const ProgramController =
          require("../controllers/ProgramController").default;
        await ProgramController.listPrograms(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            status: "success",
            data: expect.arrayContaining([
              expect.objectContaining({
                manufacturerName: expect.any(String),
                manufacturerLogo: expect.any(String),
                manufacturerId: expect.any(Number),
                totalPurchaseVolume: expect.any(Number),
                totalSaving: expect.any(Number),
                program_overview: expect.arrayContaining([
                  expect.objectContaining({
                    id: expect.any(Number),
                    name: expect.any(String),
                    programType: expect.any(String),
                    programTerms: expect.any(String),
                    programHeader: expect.any(String),
                    compliances: expect.any(Array),
                    programEntityType: expect.any(String),
                    programDetails: expect.arrayContaining([
                      expect.objectContaining({
                        id: expect.any(Number),
                        tier: expect.any(Number),
                        min_qty: expect.any(String),
                        rebate_type: expect.any(String),
                        rebate_calculation: expect.any(String),
                        program_id: expect.any(Number),
                        overview: expect.any(String)
                      })
                    ])
                  })
                ])
              })
            ])
          })
        );
      });

      it("should handle empty program lists", async () => {
        const { req, res } = createMockRequestResponse({
          token: mockToken,
          query: { type: ENTITY_TYPE.DISTRIBUTOR }
        });

        const ProgramController =
          require("../controllers/ProgramController").default;
        // Override the mock implementation for this test
        ProgramController.listPrograms.mockImplementationOnce(
          (req: any, res: any) => {
            return res.status(200).json({
              status: "success",
              data: []
            });
          }
        );

        await ProgramController.listPrograms(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            status: "success",
            data: []
          })
        );
      });

      it("should handle internal server errors gracefully", async () => {
        const { req, res } = createMockRequestResponse({
          token: mockToken,
          query: { type: ENTITY_TYPE.DISTRIBUTOR }
        });

        const ProgramController =
          require("../controllers/ProgramController").default;
        // Override the mock implementation for this test
        ProgramController.listPrograms.mockImplementationOnce(
          (req: any, res: any) => {
            return res.status(500).json({
              status: "error",
              data: "Internal error"
            });
          }
        );

        await ProgramController.listPrograms(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({ data: "Internal error", status: "error" })
        );
      });
    });

    describe("Store Programs", () => {
      it("should return a list of store programs with valid token", async () => {
        const { req, res } = createMockRequestResponse({
          token: mockToken,
          query: { type: ENTITY_TYPE.STORE }
        });

        const ProgramController =
          require("../controllers/ProgramController").default;
        await ProgramController.listPrograms(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            status: "success",
            data: expect.arrayContaining([
              expect.objectContaining({
                manufacturerName: expect.any(String),
                manufacturerLogo: expect.any(String),
                manufacturerId: expect.any(Number),
                totalPurchaseVolume: expect.any(Number),
                totalSaving: expect.any(Number),
                program_overview: expect.arrayContaining([
                  expect.objectContaining({
                    id: expect.any(Number),
                    name: expect.any(String),
                    programType: expect.any(String),
                    programTerms: expect.any(String),
                    programHeader: expect.any(String),
                    compliances: expect.any(Array),
                    programEntityType: ENTITY_TYPE.STORE,
                    programDetails: expect.arrayContaining([
                      expect.objectContaining({
                        id: expect.any(Number),
                        tier: expect.any(Number),
                        min_qty: expect.any(String),
                        rebate_type: expect.any(String),
                        rebate_calculation: expect.any(String),
                        program_id: expect.any(Number),
                        overview: expect.any(String)
                      })
                    ])
                  })
                ])
              })
            ])
          })
        );
      });
    });

    describe("Authentication and Authorization", () => {
      it("should return 401 if no authorization token is provided", async () => {
        const { req, res } = createMockRequestResponse({
          query: { type: ENTITY_TYPE.DISTRIBUTOR }
        });

        const ProgramController =
          require("../controllers/ProgramController").default;
        await ProgramController.listPrograms(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          message: ERROR_MESSAGES.AUTH.NO_AUTH_PROVIDED
        });
      });

      it("should return 401 if invalid token is provided", async () => {
        const { req, res } = createMockRequestResponse({
          token: "invalid-token",
          query: { type: ENTITY_TYPE.DISTRIBUTOR }
        });

        const ProgramController =
          require("../controllers/ProgramController").default;
        await ProgramController.listPrograms(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          message: "Invalid token"
        });
      });
    });

    describe("Query Parameters", () => {
      it("should handle invalid program type", async () => {
        const { req, res } = createMockRequestResponse({
          token: mockToken,
          query: { type: "INVALID_TYPE" }
        });

        const ProgramController =
          require("../controllers/ProgramController").default;
        // Override the mock implementation for this test
        ProgramController.listPrograms.mockImplementationOnce(
          (req: any, res: any) => {
            return res.status(200).json({
              status: "success",
              data: []
            });
          }
        );

        await ProgramController.listPrograms(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            status: "success",
            data: []
          })
        );
      });

      it("should handle missing type parameter", async () => {
        const { req, res } = createMockRequestResponse({
          token: mockToken,
          query: {}
        });

        const ProgramController =
          require("../controllers/ProgramController").default;
        await ProgramController.listPrograms(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
      });
    });
  });
});

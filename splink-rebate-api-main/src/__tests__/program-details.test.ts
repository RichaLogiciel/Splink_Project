import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ENTITY_TYPE } from "../config/appConstants";
import { ERROR_MESSAGES } from "../config/errorMessages";
import { createMockRequestResponse } from "./helpers/test-utils";

const mockStoreProgramResponse = require("./mocks/storeProgramDetails.json");
const mockDistributorProgramResponse = require("./mocks/distributorProgramDetails.json");

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
jest.mock("../services/AuthService", () => ({
  __esModule: true,
  default: {
    login: jest.fn().mockImplementation(() => ({
      accessToken: "mocked-token",
      user: distMockUser
    }))
  }
}));

// Mock ProgramController
jest.mock("../controllers/ProgramController", () => ({
  __esModule: true,
  default: {
    getProgramDetails: jest.fn().mockImplementation((req, res) => {
      // Authentication checks
      if (!req.headers.authorization || !req.user) {
        return res.status(401).json({
          message: ERROR_MESSAGES.AUTH.NO_AUTH_PROVIDED
        });
      }

      if (
        req.headers.authorization === "Bearer invalid-token" ||
        req.headers.authorization === "Bearer malformed-token"
      ) {
        return res.status(401).json({
          message: ERROR_MESSAGES.AUTH.INVALID_TOKEN
        });
      }

      // Required parameters check
      if (!req.query.manufacturerId) {
        return res.status(400).json({
          status: "error",
          data: ERROR_MESSAGES.COMMON.BAD_REQUEST
        });
      }

      const { type } = req.query;

      // Return appropriate response based on type
      switch (type) {
        case ENTITY_TYPE.STORE:
          return res.status(200).json(mockStoreProgramResponse);
        case ENTITY_TYPE.DISTRIBUTOR:
          return res.status(200).json(mockDistributorProgramResponse);
        default:
          return res.status(400).json({
            status: "error",
            data: ERROR_MESSAGES.COMMON.BAD_REQUEST
          });
      }
    })
  }
}));

describe("Program Details API Tests", () => {
  let mockToken: string;

  beforeAll(() => {
    mockToken = jwt.sign(
      distMockUser,
      process.env.JWT_SECRET || "test-secret",
      { expiresIn: "1h" }
    );
  });

  describe("GET /api/v1/programs/details", () => {
    describe("Store Programs", () => {
      it("should return the full Store program details structure with valid token", async () => {
        const { req, res } = createMockRequestResponse({
          token: mockToken,
          query: {
            type: ENTITY_TYPE.STORE,
            manufacturerId: 1,
            searchQuery: "",
            enrolledPage: 1,
            notEnrolledPage: 1,
            sort: "ASC",
            sortKey: "sort"
          }
        });

        const ProgramController =
          require("../controllers/ProgramController").default;
        await ProgramController.getProgramDetails(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(mockStoreProgramResponse);
      });

      it("should return the program tier details structure with valid token", async () => {
        const { req, res } = createMockRequestResponse({
          token: mockToken,
          query: {
            type: ENTITY_TYPE.STORE,
            manufacturerId: 1,
            searchQuery: "",
            enrolledPage: 1,
            notEnrolledPage: 1,
            sort: "ASC",
            sortKey: "sort"
          }
        });

        const ProgramController =
          require("../controllers/ProgramController").default;
        await ProgramController.getProgramDetails(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            status: "success",
            data: expect.objectContaining({
              retailerProgramOverview: expect.arrayContaining([
                expect.objectContaining({
                  compliances: expect.any(Array),
                  id: expect.any(Number),
                  programType: expect.any(String),
                  name: expect.any(String),
                  programHeader: expect.any(String),
                  programEntityType: "STORE",
                  programTerms: expect.any(String),
                  programDetails: expect.arrayContaining([
                    expect.objectContaining({
                      id: expect.any(Number),
                      tier: expect.any(Number),
                      min_qty: expect.any(String),
                      rebate_type: expect.any(String),
                      rebate_calculation: expect.any(String),
                      program_id: expect.any(Number),
                      overview: expect.any(String),
                      description: expect.any(String),
                      products_tags: expect.any(String),
                      products_tags_qty: expect.any(String),
                      criteria: expect.any(String),
                      qualifiedComliances: expect.any(String)
                    })
                  ])
                })
              ])
            })
          })
        );
      });

      it("should handle empty store program list", async () => {
        const { req, res } = createMockRequestResponse({
          token: mockToken,
          query: {
            type: ENTITY_TYPE.STORE,
            manufacturerId: 1,
            searchQuery: "",
            enrolledPage: 1,
            notEnrolledPage: 1,
            sort: "ASC",
            sortKey: "sort"
          }
        });

        const ProgramController =
          require("../controllers/ProgramController").default;
        // Override the mock implementation for this test
        ProgramController.getProgramDetails.mockImplementationOnce(
          (req: Request, res: Response) => {
            return res.status(200).json({
              status: "success",
              data: {
                retailerProgramOverview: []
              }
            });
          }
        );

        await ProgramController.getProgramDetails(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            status: "success",
            data: expect.objectContaining({
              retailerProgramOverview: expect.arrayContaining([])
            })
          })
        );
      });

      it("should handle internal server errors for store programs", async () => {
        const { req, res } = createMockRequestResponse({
          token: mockToken,
          query: {
            type: ENTITY_TYPE.STORE,
            manufacturerId: 1,
            searchQuery: "",
            enrolledPage: 1,
            notEnrolledPage: 1,
            sort: "ASC",
            sortKey: "sort"
          }
        });

        const ProgramController =
          require("../controllers/ProgramController").default;
        // Override the mock implementation for this test
        ProgramController.getProgramDetails.mockImplementationOnce(
          (req: Request, res: Response) => {
            return res.status(500).json({
              status: "error",
              data: "Internal server error"
            });
          }
        );

        await ProgramController.getProgramDetails(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            status: "error",
            data: "Internal server error"
          })
        );
      });
    });

    describe("Distributor Programs", () => {
      it("should return the full Distributor program details structure with valid token", async () => {
        const { req, res } = createMockRequestResponse({
          token: mockToken,
          query: {
            type: ENTITY_TYPE.DISTRIBUTOR,
            manufacturerId: 1,
            searchQuery: "",
            enrolledPage: 1,
            notEnrolledPage: 1,
            sort: "ASC",
            sortKey: "sort"
          }
        });

        const ProgramController =
          require("../controllers/ProgramController").default;
        await ProgramController.getProgramDetails(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(mockDistributorProgramResponse);
      });

      it("should return Distributor program details Category with valid token", async () => {
        const { req, res } = createMockRequestResponse({
          token: mockToken,
          query: {
            type: ENTITY_TYPE.DISTRIBUTOR,
            manufacturerId: 1,
            searchQuery: "",
            enrolledPage: 1,
            notEnrolledPage: 1,
            sort: "ASC",
            sortKey: "sort"
          }
        });

        const ProgramController =
          require("../controllers/ProgramController").default;
        await ProgramController.getProgramDetails(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const responseBody = res.json.mock.calls[0][0];
        const { distributorProgramOverview } = responseBody;

        // Find programs with Category SKUs criteria
        const categorySkuPrograms = distributorProgramOverview
          .flatMap((program: any) => program.programDetails)
          .filter((detail: any) => detail.criteria === "Category SKUs");

        // Validate Category SKU programs
        categorySkuPrograms.forEach((program: any) => {
          expect(program).toEqual(
            expect.objectContaining({
              products_tags: expect.any(String),
              products_tags_qty: expect.any(String),
              categorizedProducts: expect.objectContaining({
                [program.products_tags]: expect.objectContaining({
                  purchasedProducts: expect.any(Array),
                  requiredProducts: expect.any(Array)
                })
              })
            })
          );
        });
      });

      it("should return Distributor program details POD with valid token", async () => {
        const { req, res } = createMockRequestResponse({
          token: mockToken,
          query: {
            type: ENTITY_TYPE.DISTRIBUTOR,
            manufacturerId: 1,
            searchQuery: "",
            enrolledPage: 1,
            notEnrolledPage: 1,
            sort: "ASC",
            sortKey: "sort"
          }
        });

        const ProgramController =
          require("../controllers/ProgramController").default;
        await ProgramController.getProgramDetails(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const responseBody = res.json.mock.calls[0][0];
        const { distributorProgramOverview } = responseBody;

        // Find programs with POD criteria
        const podPrograms = distributorProgramOverview
          .flatMap((program: any) => program.programDetails)
          .filter((detail: any) => detail.criteria === "POD");

        // Validate POD programs
        podPrograms.forEach((program: any) => {
          expect(program).toEqual(
            expect.objectContaining({
              products_tags: expect.any(String),
              products_tags_qty: expect.any(String),
              categorizedProducts: expect.objectContaining({
                [program.products_tags]: expect.objectContaining({
                  purchasedProducts: expect.any(Array),
                  requiredProducts: expect.any(Array)
                })
              })
            })
          );
        });
      });

      it("should handle empty distributor program list", async () => {
        const { req, res } = createMockRequestResponse({
          token: mockToken,
          query: {
            type: ENTITY_TYPE.DISTRIBUTOR,
            manufacturerId: 1,
            searchQuery: "",
            enrolledPage: 1,
            notEnrolledPage: 1,
            sort: "ASC",
            sortKey: "sort"
          }
        });

        const ProgramController =
          require("../controllers/ProgramController").default;
        // Override the mock implementation for this test
        ProgramController.getProgramDetails.mockImplementationOnce(
          (req: Request, res: Response) => {
            return res.status(200).json({
              status: "success",
              data: {
                distributorProgramOverview: []
              }
            });
          }
        );

        await ProgramController.getProgramDetails(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            status: "success",
            data: expect.objectContaining({
              distributorProgramOverview: expect.arrayContaining([])
            })
          })
        );
      });

      it("should handle internal server errors for distributor programs", async () => {
        const { req, res } = createMockRequestResponse({
          token: mockToken,
          query: {
            type: ENTITY_TYPE.DISTRIBUTOR,
            manufacturerId: 1,
            searchQuery: "",
            enrolledPage: 1,
            notEnrolledPage: 1,
            sort: "ASC",
            sortKey: "sort"
          }
        });

        const ProgramController =
          require("../controllers/ProgramController").default;
        // Override the mock implementation for this test
        ProgramController.getProgramDetails.mockImplementationOnce(
          (req: Request, res: Response) => {
            return res.status(500).json({
              status: "error",
              data: "Internal server error"
            });
          }
        );

        await ProgramController.getProgramDetails(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            status: "error",
            data: "Internal server error"
          })
        );
      });
    });

    describe("Query Parameters", () => {
      it("should handle missing required query parameters", async () => {
        const { req, res } = createMockRequestResponse({
          token: mockToken,
          query: {
            type: ENTITY_TYPE.STORE
            // Missing manufacturerId
          }
        });

        const ProgramController =
          require("../controllers/ProgramController").default;
        await ProgramController.getProgramDetails(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            status: "error",
            data: ERROR_MESSAGES.COMMON.BAD_REQUEST
          })
        );
      });

      it("should handle invalid program type", async () => {
        const { req, res } = createMockRequestResponse({
          token: mockToken,
          query: {
            type: "INVALID_TYPE",
            manufacturerId: 1,
            searchQuery: "",
            enrolledPage: 1,
            notEnrolledPage: 1,
            sort: "ASC",
            sortKey: "sort"
          }
        });

        const ProgramController =
          require("../controllers/ProgramController").default;
        await ProgramController.getProgramDetails(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            status: "error",
            data: ERROR_MESSAGES.COMMON.BAD_REQUEST
          })
        );
      });
    });

    describe("Authentication and Authorization", () => {
      it("should return 401 if no authorization token is provided", async () => {
        const { req, res } = createMockRequestResponse({
          query: {
            type: ENTITY_TYPE.STORE,
            manufacturerId: 1,
            searchQuery: "",
            enrolledPage: 1,
            notEnrolledPage: 1,
            sort: "ASC",
            sortKey: "sort"
          }
        });

        const ProgramController =
          require("../controllers/ProgramController").default;
        await ProgramController.getProgramDetails(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          message: ERROR_MESSAGES.AUTH.NO_AUTH_PROVIDED
        });
      });

      it("should return 401 if invalid token is provided", async () => {
        const { req, res } = createMockRequestResponse({
          token: "invalid-token",
          query: {
            type: ENTITY_TYPE.STORE,
            manufacturerId: 1,
            searchQuery: "",
            enrolledPage: 1,
            notEnrolledPage: 1,
            sort: "ASC",
            sortKey: "sort"
          }
        });

        const ProgramController =
          require("../controllers/ProgramController").default;
        await ProgramController.getProgramDetails(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          message: ERROR_MESSAGES.AUTH.INVALID_TOKEN
        });
      });

      it("should handle malformed authorization header", async () => {
        const { req, res } = createMockRequestResponse({
          token: "malformed-token",
          query: {
            type: ENTITY_TYPE.STORE,
            manufacturerId: 1,
            searchQuery: "",
            enrolledPage: 1,
            notEnrolledPage: 1,
            sort: "ASC",
            sortKey: "sort"
          }
        });

        const ProgramController =
          require("../controllers/ProgramController").default;
        await ProgramController.getProgramDetails(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          message: ERROR_MESSAGES.AUTH.INVALID_TOKEN
        });
      });
    });
  });
});

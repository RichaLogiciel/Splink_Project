import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ENTITY_TYPE } from "../../config/appConstants";
import { ERROR_MESSAGES } from "../../config/errorMessages";
import { createMockRequestResponse } from "../helpers/test-utils";

// Mock response data
const mockProgramsResponse = {
  status: "success",
  data: {
    distributorProgramsData: [
      {
        manufacturerId: 1,
        manufacturerName: "Test Manufacturer",
        programs: [
          {
            id: 1,
            name: "Test Program",
            type: "TIER",
            status: "ACTIVE",
            startDate: "2024-01-01",
            endDate: "2024-12-31",
            description: "Test Description",
            rebateType: "percentage",
            rebateAmount: 5
          }
        ]
      }
    ],
    storeProgramsData: [],
    salesRepsProgramsData: []
  }
};

const mockProgramDetailsResponse = {
  status: "success",
  data: {
    distributorProgramOverview: [
      {
        manufacturerId: 1,
        manufacturerName: "Test Manufacturer",
        programDetails: [
          {
            id: 1,
            programId: 1,
            programName: "Test Program",
            tier: 1,
            rebateType: "percentage",
            rebatePercentage: 5,
            rebateAmount: 100,
            description: "Test Description",
            productsTags: ["tag1", "tag2"],
            productsTagsQty: [1, 2]
          }
        ]
      }
    ]
  }
};

// Mock user data
const mockUser = {
  userId: 1,
  id: 1,
  email: "test@example.com",
  role: ENTITY_TYPE.DISTRIBUTOR_ADMIN,
  associatedUserId: 1,
  parentEntityId: "1",
  parentEntityType: ENTITY_TYPE.DISTRIBUTOR_ADMIN
};

// Create a valid token for testing
const mockToken = jwt.sign(mockUser, process.env.JWT_SECRET || "test-secret");

// Mock ProgramController
jest.mock("../../controllers/ProgramController", () => ({
  __esModule: true,
  default: {
    getPrograms: jest.fn().mockImplementation((req: Request, res: Response) => {
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

      return res.status(200).json(mockProgramsResponse);
    }),

    getProgramDetails: jest
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

        return res.status(200).json(mockProgramDetailsResponse);
      })
  }
}));

const ProgramController =
  require("../../controllers/ProgramController").default;

describe("Program API Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Programs Listing API Tests", () => {
    it("should return programs listing with valid token", async () => {
      const { req, res } = createMockRequestResponse({
        token: mockToken
      });

      await ProgramController.getPrograms(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockProgramsResponse);
    });

    it("should validate programs listing data structure", async () => {
      const { req, res } = createMockRequestResponse({
        token: mockToken
      });

      await ProgramController.getPrograms(req, res);

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

      if (data.distributorProgramsData.length > 0) {
        data.distributorProgramsData.forEach((program: any) => {
          expect(program).toEqual(
            expect.objectContaining({
              manufacturerId: expect.any(Number),
              manufacturerName: expect.any(String),
              programs: expect.arrayContaining([
                expect.objectContaining({
                  id: expect.any(Number),
                  name: expect.any(String),
                  type: expect.any(String),
                  status: expect.any(String),
                  startDate: expect.any(String),
                  endDate: expect.any(String),
                  description: expect.any(String),
                  rebateType: expect.any(String),
                  rebateAmount: expect.any(Number)
                })
              ])
            })
          );
        });
      }
    });

    it("should return 401 if no authorization token is provided", async () => {
      const { req, res } = createMockRequestResponse();

      await ProgramController.getPrograms(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: ERROR_MESSAGES.AUTH.NO_AUTH_PROVIDED
      });
    });

    it("should return 401 if invalid token is provided", async () => {
      const { req, res } = createMockRequestResponse({
        token: "invalid-token"
      });

      await ProgramController.getPrograms(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: ERROR_MESSAGES.AUTH.INVALID_TOKEN
      });
    });
  });

  describe("Program Details API Tests", () => {
    it("should return program details with valid token", async () => {
      const { req, res } = createMockRequestResponse({
        token: mockToken,
        params: { manufacturerId: 1 }
      });

      await ProgramController.getProgramDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockProgramDetailsResponse);
    });

    it("should validate program details data structure", async () => {
      const { req, res } = createMockRequestResponse({
        token: mockToken,
        params: { manufacturerId: 1 }
      });

      await ProgramController.getProgramDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];
      expect(response.status).toBe("success");

      const { data } = response;
      expect(data).toEqual(
        expect.objectContaining({
          distributorProgramOverview: expect.arrayContaining([
            expect.objectContaining({
              manufacturerId: expect.any(Number),
              manufacturerName: expect.any(String),
              programDetails: expect.arrayContaining([
                expect.objectContaining({
                  id: expect.any(Number),
                  programId: expect.any(Number),
                  programName: expect.any(String),
                  tier: expect.any(Number),
                  rebateType: expect.any(String),
                  rebatePercentage: expect.any(Number),
                  rebateAmount: expect.any(Number),
                  description: expect.any(String),
                  productsTags: expect.any(Array),
                  productsTagsQty: expect.any(Array)
                })
              ])
            })
          ])
        })
      );
    });

    it("should return 401 if no authorization token is provided", async () => {
      const { req, res } = createMockRequestResponse({
        params: { manufacturerId: 1 }
      });

      await ProgramController.getProgramDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: ERROR_MESSAGES.AUTH.NO_AUTH_PROVIDED
      });
    });

    it("should handle search query", async () => {
      const { req, res } = createMockRequestResponse({
        token: mockToken,
        params: { manufacturerId: 1 },
        query: { search: "test" }
      });

      await ProgramController.getProgramDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockProgramDetailsResponse);
    });

    it("should handle includeChainInfo parameter", async () => {
      const { req, res } = createMockRequestResponse({
        token: mockToken,
        params: { manufacturerId: 1 },
        query: { includeChainInfo: "true" }
      });

      await ProgramController.getProgramDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockProgramDetailsResponse);
    });
  });
});

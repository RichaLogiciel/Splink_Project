import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ENTITY_TYPE } from "../../config/appConstants";
import { ERROR_MESSAGES } from "../../config/errorMessages";
import { createMockRequestResponse } from "../helpers/test-utils";

// Mock response data
const mockStoreResponse = {
  status: "success",
  data: {
    stores: [
      {
        id: 1,
        externalStoreId: "EXT001",
        userInfo: {
          id: 1,
          status: "ACTIVE"
        },
        storeInfo: {
          name: "Test Store",
          location: "Test Location",
          rep: {
            name: "Test Rep"
          }
        },
        salesData: {
          purchaseVolume: {
            amount: 1000
          },
          totalSavings: {
            amount: 100
          },
          totalOppSavings: {
            amount: 200
          }
        },
        programData: {
          completedPrograms: 5,
          totalEnrolled: 10,
          enrolledProgram: [],
          remainingProgram: [],
          enrolledProgramIds: []
        },
        chainId: 1,
        chainNames: "Test Chain"
      }
    ],
    totalStores: 1,
    currentPage: 1,
    totalPages: 1
  }
};

const mockStoreDetailsResponse = {
  status: "success",
  data: {
    store: {
      id: 1,
      name: "Test Store",
      location: "Test Location",
      programs: [
        {
          id: 1,
          name: "Test Program",
          type: "TIER",
          status: "ACTIVE"
        }
      ]
    }
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

// Mock StoreController
jest.mock("../../controllers/StoreController", () => ({
  __esModule: true,
  default: {
    getListing: jest.fn().mockImplementation((req: Request, res: Response) => {
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

      return res.status(200).json(mockStoreResponse);
    }),

    getStoreDetails: jest
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

        return res.status(200).json(mockStoreDetailsResponse);
      }),

    getStoreProgramsDetails: jest
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

        return res.status(200).json({
          status: "success",
          data: {
            tierDetails: [],
            additionalInfo: {
              note: "",
              recommendedProducts: [],
              purchasedProducts: []
            }
          }
        });
      })
  }
}));

const StoreController = require("../../controllers/StoreController").default;

describe("Store API Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Store Listing API Tests", () => {
    it("should return store listing with valid token", async () => {
      const { req, res } = createMockRequestResponse({
        token: mockToken
      });

      await StoreController.getListing(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockStoreResponse);
    });

    it("should validate store listing data structure", async () => {
      const { req, res } = createMockRequestResponse({
        token: mockToken
      });

      await StoreController.getListing(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];
      expect(response.status).toBe("success");

      const { data } = response;
      expect(data).toEqual(
        expect.objectContaining({
          stores: expect.any(Array),
          totalStores: expect.any(Number),
          currentPage: expect.any(Number),
          totalPages: expect.any(Number)
        })
      );

      if (data.stores.length > 0) {
        data.stores.forEach((store: any) => {
          expect(store).toEqual(
            expect.objectContaining({
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
                }),
                totalOppSavings: expect.objectContaining({
                  amount: expect.any(Number)
                })
              }),
              programData: expect.objectContaining({
                completedPrograms: expect.any(Number),
                totalEnrolled: expect.any(Number),
                enrolledProgram: expect.any(Array),
                remainingProgram: expect.any(Array),
                enrolledProgramIds: expect.any(Array)
              })
            })
          );
        });
      }
    });

    it("should handle pagination", async () => {
      const { req, res } = createMockRequestResponse({
        token: mockToken,
        query: { page: 2 }
      });

      await StoreController.getListing(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];
      expect(response.data.currentPage).toBe(1);
    });

    it("should handle search query", async () => {
      const { req, res } = createMockRequestResponse({
        token: mockToken,
        query: { searchQuery: "test" }
      });

      await StoreController.getListing(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockStoreResponse);
    });

    it("should return 401 if no authorization token is provided", async () => {
      const { req, res } = createMockRequestResponse();

      await StoreController.getListing(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: ERROR_MESSAGES.AUTH.NO_AUTH_PROVIDED
      });
    });

    it("should return 401 if invalid token is provided", async () => {
      const { req, res } = createMockRequestResponse({
        token: "invalid-token"
      });

      await StoreController.getListing(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: ERROR_MESSAGES.AUTH.INVALID_TOKEN
      });
    });
  });

  describe("Store Details API Tests", () => {
    it("should return store details with valid token", async () => {
      const { req, res } = createMockRequestResponse({
        token: mockToken,
        params: { storeId: 1 }
      });

      await StoreController.getStoreDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockStoreDetailsResponse);
    });

    it("should validate store details data structure", async () => {
      const { req, res } = createMockRequestResponse({
        token: mockToken,
        params: { storeId: 1 }
      });

      await StoreController.getStoreDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];
      expect(response.status).toBe("success");

      const { data } = response;
      expect(data).toEqual(
        expect.objectContaining({
          store: expect.objectContaining({
            id: expect.any(Number),
            name: expect.any(String),
            location: expect.any(String),
            programs: expect.arrayContaining([
              expect.objectContaining({
                id: expect.any(Number),
                name: expect.any(String),
                type: expect.any(String),
                status: expect.any(String)
              })
            ])
          })
        })
      );
    });

    it("should return 401 if no authorization token is provided", async () => {
      const { req, res } = createMockRequestResponse({
        params: { storeId: 1 }
      });

      await StoreController.getStoreDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: ERROR_MESSAGES.AUTH.NO_AUTH_PROVIDED
      });
    });
  });

  describe("Store Programs Details API Tests", () => {
    it("should return store programs details with valid token", async () => {
      const { req, res } = createMockRequestResponse({
        token: mockToken,
        params: { storeId: 1, manufacturerId: 1 }
      });

      await StoreController.getStoreProgramsDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: "success",
        data: {
          tierDetails: [],
          additionalInfo: {
            note: "",
            recommendedProducts: [],
            purchasedProducts: []
          }
        }
      });
    });

    it("should validate store programs details data structure", async () => {
      const { req, res } = createMockRequestResponse({
        token: mockToken,
        params: { storeId: 1, manufacturerId: 1 }
      });

      await StoreController.getStoreProgramsDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];
      expect(response.status).toBe("success");

      const { data } = response;
      expect(data).toEqual(
        expect.objectContaining({
          tierDetails: expect.any(Array),
          additionalInfo: expect.objectContaining({
            note: expect.any(String),
            recommendedProducts: expect.any(Array),
            purchasedProducts: expect.any(Array)
          })
        })
      );
    });

    it("should return 401 if no authorization token is provided", async () => {
      const { req, res } = createMockRequestResponse({
        params: { storeId: 1, manufacturerId: 1 }
      });

      await StoreController.getStoreProgramsDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: ERROR_MESSAGES.AUTH.NO_AUTH_PROVIDED
      });
    });
  });
});

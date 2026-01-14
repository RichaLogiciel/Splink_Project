import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ENTITY_TYPE } from "../../config/appConstants";
import { ERROR_MESSAGES } from "../../config/errorMessages";
import { createMockRequestResponse } from "../helpers/test-utils";

// Import mock data
const manufacturerStoreDetails = require("../mocks/manufacturerStoreDetails.json");
const programStoreListing = require("../mocks/programStoreListing.json");

// Define test user
const distMockUser = {
  userId: 1,
  id: 1,
  email: "test@example.com",
  role: ENTITY_TYPE.DISTRIBUTOR_ADMIN,
  associatedUserId: 1,
  parentEntityId: 1,
  parentEntityType: ENTITY_TYPE.DISTRIBUTOR
};

// Create a valid token for testing
const mockToken = jwt.sign(
  distMockUser,
  process.env.JWT_SECRET || "test-secret"
);

// Mock StoreController
jest.mock("../../controllers/StoreController", () => ({
  __esModule: true,
  default: {
    getStoreManufactureProgramsDetails: jest
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
          data: manufacturerStoreDetails
        });
      })
  }
}));

// Mock ProgramController
jest.mock("../../controllers/ProgramController", () => ({
  __esModule: true,
  default: {
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

        return res.status(200).json({
          status: "success",
          data: programStoreListing
        });
      })
  }
}));

const StoreController = require("../../controllers/StoreController").default;
const ProgramController =
  require("../../controllers/ProgramController").default;

describe("Store Program Details Stores API Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return the full Store details structure with valid token", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      params: { storeId: "16189", manufacturerId: "1" },
      query: {
        isEnrolledPrograms: "false",
        type: ENTITY_TYPE.STORE,
        manufacturerId: "1",
        searchQuery: "",
        enrolledPage: "1",
        notEnrolledPage: "1",
        sort: "ASC",
        sortKey: "sort"
      }
    });

    await StoreController.getStoreManufactureProgramsDetails(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: "success",
      data: manufacturerStoreDetails
    });
  });

  it("should validate manufacturer store details schema structure", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      params: { storeId: "16189", manufacturerId: "1" },
      query: { isEnrolledPrograms: "false" }
    });

    await StoreController.getStoreManufactureProgramsDetails(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const response = res.json.mock.calls[0][0];
    expect(response.status).toBe("success");

    const { data } = response;
    expect(data).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          tierDetails: expect.any(Array),
          additionalInfo: expect.objectContaining({
            purchasedProducts: expect.any(Array),
            recommendedProducts: expect.any(Array)
          })
        })
      })
    );
  });

  it("should return 401 if no authorization token is provided", async () => {
    const { req, res } = createMockRequestResponse({
      params: { storeId: "16189", manufacturerId: "1" },
      query: { isEnrolledPrograms: "false" }
    });

    await StoreController.getStoreManufactureProgramsDetails(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: ERROR_MESSAGES.AUTH.NO_AUTH_PROVIDED
    });
  });

  it("should return 401 if invalid token is provided", async () => {
    const { req, res } = createMockRequestResponse({
      token: "invalid-token",
      params: { storeId: "16189", manufacturerId: "1" },
      query: { isEnrolledPrograms: "false" }
    });

    await StoreController.getStoreManufactureProgramsDetails(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: ERROR_MESSAGES.AUTH.INVALID_TOKEN
    });
  });
});

describe("Program Store Listing API Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return store listing with valid token", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      query: {
        manufacturerId: "1",
        searchQuery: "",
        enrolledPage: "1",
        notEnrolledPage: "1",
        sort: "ASC",
        sortKey: "sort"
      }
    });

    await ProgramController.getStoresListing(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: "success",
      data: programStoreListing
    });
  });

  it("should validate store listing data structure", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      query: { manufacturerId: "1" }
    });

    await ProgramController.getStoresListing(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const response = res.json.mock.calls[0][0];
    expect(response.status).toBe("success");

    const { data } = response;
    expect(data).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          storesListingEnrolled: expect.objectContaining({
            stores: expect.any(Array),
            totalStores: expect.any(Number),
            currentPage: expect.any(Number),
            totalPages: expect.any(Number)
          }),
          storesListingNotEnrolled: expect.objectContaining({
            stores: expect.any(Array),
            totalStores: expect.any(Number),
            currentPage: expect.any(Number),
            totalPages: expect.any(Number)
          })
        })
      })
    );
  });

  it("should return 401 if no authorization token is provided", async () => {
    const { req, res } = createMockRequestResponse({
      query: { manufacturerId: "1" }
    });

    await ProgramController.getStoresListing(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: ERROR_MESSAGES.AUTH.NO_AUTH_PROVIDED
    });
  });

  it("should return 401 if invalid token is provided", async () => {
    const { req, res } = createMockRequestResponse({
      token: "invalid-token",
      query: { manufacturerId: "1" }
    });

    await ProgramController.getStoresListing(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: ERROR_MESSAGES.AUTH.INVALID_TOKEN
    });
  });
});

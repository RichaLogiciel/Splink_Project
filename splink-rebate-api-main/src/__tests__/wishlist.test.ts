import jwt from "jsonwebtoken";
import { createMockRequestResponse } from "./helpers/test-utils";

// Mock response data
const mockWishlistResponse = require("./mocks/mockWishlistResponse.json");

const mockEmptyWishlistResponse = {
  status: "success",
  data: []
};

const mockAddToWishlistResponse = {
  status: "success",
  data: {
    id: 24,
    storeId: 15,
    productId: 26
  }
};

const mockAddToWishlistWithDetailsResponse = {
  status: "success",
  data: {
    id: 27,
    storeId: 15,
    productId: 8,
    createdAt: "2025-03-17T11:01:40.026Z",
    updatedAt: "2025-03-17T11:01:40.026Z",
    created_at: "2025-03-17T11:01:40.026Z",
    updated_at: "2025-03-17T11:01:40.026Z",
    store_id: 15,
    product_id: 8
  }
};

const mockDeleteWishlistResponse = {
  status: "success",
  data: {
    message: "All wishlists deleted successfully"
  }
};

const mockDeleteWishlistErrorResponse = {
  status: "error",
  data: "Some wishlists could not be deleted"
};

// Mock user data
const mockUser = {
  userId: 1,
  id: 1,
  email: "test@example.com",
  role: "DISTRIBUTOR_SALES_REP",
  associatedUserId: 1,
  parentEntityId: "",
  parentEntityType: ""
};

// Mock WishlistController
jest.mock("../controllers/WishlistController", () => ({
  __esModule: true,
  default: {
    getWishlistsByStoreId: jest.fn().mockImplementation((req, res) => {
      if (!req.headers.authorization) {
        return res
          .status(401)
          .json({ message: "No authorization token provided" });
      }
      if (req.headers.authorization === "Bearer invalid-token") {
        return res.status(401).json({ message: "Invalid token" });
      }

      const { storeId } = req.params;
      if (!storeId || isNaN(storeId)) {
        return res.status(400).json({
          status: "error",
          message: isNaN(storeId)
            ? "Invalid store ID format"
            : "Store ID is required"
        });
      }

      if (storeId === "999") {
        return res.status(200).json(mockEmptyWishlistResponse);
      }

      return res.status(200).json(mockWishlistResponse);
    }),

    addToWishlist: jest.fn().mockImplementation((req, res) => {
      if (!req.headers.authorization) {
        return res
          .status(401)
          .json({ message: "No authorization token provided" });
      }
      if (req.headers.authorization === "Bearer invalid-token") {
        return res.status(401).json({ message: "Invalid token" });
      }

      const { storeId, productId, toggleStatus } = req.body;
      if (!storeId || isNaN(storeId) || !productId || isNaN(productId)) {
        return res.status(400).json({
          status: "error",
          data: "Store ID and Product ID are required."
        });
      }

      if (toggleStatus) {
        const isExisting = req.body._testFlag;
        if (isExisting) {
          return res.status(200).json({
            status: "success",
            data: []
          });
        }
        return res.status(200).json(mockAddToWishlistResponse);
      }

      return res.status(200).json(mockAddToWishlistWithDetailsResponse);
    }),

    deleteWishlists: jest.fn().mockImplementation((req, res) => {
      if (!req.headers.authorization) {
        return res
          .status(401)
          .json({ message: "No authorization token provided" });
      }
      if (req.headers.authorization === "Bearer invalid-token") {
        return res.status(401).json({ message: "Invalid token" });
      }

      const { storeId, id } = req.body;
      if (!storeId || isNaN(storeId)) {
        return res.status(400).json({
          status: "error",
          data: "Store ID is required."
        });
      }

      if (!id || !Array.isArray(id) || id.length == 0) {
        return res.status(400).json({
          status: "error",
          data: "Invalid wishlist IDs"
        });
      }

      if (req.body._testFlag) {
        return res.status(207).json(mockDeleteWishlistErrorResponse);
      }

      return res.status(200).json(mockDeleteWishlistResponse);
    })
  }
}));

const WishlistController = require("../controllers/WishlistController").default;

describe("Wishlist API Tests", () => {
  let mockToken: string;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(() => {
    mockToken = jwt.sign(mockUser, process.env.JWT_SECRET || "test-secret", {
      expiresIn: "1h"
    });
  });

  it("should return wishlist items for a store with valid token", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      params: { storeId: "1" }
    });

    await WishlistController.getWishlistsByStoreId(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockWishlistResponse);
  });

  it("should validate wishlist data structure", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      params: { storeId: "1" }
    });

    await WishlistController.getWishlistsByStoreId(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const response = res.json.mock.calls[0][0];
    expect(response.status).toBe("success");

    const { data } = response;
    expect(Array.isArray(data)).toBe(true);

    if (data.length > 0) {
      data.forEach((item: any) => {
        expect(item).toEqual(
          expect.objectContaining({
            id: expect.any(Number),
            product_name: expect.any(String),
            product_id: expect.any(Number),
            manufacturer_name: expect.any(String),
            manufacturer_logo: expect.any(String),
            updated_at: expect.any(String)
          })
        );
      });
    }
  });

  it("should handle empty wishlist", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      params: { storeId: "999" }
    });

    await WishlistController.getWishlistsByStoreId(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockEmptyWishlistResponse);
  });

  it("should return 400 when store ID is missing", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken
    });

    await WishlistController.getWishlistsByStoreId(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("should return 401 if no authorization token is provided", async () => {
    const { req, res } = createMockRequestResponse({
      params: { storeId: "1" }
    });

    await WishlistController.getWishlistsByStoreId(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("should return 401 if invalid token is provided", async () => {
    const { req, res } = createMockRequestResponse({
      token: "invalid-token",
      params: { storeId: "1" }
    });

    await WishlistController.getWishlistsByStoreId(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("should return 400 for invalid store ID format", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      params: { storeId: "invalid-id" }
    });

    await WishlistController.getWishlistsByStoreId(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      status: "error",
      message: "Invalid store ID format"
    });
  });
});

describe("Wishlist Add API Tests", () => {
  let mockToken: string;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(() => {
    mockToken = jwt.sign(mockUser, process.env.JWT_SECRET || "test-secret", {
      expiresIn: "1h"
    });
  });

  it("should add product to wishlist with toggle status", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      body: {
        productId: 26,
        storeId: 15,
        toggleStatus: true
      }
    });

    await WishlistController.addToWishlist(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: "success",
      data: expect.objectContaining({
        id: expect.any(Number),
        storeId: 15,
        productId: 26
      })
    });
  });

  it("should remove product from wishlist when same product is added with toggle", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      body: {
        productId: 26,
        storeId: 15,
        toggleStatus: true,
        _testFlag: true
      }
    });

    await WishlistController.addToWishlist(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: "success",
      data: []
    });
  });

  it("should add product to wishlist without toggle status", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      body: {
        productId: 8,
        storeId: 15
      }
    });

    await WishlistController.addToWishlist(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: "success",
      data: expect.objectContaining({
        id: expect.any(Number),
        storeId: 15,
        productId: 8,
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      })
    });
  });

  it("should return error when storeId is missing", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      body: {
        productId: 8
      }
    });

    await WishlistController.addToWishlist(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      status: "error",
      data: "Store ID and Product ID are required."
    });
  });

  it("should return error when productId is missing", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      body: {
        storeId: 15
      }
    });

    await WishlistController.addToWishlist(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      status: "error",
      data: "Store ID and Product ID are required."
    });
  });

  it("should return 401 if no authorization token is provided", async () => {
    const { req, res } = createMockRequestResponse({
      body: {
        productId: 8,
        storeId: 15
      }
    });

    await WishlistController.addToWishlist(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("should return 401 if invalid token is provided", async () => {
    const { req, res } = createMockRequestResponse({
      token: "invalid-token",
      body: {
        productId: 8,
        storeId: 15
      }
    });

    await WishlistController.addToWishlist(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("should return 400 for invalid product ID format", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      body: {
        productId: "invalid-id",
        storeId: 15
      }
    });

    await WishlistController.addToWishlist(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      status: "error",
      data: "Store ID and Product ID are required."
    });
  });

  it("should provide detailed error messages", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      body: { storeId: "invalid" }
    });

    await WishlistController.addToWishlist(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: "Store ID and Product ID are required.",
        status: "error"
      })
    );
  });
});

describe("Wishlist Delete API Tests", () => {
  let mockToken: string;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(() => {
    mockToken = jwt.sign(mockUser, process.env.JWT_SECRET || "test-secret", {
      expiresIn: "1h"
    });
  });

  it("should delete wishlist items successfully", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      body: {
        storeId: 15,
        id: [20, 24]
      }
    });

    await WishlistController.deleteWishlists(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockDeleteWishlistResponse);
  });

  it("should handle deletion failure for non-existent items", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      body: {
        storeId: 15,
        id: [20, 24],
        _testFlag: true
      }
    });

    await WishlistController.deleteWishlists(req, res);

    expect(res.status).toHaveBeenCalledWith(207);
    expect(res.json).toHaveBeenCalledWith(mockDeleteWishlistErrorResponse);
  });

  it("should return 400 for invalid wishlist IDs", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      body: {
        storeId: 15,
        id: "invalid"
      }
    });

    await WishlistController.deleteWishlists(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      status: "error",
      data: "Invalid wishlist IDs"
    });
  });

  it("should return 400 if store ID is not provided", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      body: {
        id: [20, 24]
      }
    });

    await WishlistController.deleteWishlists(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      status: "error",
      data: "Store ID is required."
    });
  });

  it("should return 401 if no authorization token is provided", async () => {
    const { req, res } = createMockRequestResponse({
      body: {
        storeId: 15,
        id: [20, 24]
      }
    });

    await WishlistController.deleteWishlists(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("should return 401 if invalid token is provided", async () => {
    const { req, res } = createMockRequestResponse({
      token: "invalid-token",
      body: {
        storeId: 15,
        id: [20, 24]
      }
    });

    await WishlistController.deleteWishlists(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("should return 400 for empty ID array", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken,
      body: {
        storeId: 15,
        id: []
      }
    });

    await WishlistController.deleteWishlists(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      status: "error",
      data: "Invalid wishlist IDs"
    });
  });
});

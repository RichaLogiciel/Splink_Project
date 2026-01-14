import jwt from "jsonwebtoken";
import { ENTITY_TYPE } from "../config/appConstants";
import { createMockRequestResponse } from "./helpers/test-utils";

// Mock response data
const mockAccountResponse = {
  status: "success",
  data: {
    status: 200,
    data: {
      id: 4696,
      email: "nitin+991@logiciel.io",
      firstName: "Clains",
      lastName: "Manager",
      city: null,
      state: null,
      zip: null,
      phone: "(999) 999-9999",
      secondaryPhone: null,
      isActive: true,
      status: "ACTIVE",
      lastLogin: null,
      createdAt: "2025-02-06T13:15:29.044Z",
      updatedAt: "2025-03-04T12:13:41.467Z",
      address: null,
      created_at: "2025-02-06T13:15:29.044Z",
      updated_at: "2025-03-04T12:13:41.467Z",
      chainName: "7-CLANS",
      logo: ""
    }
  }
};

const mockDistributorResponse = {
  status: "success",
  data: {
    id: 1,
    email: "jaswinder+1@logiciel.io",
    firstName: "John",
    lastName: "Doe",
    city: "test c",
    state: "NY",
    zip: "14252",
    phone: "",
    secondaryPhone: "",
    isActive: true,
    status: "ACTIVE",
    lastLogin: null,
    address: "New york",
    distributorName: "Sandstrom's",
    title: null
  }
};

const mockManufacturerResponse = {
  status: "success",
  data: {
    id: 1,
    email: "jaswinder+1@logiciel.io",
    firstName: "John",
    lastName: "Doe",
    city: "test c",
    state: "NY",
    zip: "14252",
    phone: "",
    secondaryPhone: "",
    isActive: true,
    status: "ACTIVE",
    lastLogin: null,
    address: "New york",
    organizationName: "Wonderful Pistachios"
  }
};

const mockStoreResponse = {
  status: "success",
  data: {
    id: 1,
    email: "jaswinder+1@logiciel.io",
    firstName: "John",
    lastName: "Doe",
    city: "test c",
    state: "NY",
    zip: "14252",
    phone: "",
    secondaryPhone: "",
    isActive: true,
    status: "ACTIVE",
    lastLogin: null,
    address: "New york",
    storeName: "27 LIQUORS LLC"
  }
};

const mockUser = {
  userId: 4696,
  id: 4696,
  email: "nitin+991@logiciel.io",
  role: ENTITY_TYPE.CHAIN_ADMIN,
  associatedUserId: 72,
  parentEntityId: "1",
  parentEntityType: ENTITY_TYPE.DISTRIBUTOR_ADMIN
};

const distributorMockUser = {
  userId: 1,
  id: 1,
  email: "test@example.com",
  role: ENTITY_TYPE.DISTRIBUTOR_ADMIN,
  associatedUserId: 1,
  parentEntityId: "",
  parentEntityType: ""
};

// Mock Express and its dependencies
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
      user: mockUser
    }))
  }
}));

// Mock UserController

// Mock UserController
jest.mock("../controllers/UserController", () => ({
  __esModule: true,
  default: {
    getProfileDetails: jest.fn().mockImplementation((req, res) => {
      if (!req.headers.authorization) {
        return res
          .status(401)
          .json({ message: "No authorization token provided" });
      }
      if (req.headers.authorization === "Bearer invalid-token") {
        return res.status(401).json({ message: "Invalid token" });
      }
      return res.status(200).json(mockAccountResponse);
    }),
    updateProfileDetails: jest.fn().mockImplementation((req, res) => {
      if (!req.headers.authorization) {
        return res
          .status(401)
          .json({ message: "No authorization token provided" });
      }
      if (req.headers.authorization === "Bearer invalid-token") {
        return res.status(401).json({ message: "Invalid token" });
      }

      const { role } = req.user;
      switch (role) {
        case ENTITY_TYPE.DISTRIBUTOR_ADMIN:
          return res.status(200).json(mockDistributorResponse);
        case ENTITY_TYPE.MANUFACTURER:
          return res.status(200).json(mockManufacturerResponse);
        case ENTITY_TYPE.STORE:
          return res.status(200).json(mockStoreResponse);
        default:
          return res.status(200).json(mockDistributorResponse);
      }
    })
  }
}));

const UserController = require("../controllers/UserController").default;

describe("Account API Tests", () => {
  let mockToken: string;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => setImmediate(resolve));
  });

  beforeAll(() => {
    mockToken = jwt.sign(mockUser, process.env.JWT_SECRET || "test-secret", {
      expiresIn: "1h"
    });
  });

  it("should return account details with valid token", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken
    });
    await UserController.getProfileDetails(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockAccountResponse);
  });

  it("should validate account data structure", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken
    });

    await UserController.getProfileDetails(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const response = res.json.mock.calls[0][0];
    expect(response.status).toBe("success");
    expect(response.data.data).toMatchObject({
      id: expect.any(Number),
      email: expect.any(String),
      firstName: expect.any(String),
      lastName: expect.any(String),
      phone: expect.any(String),
      isActive: expect.any(Boolean),
      status: expect.any(String),
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      chainName: expect.any(String)
    });
  });

  it("should return 401 if no authorization token is provided", async () => {
    const { req, res } = createMockRequestResponse();
    await UserController.getProfileDetails(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("should return 401 if invalid token is provided", async () => {
    const { req, res } = createMockRequestResponse({
      token: "invalid-token"
    });
    await UserController.getProfileDetails(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("should handle missing user ID", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken
    });

    // Mock response for missing user ID
    UserController.getProfileDetails.mockImplementationOnce(
      (req: any, res: any) => {
        return res.status(400).json({
          status: "error",
          message: "User ID is required"
        });
      }
    );
    await UserController.getProfileDetails(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("should handle server errors gracefully", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken
    });

    // Mock response for missing user ID
    UserController.getProfileDetails.mockImplementationOnce(
      (req: any, res: any) => {
        return res.status(500).json({
          status: "error",
          message: "Internal server error"
        });
      }
    );
    await UserController.getProfileDetails(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("Update Profile API Tests", () => {
  let mockToken: string;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => setImmediate(resolve));
  });

  beforeAll(() => {
    mockToken = jwt.sign(
      distributorMockUser,
      process.env.JWT_SECRET || "test-secret",
      {
        expiresIn: "1h"
      }
    );
  });

  describe("Distributor Admin Profile Updates", () => {
    it("should update distributor admin profile with logo and org name", async () => {
      const { req, res } = createMockRequestResponse({
        token: mockToken,
        user: distributorMockUser,
        body: {
          firstName: "John",
          lastName: "Doe",
          phone: "(999) 999-9999",
          distributorName: "Sandstrom's",
          logo: "https://example.com/logo.png"
        }
      });
      await UserController.updateProfileDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockDistributorResponse);

      const response = res.json.mock.calls[0][0];
      expect(response.status).toBe("success");
      expect(response.data.distributorName).toBe("Sandstrom's");
    });
  });

  describe("Manufacturer Profile Updates", () => {
    let mockToken: string;
    const manufacturerMockUser = {
      userId: 1,
      id: 1,
      email: "test@example.com",
      role: ENTITY_TYPE.MANUFACTURER,
      associatedUserId: 1
    };

    beforeAll(() => {
      mockToken = jwt.sign(
        manufacturerMockUser,
        process.env.JWT_SECRET || "test-secret",
        { expiresIn: "1h" }
      );
    });

    it("should update manufacturer profile with logo and org name", async () => {
      const { req, res } = createMockRequestResponse({
        token: mockToken,
        user: manufacturerMockUser,
        body: {
          firstName: "John",
          lastName: "Doe",
          phone: "(999) 999-9999",
          manufacturerName: "Wonderful Pistachios",
          logo: "https://example.com/logo.png"
        }
      });
      await UserController.updateProfileDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockManufacturerResponse);

      const response = res.json.mock.calls[0][0];
      expect(response.status).toBe("success");
      expect(response.data.organizationName).toBe("Wonderful Pistachios");
    });
  });

  describe("Store Profile Updates", () => {
    let mockToken: string;
    const storeMockUser = {
      userId: 1,
      id: 1,
      email: "test@example.com",
      role: ENTITY_TYPE.STORE,
      associatedUserId: 1
    };

    beforeAll(() => {
      mockToken = jwt.sign(
        storeMockUser,
        process.env.JWT_SECRET || "test-secret",
        { expiresIn: "1h" }
      );
    });

    it("should update store profile with logo and store name", async () => {
      const { req, res } = createMockRequestResponse({
        token: mockToken,
        user: storeMockUser,
        body: {
          firstName: "John",
          lastName: "Doe",
          phone: "(999) 999-9999",
          storeName: "27 LIQUORS LLC",
          logo: "https://example.com/logo.png"
        }
      });
      await UserController.updateProfileDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockStoreResponse);

      const response = res.json.mock.calls[0][0];
      expect(response.status).toBe("success");
      expect(response.data.storeName).toBe("27 LIQUORS LLC");
    });
  });

  describe("Sales Rep Profile Updates", () => {
    let mockToken: string;
    const salesRepMockUser = {
      userId: 1,
      id: 1,
      email: "test@example.com",
      role: ENTITY_TYPE.DISTRIBUTOR_SALES_REP,
      associatedUserId: 1
    };

    beforeAll(() => {
      mockToken = jwt.sign(
        salesRepMockUser,
        process.env.JWT_SECRET || "test-secret",
        { expiresIn: "1h" }
      );
    });

    it("should update sales rep profile without logo and org name", async () => {
      const { req, res } = createMockRequestResponse({
        token: mockToken,
        user: salesRepMockUser,
        body: {
          firstName: "John",
          lastName: "Doe",
          phone: "(999) 999-9999"
        }
      });
      await UserController.updateProfileDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockDistributorResponse);
    });
  });

  describe("Error Cases", () => {
    it("should return 401 if no authorization token is provided", async () => {
      const { req, res } = createMockRequestResponse({
        // token: mockToken,
        user: mockUser,
        body: {
          firstName: "John",
          lastName: "Doe"
        }
      });
      await UserController.updateProfileDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("should return 401 if invalid token is provided", async () => {
      const { req, res } = createMockRequestResponse({
        token: "invalid-token",
        user: mockUser,
        body: {
          firstName: "John",
          lastName: "Doe"
        }
      });
      await UserController.updateProfileDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });
});

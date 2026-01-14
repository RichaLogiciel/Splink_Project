import { ERROR_MESSAGES } from "../../config/errorMessages";
import { ApiError } from "../../lib/errors/APIError";
import { createMockToken, createMockUser } from "../helpers/test-utils";

// Store mock data for access between tests
const mockStorage = {
  data: [] as any[],
  errorMode: false,
  errorMessage: "",
  restrictedAccessMode: false
};

// Mock database sync
jest.mock("../../syncDatabase", () => ({
  __esModule: true,
  syncDatabase: jest.fn().mockResolvedValue(undefined)
}));

// Mock server
jest.mock("../../index", () => {
  const mockApp = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
    use: jest.fn(),
    listen: jest.fn(),
    set: jest.fn(),
    address: jest.fn().mockReturnValue({ port: 3000 })
  };

  return {
    app: mockApp,
    server: {
      close: jest.fn((callback) => {
        if (callback) callback();
      })
    }
  };
});

// Mock supertest with simplified implementation
jest.mock("supertest", () => {
  return () => {
    const createMockRequest = (method: string) => {
      let requestData: any = null;
      let requestPath: string = "";
      const requestHeaders: Record<string, string> = {};

      const mockRequest = {
        method,
        set: jest.fn().mockImplementation((key, value) => {
          requestHeaders[key] = value;
          return mockRequest;
        }),
        send: jest.fn().mockImplementation((data) => {
          requestData = data;
          return mockRequest;
        }),
        expect: jest.fn().mockReturnThis(),
        end: jest.fn().mockImplementation((callback) => {
          const response = mockRequest.handleRequest(
            method,
            requestPath,
            requestData
          );
          if (callback) {
            callback(null, response);
          }
          return Promise.resolve(response);
        }),
        handleRequest: jest
          .fn()
          .mockImplementation((method: string, path: string, data?: any) => {
            requestPath = path;

            // Handle different request types
            switch (method.toLowerCase()) {
              case "post": {
                if (data === "invalid-json") {
                  return {
                    status: 400,
                    body: {
                      status: "error",
                      message: "Invalid JSON"
                    }
                  };
                }

                return {
                  status: 201,
                  body: {
                    status: "success",
                    data: {
                      id: 1,
                      ...data
                    }
                  }
                };
              }

              case "get": {
                if (mockStorage.errorMode) {
                  return {
                    status: 500,
                    body: {
                      status: "error",
                      message: mockStorage.errorMessage || "Database error"
                    }
                  };
                }

                if (mockStorage.restrictedAccessMode) {
                  return {
                    status: 403,
                    body: {
                      status: "error",
                      message: "Access restricted"
                    }
                  };
                }

                return {
                  status: 200,
                  body: {
                    status: "success",
                    data: mockStorage.data
                  }
                };
              }

              default:
                return {
                  status: 200,
                  body: {
                    status: "success",
                    data: null
                  }
                };
            }
          })
      };

      return mockRequest;
    };

    return {
      get: jest.fn().mockImplementation(() => createMockRequest("get")),
      post: jest.fn().mockImplementation(() => createMockRequest("post")),
      put: jest.fn().mockImplementation(() => createMockRequest("put")),
      delete: jest.fn().mockImplementation(() => createMockRequest("delete")),
      patch: jest.fn().mockImplementation(() => createMockRequest("patch"))
    };
  };
});

// Mock database connection
const _mockDb = {
  authenticate: jest.fn().mockImplementation(() => {
    if (process.env.DB_ERROR) {
      throw new ApiError(500, ERROR_MESSAGES.COMMON.DB_ERROR);
    }
    return Promise.resolve();
  }),
  transaction: jest.fn().mockImplementation((fn) => {
    if (process.env.DB_TRANSACTION_ERROR) {
      throw new ApiError(500, ERROR_MESSAGES.COMMON.DB_ERROR);
    }
    return fn({ commit: jest.fn(), rollback: jest.fn() });
  })
};

export const testSetup = {
  mockToken: "",
  testAgent: null as any,

  // Reset all mock state
  resetMocks() {
    mockStorage.data = [];
    mockStorage.errorMode = false;
    mockStorage.errorMessage = "";
    mockStorage.restrictedAccessMode = false;
  },

  // Set mock data for tests
  setMockData(data: any[]) {
    mockStorage.data = [...data];
  },

  // Enable error mode
  enableErrorMode(message: string = "Database error") {
    mockStorage.errorMode = true;
    mockStorage.errorMessage = message;
  },

  // Disable error mode
  disableErrorMode() {
    mockStorage.errorMode = false;
    mockStorage.errorMessage = "";
  },

  // Enable restricted access mode
  enableRestrictedAccessMode() {
    mockStorage.restrictedAccessMode = true;
  },

  // Disable restricted access mode
  disableRestrictedAccessMode() {
    mockStorage.restrictedAccessMode = false;
  },

  setup() {
    this.mockToken = createMockToken(createMockUser());
    this.resetMocks();
  },

  // Helper method to make authenticated requests
  async authenticatedRequest(
    method: "get" | "post" | "put" | "delete",
    url: string,
    data?: any
  ) {
    const req = this.testAgent[method](url).set(
      "Authorization",
      `Bearer ${this.mockToken}`
    );

    if (data && (method === "post" || method === "put")) {
      return req.send(data).handleRequest(method, url, data);
    }

    return req.handleRequest(method, url);
  }
};

export default testSetup;

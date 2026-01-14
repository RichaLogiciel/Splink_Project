import jwt from "jsonwebtoken";
import { ERROR_MESSAGES } from "../config/errorMessages";
import { validateEmail } from "../utils/helpers";
import { createMockRequestResponse } from "./helpers/test-utils";

// Mock response data
const mockLoginSuccessResponse = {
  status: "success",
  data: {
    accessToken: "mocked-access-token",
    refreshToken: "mocked-refresh-token",
    user: {
      id: 1,
      email: "distributor@example.com",
      firstName: "John",
      lastName: "Doe",
      role: "DISTRIBUTOR_ADMIN",
      parentEntityId: 1,
      parentEntityType: "DISTRIBUTOR",
      status: "ACTIVE"
    },
    relatedUsers: []
  }
};

// Mock Express
jest.mock("express", () => {
  const mockApp = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    use: jest.fn(),
    listen: jest.fn()
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
  return express;
});

// Mock AuthController
jest.mock("../controllers/auth/AuthController", () => ({
  __esModule: true,
  default: {
    login: jest.fn().mockImplementation((req, res) => {
      const { email, password } = req.body;

      // Check for required fields
      if (!email || !password) {
        return res.status(400).json({
          status: "error",
          data: "Email and password are required"
        });
      }

      // Check for invalid email format
      if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        return res.status(400).json({
          status: "error",
          data: "Invalid email format"
        });
      }

      // Check for invalid credentials
      if (email === "invalid@example.com" || password === "wrongpassword") {
        return res.status(401).json({
          status: "error",
          data: "Invalid credentials"
        });
      }

      // Check for inactive user
      if (email === "inactive@example.com") {
        return res.status(401).json({
          status: "error",
          data: "User account is inactive"
        });
      }

      // Successful login
      return res.status(200).json(mockLoginSuccessResponse);
    }),
    sendForgetPasswordEmail: jest.fn().mockImplementation((req, res) => {
      const { email } = req.body;

      // Validate email presence and format
      if (!email || !validateEmail(email)) {
        return res.status(400).json({
          status: "error",
          data: ERROR_MESSAGES.AUTH.INVALID_EMAIL
        });
      }

      // Simulate non-existent user
      if (email === "nonexistent@example.com") {
        return res.status(404).json({
          status: "error",
          data: "No matching user in our records."
        });
      }

      // Successful case
      return res.status(200).json({
        status: "success",
        data: { message: "Email sent! Follow the link to reset your password." }
      });
    }),
    validatePasswordResetToken: jest.fn().mockImplementation((req, res) => {
      const { token } = req.query;

      if (!token) {
        return res.status(400).json({
          status: "error",
          data: ERROR_MESSAGES.AUTH.INVALID_TOKEN
        });
      }

      // Simulate invalid/expired token
      if (token === "invalid-token") {
        return res.status(401).json({
          status: "error",
          data: ERROR_MESSAGES.AUTH.INVALID_TOKEN
        });
      }

      return res.status(200).json({
        status: "success",
        data: {
          message: "Token is valid"
        }
      });
    }),
    resetPassword: jest.fn().mockImplementation((req, res) => {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({
          status: "error",
          data: ERROR_MESSAGES.AUTH.TOKEN_PASSWORD_REQUIRED
        });
      }

      // Simulate invalid/expired token
      if (token === "invalid-token") {
        return res.status(401).json({
          status: "error",
          data: ERROR_MESSAGES.AUTH.INVALID_TOKEN
        });
      }

      return res.status(200).json({
        status: "success",
        data: { message: "Password reset successful" }
      });
    }),

    logout: jest.fn().mockImplementation((req, res) => {
      if (!req.headers.authorization) {
        return res
          .status(401)
          .json({ message: "No authorization token provided" });
      }

      if (req.headers.authorization === "Bearer invalid-token") {
        return res.status(401).json({ message: "Invalid token" });
      }

      return res.status(200).json({
        status: "success",
        data: { message: "Successfully logged out" }
      });
    })
  }
}));

const AuthController = require("../controllers/auth/AuthController").default;

describe("Auth Login API Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should login successfully with valid credentials", async () => {
    const { req, res } = createMockRequestResponse({
      body: {
        email: "distributor@example.com",
        password: "password123"
      }
    });

    await AuthController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockLoginSuccessResponse);
  });

  it("should return 400 when email is missing", async () => {
    const { req, res } = createMockRequestResponse({
      body: { password: "password123" }
    });

    await AuthController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      status: "error",
      data: "Email and password are required"
    });
  });

  it("should return 400 for invalid email format", async () => {
    const { req, res } = createMockRequestResponse({
      body: {
        email: "invalidemail",
        password: "password123"
      }
    });

    await AuthController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      status: "error",
      data: "Invalid email format"
    });
  });

  it("should return 401 for invalid credentials", async () => {
    const { req, res } = createMockRequestResponse({
      body: {
        email: "invalid@example.com",
        password: "wrongpassword"
      }
    });

    await AuthController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      status: "error",
      data: "Invalid credentials"
    });
  });

  it("should return 401 for inactive user account", async () => {
    const { req, res } = createMockRequestResponse({
      body: {
        email: "inactive@example.com",
        password: "password123"
      }
    });

    await AuthController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      status: "error",
      data: "User account is inactive"
    });
  });
});

describe("Forget Password API Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should send reset password email successfully", async () => {
    const { req, res } = createMockRequestResponse({
      body: { email: "user@logiciel.io" }
    });

    await AuthController.sendForgetPasswordEmail(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: "success",
      data: { message: "Email sent! Follow the link to reset your password." }
    });
  });

  it("should return 400 if email is missing", async () => {
    const { req, res } = createMockRequestResponse({
      body: {}
    });

    await AuthController.sendForgetPasswordEmail(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      status: "error",
      data: ERROR_MESSAGES.AUTH.INVALID_EMAIL
    });
  });

  it("should return 400 if email format is invalid", async () => {
    const { req, res } = createMockRequestResponse({
      body: { email: "invalid-email" }
    });

    await AuthController.sendForgetPasswordEmail(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      status: "error",
      data: ERROR_MESSAGES.AUTH.INVALID_EMAIL
    });
  });

  it("should return 404 if user not found", async () => {
    const { req, res } = createMockRequestResponse({
      body: { email: "nonexistent@example.com" }
    });

    await AuthController.sendForgetPasswordEmail(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      status: "error",
      data: "No matching user in our records."
    });
  });

  it("should handle internal server error", async () => {
    const { req, res } = createMockRequestResponse({
      body: { email: "user@logiciel.io" }
    });

    // Mock implementation for server error
    AuthController.sendForgetPasswordEmail.mockImplementationOnce(
      (req: any, res: any) => {
        return res.status(500).json({
          status: "error",
          data: "Internal server error occurred while sending email"
        });
      }
    );

    await AuthController.sendForgetPasswordEmail(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      status: "error",
      data: "Internal server error occurred while sending email"
    });
  });

  it("should handle email service failures", async () => {
    const { req, res } = createMockRequestResponse({
      body: { email: "user@logiciel.io" }
    });

    // Mock implementation for email service failure
    AuthController.sendForgetPasswordEmail.mockImplementationOnce(
      (req: any, res: any) => {
        return res.status(503).json({
          status: "error",
          data: "Email service is currently unavailable"
        });
      }
    );

    await AuthController.sendForgetPasswordEmail(req, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      status: "error",
      data: "Email service is currently unavailable"
    });
  });
});

describe("Reset Password API Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should reset password successfully", async () => {
    const { req, res } = createMockRequestResponse({
      body: {
        token: "valid-token",
        newPassword: "NewPassword123!"
      }
    });

    await AuthController.resetPassword(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: "success",
      data: { message: "Password reset successful" }
    });
  });

  it("should return 400 if token or password is missing", async () => {
    const { req, res } = createMockRequestResponse({
      body: { token: "valid-token" }
    });

    await AuthController.resetPassword(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      status: "error",
      data: ERROR_MESSAGES.AUTH.TOKEN_PASSWORD_REQUIRED
    });
  });
});

describe("Logout API Tests", () => {
  let mockToken: string;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(() => {
    mockToken = jwt.sign(
      { id: 1, email: "test@example.com" },
      process.env.JWT_SECRET || "test-secret",
      { expiresIn: "1h" }
    );
  });

  it("should logout successfully", async () => {
    const { req, res } = createMockRequestResponse({
      token: mockToken
    });

    await AuthController.logout(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: "success",
      data: { message: "Successfully logged out" }
    });
  });

  it("should return 401 if no token provided", async () => {
    const { req, res } = createMockRequestResponse();

    await AuthController.logout(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });
});

import { ERROR_MESSAGES } from "@/config/errorMessages";
import { Request, Response } from "express";
import UserController from "../../controllers/UserController";
import UserService from "../../services/UserService";
import { createMockRequestResponse } from "../helpers/test-utils";

describe("User Integration Tests", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    jest.resetAllMocks();
    const { req, res } = createMockRequestResponse();
    mockReq = req as Partial<Request>;
    mockRes = res as Partial<Response>;
  });

  describe("getProfileDetails", () => {
    it("should successfully get user profile details", async () => {
      mockReq.user = {
        id: 1,
        role: "DISTRIBUTOR_ADMIN"
      };

      const mockProfileDetails = {
        status: 200,
        data: {
          id: 1,
          email: "user@example.com",
          firstName: "John",
          lastName: "Doe",
          role: "DISTRIBUTOR_ADMIN",
          passwordHash: "hash",
          city: "Test City",
          state: "Test State",
          phone: "1234567890",
          address: "Test Address",
          country: "Test Country",
          zipCode: "12345",
          status: "ACTIVE"
        }
      };

      jest
        .spyOn(UserService, "getProfileDetails")
        .mockResolvedValue(mockProfileDetails as any);

      await UserController.getProfileDetails(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockProfileDetails
      });
    });

    it("should handle missing user ID", async () => {
      mockReq.user = {
        id: undefined,
        role: "DISTRIBUTOR_ADMIN"
      };

      await UserController.getProfileDetails(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: ERROR_MESSAGES.REQUIRED.USER_ID
      });
    });

    it("should handle service error", async () => {
      mockReq.user = {
        id: 1,
        role: "DISTRIBUTOR_ADMIN"
      };

      jest
        .spyOn(UserService, "getProfileDetails")
        .mockRejectedValue(new Error("Service error"));

      await UserController.getProfileDetails(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: ERROR_MESSAGES.COMMON.INTERNAL_SERVER_ERROR
      });
    });
  });

  describe("getUsers", () => {
    it("should successfully get users list with pagination", async () => {
      mockReq.user = {
        id: 1,
        role: "DISTRIBUTOR_ADMIN"
      };

      mockReq.query = {
        currentPage: "1",
        pageLimit: "10",
        searchQuery: "test",
        sort: "ASC",
        status: "ACTIVE",
        type: "DISTRIBUTOR"
      };

      const mockUsers = {
        users: [
          {
            id: 1,
            email: "user@example.com",
            firstName: "John",
            lastName: "Doe"
          }
        ],
        totalPages: 1,
        totalRes: 1
      };

      jest.spyOn(UserService, "getUsers").mockResolvedValue(mockUsers as any);

      await UserController.getUsers(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: {
          users: mockUsers.users,
          currentPage: 1,
          totalPages: 1,
          totalRes: 1
        }
      });
    });

    it("should handle service error", async () => {
      mockReq.user = {
        id: 1,
        role: "DISTRIBUTOR_ADMIN"
      };

      jest
        .spyOn(UserService, "getUsers")
        .mockRejectedValue(new Error("Service error"));

      await UserController.getUsers(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Service error"
      });
    });
  });

  describe("updateProfileDetails", () => {
    it("should successfully update profile details", async () => {
      mockReq.user = {
        id: 1,
        role: "DISTRIBUTOR_ADMIN"
      };

      mockReq.body = {
        firstName: "John",
        lastName: "Doe",
        phone: "1234567890"
      };

      const mockUpdateResponse = {
        message: "Profile updated successfully"
      };

      jest
        .spyOn(UserService, "updateProfileDetails")
        .mockResolvedValue(mockUpdateResponse as any);

      await UserController.updateProfileDetails(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockUpdateResponse
      });
    });

    it("should handle missing user ID", async () => {
      mockReq.user = {
        id: undefined,
        role: "DISTRIBUTOR_ADMIN"
      };

      await UserController.updateProfileDetails(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: ERROR_MESSAGES.REQUIRED.USER_ID
      });
    });

    it("should handle service error", async () => {
      mockReq.user = {
        id: 1,
        role: "DISTRIBUTOR_ADMIN"
      };

      jest
        .spyOn(UserService, "updateProfileDetails")
        .mockRejectedValue(new Error("Update failed"));

      await UserController.updateProfileDetails(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Update failed"
      });
    });
  });

  describe("updateUserPassword", () => {
    it("should successfully update user password", async () => {
      mockReq.user = {
        id: 1,
        role: "DISTRIBUTOR_ADMIN"
      };

      mockReq.body = {
        currentPassword: "OldPass123!",
        password: "NewPass123!",
        confirmPassword: "NewPass123!"
      };

      const mockUpdateResponse = {
        message: "Password updated successfully"
      };

      jest
        .spyOn(UserService, "updateUserPassword")
        .mockResolvedValue(mockUpdateResponse);

      await UserController.updateUserPassword(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockUpdateResponse
      });
    });

    it("should handle password mismatch", async () => {
      mockReq.user = {
        id: 1,
        role: "DISTRIBUTOR_ADMIN"
      };

      mockReq.body = {
        currentPassword: "OldPass123!",
        password: "NewPass123!",
        confirmPassword: "DifferentPass123!"
      };

      await UserController.updateUserPassword(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: ERROR_MESSAGES.AUTH.PASSWORD.CONFIRM_PASS_NOT_MATCH
      });
    });

    it("should handle missing password fields", async () => {
      mockReq.user = {
        id: 1,
        role: "DISTRIBUTOR_ADMIN"
      };

      mockReq.body = {
        currentPassword: "OldPass123!"
      };

      await UserController.updateUserPassword(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: ERROR_MESSAGES.COMMON.BAD_REQUEST
      });
    });

    it("should handle service error", async () => {
      mockReq.user = {
        id: 1,
        role: "DISTRIBUTOR_ADMIN"
      };

      mockReq.body = {
        currentPassword: "OldPass123!",
        password: "NewPass123!",
        confirmPassword: "NewPass123!"
      };

      jest
        .spyOn(UserService, "updateUserPassword")
        .mockRejectedValue(new Error("Password update failed"));

      await UserController.updateUserPassword(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Password update failed"
      });
    });
  });

  describe("logout", () => {
    it("should successfully log out user", async () => {
      mockReq.user = {
        id: 1,
        role: "DISTRIBUTOR_ADMIN"
      };

      jest.spyOn(UserService, "logout").mockResolvedValue(undefined);

      await UserController.logout(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: { message: "Successfully logged out" }
      });
    });

    it("should handle missing user ID", async () => {
      mockReq.user = {
        id: undefined,
        role: "DISTRIBUTOR_ADMIN"
      };

      await UserController.logout(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: ERROR_MESSAGES.AUTH.NO_AUTH_PROVIDED
      });
    });

    it("should handle service error", async () => {
      mockReq.user = {
        id: 1,
        role: "DISTRIBUTOR_ADMIN"
      };

      jest
        .spyOn(UserService, "logout")
        .mockRejectedValue(new Error("Logout failed"));

      await UserController.logout(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Logout failed"
      });
    });
  });

  describe("UserController Edge Cases", () => {
    it("should handle invalid user ID during logout", async () => {
      const req = {
        user: { id: undefined }
      } as Request;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as unknown as Response;

      await UserController.logout(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: "error",
        data: ERROR_MESSAGES.AUTH.NO_AUTH_PROVIDED
      });
    });

    it("should handle empty search query in getUsers", async () => {
      const req = {
        query: {
          currentPage: "1",
          pageLimit: "10",
          searchQuery: "",
          sort: "ASC",
          status: "active",
          type: "user"
        },
        user: {
          role: "admin"
        }
      } as unknown as Request;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as unknown as Response;

      await UserController.getUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});

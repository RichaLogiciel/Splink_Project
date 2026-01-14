import { Request, Response } from "express";
import { createMockRequestResponse } from "../helpers/test-utils";

import { ENTITY_TYPE } from "@/config/appConstants";
import authController from "../../controllers/auth/AuthController";
import AuthService from "../../services/AuthService";

interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    associatedUserId: number;
    parentEntityId: number | null;
    parentEntityType: string | null;
  };
  loginTime: string;
  expiresIn: string;
  relatedUsers: [];
}

import { ERROR_MESSAGES } from "@/config/errorMessages";
import AuthRepository from "@/repositories/AuthRepository";
import LoginRelatedAccountsRepository from "@/repositories/LoginRelatedAccountsRepository";
import UserRepository from "@/repositories/UserRepository";
import { sendInvitationEmailFromDist } from "@/utils/nodeMailer";

describe("Auth Integration Tests", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    jest.resetAllMocks(); // Ensures clean mocks before each test

    const { req, res } = createMockRequestResponse();
    mockReq = req as Partial<Request>;
    mockRes = res as Partial<Response>;
  });

  describe("login", () => {
    it("should successfully login user with valid credentials", async () => {
      mockReq.body = {
        email: "test@example.com",
        password: "validPassword123"
      };
      const mockLoginResponse: AuthResult = {
        accessToken: "mock-access-token",
        refreshToken: "mock-refresh-token",
        user: {
          id: 1,
          email: "test@example.com",
          firstName: "John",
          lastName: "Doe",
          role: ENTITY_TYPE.DISTRIBUTOR_ADMIN,
          associatedUserId: 1,
          parentEntityId: null,
          parentEntityType: null
        },
        loginTime: new Date().toISOString(),
        expiresIn: "7d",
        relatedUsers: []
      };
      jest.spyOn(AuthService, "login").mockResolvedValue(mockLoginResponse);
      await authController.login(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: { ...mockLoginResponse, relatedUsers: [] }
      });
    });
    it("should handle missing email and password", async () => {
      mockReq.body = {};
      await authController.login(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: ERROR_MESSAGES.AUTH.EMAIL_PASSWORD_REQUIRED
      });
    });
    it("should handle invalid credentials", async () => {
      mockReq.body = {
        email: "test@example.com",
        password: "wrongPassword"
      };
      jest
        .spyOn(AuthService, "login")
        .mockRejectedValue(
          new Error(ERROR_MESSAGES.AUTH.AUTHENTICATION_FAILED)
        );
      await authController.login(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: ERROR_MESSAGES.AUTH.AUTHENTICATION_FAILED
      });
    });
    it("should handle service error during login", async () => {
      mockReq.body = {
        email: "test@example.com",
        password: "validPassword123"
      };
      jest
        .spyOn(AuthService, "login")
        .mockRejectedValue(new Error("Service error"));
      await authController.login(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Service error"
      });
    });
    it("should handle related users fetch error gracefully", async () => {
      mockReq.body = {
        email: "test@example.com",
        password: "validPassword123"
      };
      const mockLoginResponse: AuthResult = {
        accessToken: "mock-access-token",
        refreshToken: "mock-refresh-token",
        user: {
          id: 1,
          email: "test@example.com",
          firstName: "John",
          lastName: "Doe",
          role: ENTITY_TYPE.DISTRIBUTOR_ADMIN,
          associatedUserId: 1,
          parentEntityId: null,
          parentEntityType: null
        },
        loginTime: new Date().toISOString(),
        expiresIn: "7d",
        relatedUsers: []
      };
      jest.spyOn(AuthService, "login").mockResolvedValue(mockLoginResponse);
      jest
        .spyOn(UserRepository, "getRelatedUsersDetails")
        .mockRejectedValue(new Error("Failed to fetch related users"));
      await authController.login(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: { ...mockLoginResponse, relatedUsers: [] }
      });
    });
  });

  describe("loginWithID", () => {
    it("should successfully login user with ID", async () => {
      mockReq.params = { userID: "123" };
      mockReq.user = {
        id: 1,
        role: ENTITY_TYPE.SUPER_ADMIN
      };

      const mockLoginResponse: AuthResult = {
        accessToken: "mock-access-token",
        refreshToken: "mock-refresh-token",
        user: {
          id: 123,
          email: "test@example.com",
          firstName: "John",
          lastName: "Doe",
          role: ENTITY_TYPE.DISTRIBUTOR_ADMIN,
          associatedUserId: 123,
          parentEntityId: null,
          parentEntityType: null
        },
        loginTime: new Date().toISOString(),
        expiresIn: "7d",
        relatedUsers: []
      };

      const relatedAccountsSpy = jest
        .spyOn(LoginRelatedAccountsRepository, "getAllRelatedUserAccounts")
        .mockResolvedValue([]);

      // Mock other dependencies
      jest
        .spyOn(UserRepository, "getRelatedUsersDetails")
        .mockResolvedValue([]);

      jest
        .spyOn(AuthService, "loginWithID")
        .mockResolvedValue(mockLoginResponse);

      await authController.loginWithID(mockReq as Request, mockRes as Response);

      expect(relatedAccountsSpy).toHaveBeenCalled();
      expect(relatedAccountsSpy).toHaveBeenCalledWith(1);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: { ...mockLoginResponse, relatedUsers: [] }
      });
    });

    it("should handle missing userID", async () => {
      mockReq.params = {};
      mockReq.user = {
        id: 1,
        role: ENTITY_TYPE.SUPER_ADMIN
      };

      await authController.loginWithID(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: ERROR_MESSAGES.AUTH.USER_ID_REQUIRED
      });
    });

    it("should handle unauthorized access", async () => {
      mockReq.params = { userID: "123" };
      mockReq.user = {
        id: 1,
        role: ENTITY_TYPE.DISTRIBUTOR_ADMIN
      };

      const relatedAccountsSpy = jest
        .spyOn(LoginRelatedAccountsRepository, "getAllRelatedUserAccounts")
        .mockResolvedValue([]);

      jest
        .spyOn(UserRepository, "getRelatedUsersDetails")
        .mockResolvedValue([]);

      await authController.loginWithID(mockReq as Request, mockRes as Response);

      expect(relatedAccountsSpy).toHaveBeenCalled();
      expect(relatedAccountsSpy).toHaveBeenCalledWith(1);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: ERROR_MESSAGES.AUTH.UNAUTHORIZED
      });
    });

    it("should handle service error during loginWithID", async () => {
      mockReq.params = { userID: "123" };
      mockReq.user = {
        id: 1,
        role: ENTITY_TYPE.SUPER_ADMIN
      };

      const relatedAccountsSpy = jest
        .spyOn(LoginRelatedAccountsRepository, "getAllRelatedUserAccounts")
        .mockResolvedValue([]);
      jest
        .spyOn(AuthService, "loginWithID")
        .mockRejectedValue(new Error("Service error"));

      await authController.loginWithID(mockReq as Request, mockRes as Response);

      expect(relatedAccountsSpy).toHaveBeenCalled();
      expect(relatedAccountsSpy).toHaveBeenCalledWith(1);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Service error"
      });
    });

    it("should handle related users fetch error gracefully in loginWithID", async () => {
      mockReq.params = { userID: "123" };
      mockReq.user = {
        id: 1,
        role: ENTITY_TYPE.SUPER_ADMIN
      };

      const mockLoginResponse: AuthResult = {
        accessToken: "mock-access-token",
        refreshToken: "mock-refresh-token",
        user: {
          id: 123,
          email: "test@example.com",
          firstName: "John",
          lastName: "Doe",
          role: ENTITY_TYPE.DISTRIBUTOR_ADMIN,
          associatedUserId: 123,
          parentEntityId: null,
          parentEntityType: null
        },
        loginTime: new Date().toISOString(),
        expiresIn: "7d",
        relatedUsers: []
      };

      const relatedAccountsSpy = jest
        .spyOn(LoginRelatedAccountsRepository, "getAllRelatedUserAccounts")
        .mockResolvedValue([]);
      jest
        .spyOn(AuthService, "loginWithID")
        .mockResolvedValue(mockLoginResponse);
      jest
        .spyOn(UserRepository, "getRelatedUsersDetails")
        .mockResolvedValue([]);

      await authController.loginWithID(mockReq as Request, mockRes as Response);

      expect(relatedAccountsSpy).toHaveBeenCalled();
      expect(relatedAccountsSpy).toHaveBeenCalledWith(1);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: { ...mockLoginResponse, relatedUsers: [] }
      });
    });
  });

  describe("refreshToken", () => {
    it("should successfully refresh token", async () => {
      mockReq.body = { refreshToken: "valid-refresh-token" };

      const mockTokenResponse: AuthResult = {
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
        user: {
          id: 1,
          email: "test@example.com",
          firstName: "John",
          lastName: "Doe",
          role: ENTITY_TYPE.DISTRIBUTOR_ADMIN,
          associatedUserId: 1,
          parentEntityId: null,
          parentEntityType: null
        },
        loginTime: new Date().toISOString(),
        expiresIn: "7d",
        relatedUsers: []
      };

      jest
        .spyOn(AuthService, "refreshToken")
        .mockResolvedValue(mockTokenResponse);

      await authController.refreshToken(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockTokenResponse
      });
    });

    it("should handle missing refresh token", async () => {
      mockReq.body = {};

      await authController.refreshToken(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: ERROR_MESSAGES.AUTH.REFRESH_TOKEN_REQUIRED
      });
    });

    it("should handle service error during token refresh", async () => {
      mockReq.body = { refreshToken: "valid-refresh-token" };

      jest
        .spyOn(AuthService, "refreshToken")
        .mockRejectedValue(new Error("Service error"));

      await authController.refreshToken(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Service error"
      });
    });
  });

  describe("signup", () => {
    // it("should successfully signup a new user", async () => {
    //   mockReq.body = {
    //     email: "newuser@example.com",
    //     password: "password123",
    //     firstName: "John",
    //     lastName: "Doe"
    //   };

    //   jest.spyOn(AuthService, "signup").mockResolvedValue(undefined);

    //   await authController.signup(mockReq as Request, mockRes as Response);

    //   expect(mockRes.status).toHaveBeenCalledWith(200);
    //   expect(mockRes.json).toHaveBeenCalledWith({
    //     status: "success",
    //     data: { message: "Signup successful" }
    //   });
    // });

    it("should handle signup error", async () => {
      mockReq.body = {
        email: "newuser@example.com",
        password: "password123",
        firstName: "John",
        lastName: "Doe"
      };

      jest
        .spyOn(AuthService, "signup")
        .mockRejectedValue(new Error("Signup failed"));

      await authController.signup(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Signup failed"
      });
    });
  });

  describe("inviteUsers", () => {
    it("should successfully invite users", async () => {
      mockReq.user = {
        id: 1,
        role: ENTITY_TYPE.SUPER_ADMIN
      };
      mockReq.body = {
        emails: [
          { email: "user1@example.com", role: ENTITY_TYPE.DISTRIBUTOR_ADMIN }
        ]
      };

      jest.spyOn(AuthRepository, "findUserByEmail").mockResolvedValue(null);
      jest.spyOn(AuthRepository, "saveInvitation").mockResolvedValue();
      jest.spyOn(UserRepository, "getUserById").mockResolvedValue({
        status: 200,
        data: {
          id: 1,
          email: "test@example.com",
          passwordHash: "hashedPassword",
          firstName: "John",
          lastName: "Doe",
          city: "Test City",
          state: "Test State",
          phone: "(123) 456-7890",
          secondaryPhone: "(123) 456-7891",
          isActive: true,
          status: "ACTIVE",
          createdAt: new Date(),
          updatedAt: new Date(),
          distributorName: "Test Distributor",
          logo: "test-logo.png"
        }
      });
      jest.spyOn(
        { sendInvitationEmailFromDist },
        "sendInvitationEmailFromDist"
      );

      jest.spyOn(AuthService, "inviteUsers").mockResolvedValue(undefined);

      await authController.inviteUsers(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: { message: "Invitations sent successfully" }
      });
    });

    it("should handle missing user authentication", async () => {
      mockReq.user = undefined;
      mockReq.body = {
        emails: ["user1@example.com"]
      };

      await authController.inviteUsers(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: ERROR_MESSAGES.AUTH.NO_AUTH_PROVIDED
      });
    });

    it("should handle invalid invitation roles", async () => {
      mockReq.user = {
        id: 1,
        role: ENTITY_TYPE.DISTRIBUTOR_ADMIN
      };
      mockReq.body = {
        emails: [
          { email: "user1@example.com", role: ENTITY_TYPE.DISTRIBUTOR_ADMIN }
        ]
      };

      await authController.inviteUsers(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "You can invite only Distributor Executive, Sales Executive and Stores"
      });
    });

    it("should handle service error during user invitation", async () => {
      mockReq.user = {
        id: 1,
        role: ENTITY_TYPE.SUPER_ADMIN
      };
      mockReq.body = {
        emails: [
          {
            email: "user1@example.com",
            role: ENTITY_TYPE.DISTRIBUTOR_ADMIN
          }
        ]
      };

      jest
        .spyOn(AuthService, "inviteUsers")
        .mockRejectedValue(new Error("Service error"));

      await authController.inviteUsers(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Service error"
      });
    });
  });

  describe("inviteExistingUser", () => {
    it("should successfully invite existing user", async () => {
      mockReq.user = {
        id: 1,
        role: ENTITY_TYPE.SUPER_ADMIN
      };
      mockReq.body = {
        role: ENTITY_TYPE.DISTRIBUTOR_ADMIN
      };

      jest
        .spyOn(AuthService, "inviteExistingUser")
        .mockResolvedValue(undefined);

      await authController.inviteExistingUser(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: { message: "Invitations sent successfully" }
      });
    });

    it("should handle missing role", async () => {
      mockReq.user = {
        id: 1,
        role: ENTITY_TYPE.SUPER_ADMIN
      };
      mockReq.body = {};

      await authController.inviteExistingUser(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Role is required"
      });
    });
  });

  describe("cancelUserInvitation", () => {
    it("should successfully cancel user invitation", async () => {
      mockReq.user = {
        id: 1,
        role: ENTITY_TYPE.SUPER_ADMIN
      };
      mockReq.body = {
        userId: 123,
        chainId: 456
      };

      jest.spyOn(AuthService, "cancelUserInvite").mockResolvedValue(undefined);

      await authController.cancelUserInvitation(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: { message: "Invitations have been successfully canceled" }
      });
    });

    it("should handle cancellation error", async () => {
      mockReq.user = {
        id: 1,
        role: ENTITY_TYPE.SUPER_ADMIN
      };
      mockReq.body = {
        userId: 123,
        chainId: 456
      };

      jest
        .spyOn(AuthService, "cancelUserInvite")
        .mockRejectedValue(new Error("Failed to cancel invitation"));

      await authController.cancelUserInvitation(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(412);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Failed to cancel invitation"
      });
    });
  });

  describe("getInvitation", () => {
    it("should successfully get invitation details", async () => {
      mockReq.query = { token: "valid-token" };

      const mockInvitation = {
        id: 1,
        email: "test@example.com",
        role: ENTITY_TYPE.DISTRIBUTOR_ADMIN,
        token: "valid-token",
        status: "PENDING",
        expires_at: new Date(),
        invited_by: 1,
        created_at: new Date(),
        updated_at: new Date(),
        invited_user: null,
        completed_at: null,
        replace_email: null,
        deleted_at: null
      };

      jest
        .spyOn(AuthService, "getInvitation")
        .mockResolvedValue(mockInvitation as any);

      await authController.getInvitation(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: { data: mockInvitation }
      });
    });

    it("should handle invalid invitation token", async () => {
      mockReq.query = { token: "invalid-token" };

      jest
        .spyOn(AuthService, "getInvitation")
        .mockRejectedValue(new Error("Invalid invitation token"));

      await authController.getInvitation(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Invalid invitation token"
      });
    });
  });

  describe("getInvitedExistingUser", () => {
    it("should successfully get invited store user", async () => {
      mockReq.query = { token: "valid-token" };

      const mockInvitation = {
        id: 1,
        email: "store@example.com",
        role: ENTITY_TYPE.STORE,
        token: "valid-token",
        status: "PENDING",
        expires_at: new Date(),
        invited_by: 1,
        created_at: new Date(),
        updated_at: new Date(),
        invited_user: null,
        completed_at: null,
        replace_email: null,
        deleted_at: null
      };

      const mockStoreUser = {
        id: 1,
        email: "store@example.com",
        passwordHash: "hashedPassword",
        firstName: "John",
        lastName: "Doe",
        city: "Test City",
        state: "Test State",
        phone: "(123) 456-7890",
        secondaryPhone: "(123) 456-7891",
        isActive: true,
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date(),
        address: "Test Address",
        zip: "12345",
        refreshToken: "refresh-token"
      };

      jest
        .spyOn(AuthService, "getInvitation")
        .mockResolvedValue(mockInvitation as any);
      jest
        .spyOn(AuthService, "getInvitedStore")
        .mockResolvedValue(mockStoreUser as any);

      await authController.getInvitedExistingUser(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: { invitation: mockInvitation, user: mockStoreUser }
      });
    });

    it("should successfully get invited sales rep", async () => {
      mockReq.query = { token: "valid-token" };

      const mockInvitation = {
        id: 1,
        email: "sales@example.com",
        role: ENTITY_TYPE.DISTRIBUTOR_SALES_REP,
        token: "valid-token",
        status: "PENDING",
        expires_at: new Date(),
        invited_by: 1,
        created_at: new Date(),
        updated_at: new Date(),
        invited_user: 123,
        completed_at: null,
        replace_email: null,
        deleted_at: null
      };

      const mockSalesRep = {
        id: 123,
        email: "sales@example.com",
        passwordHash: "hashedPassword",
        firstName: "John",
        lastName: "Doe",
        city: "Test City",
        state: "Test State",
        phone: "(123) 456-7890",
        secondaryPhone: "(123) 456-7891",
        isActive: true,
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date(),
        address: "Test Address",
        zip: "12345",
        refreshToken: "refresh-token"
      };

      jest
        .spyOn(AuthService, "getInvitation")
        .mockResolvedValue(mockInvitation as any);
      jest
        .spyOn(AuthService, "getInvitedSalesRep")
        .mockResolvedValue(mockSalesRep as any);

      await authController.getInvitedExistingUser(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: { invitation: mockInvitation, user: mockSalesRep }
      });
    });

    it("should handle invalid invitation", async () => {
      mockReq.query = { token: "invalid-token" };

      jest
        .spyOn(AuthService, "getInvitation")
        .mockRejectedValue(new Error("Invalid invitation"));

      await authController.getInvitedExistingUser(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Invalid invitation"
      });
    });

    it("should handle service error when fetching invited user", async () => {
      mockReq.query = { token: "valid-token" };

      const mockInvitation = {
        id: 1,
        email: "store@example.com",
        role: ENTITY_TYPE.STORE,
        token: "valid-token",
        status: "PENDING",
        expires_at: new Date(),
        invited_by: 1,
        created_at: new Date(),
        updated_at: new Date(),
        invited_user: null,
        completed_at: null,
        replace_email: null,
        deleted_at: null
      };

      jest
        .spyOn(AuthService, "getInvitation")
        .mockResolvedValue(mockInvitation as any);
      jest
        .spyOn(AuthService, "getInvitedStore")
        .mockRejectedValue(new Error("Service error"));

      await authController.getInvitedExistingUser(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Service error"
      });
    });
  });

  describe("sendForgetPasswordEmail", () => {
    it("should successfully send reset password email", async () => {
      mockReq.body = {
        email: "test@example.com"
      };

      jest
        .spyOn(AuthService, "sendResetPasswordEmail")
        .mockResolvedValue(undefined);

      await authController.sendForgetPasswordEmail(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: { message: "Email sent! Follow the link to reset your password." }
      });
    });

    it("should handle invalid email format", async () => {
      mockReq.body = {
        email: "invalid-email"
      };

      await authController.sendForgetPasswordEmail(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: ERROR_MESSAGES.AUTH.INVALID_EMAIL
      });
    });

    it("should handle service error when sending reset password email", async () => {
      mockReq.body = {
        email: "test@example.com"
      };

      jest
        .spyOn(AuthService, "sendResetPasswordEmail")
        .mockRejectedValue(new Error("Service error"));

      await authController.sendForgetPasswordEmail(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Service error"
      });
    });
  });

  describe("validatePasswordResetToken", () => {
    it("should successfully validate reset token", async () => {
      mockReq.query = { token: "valid-token" };

      jest
        .spyOn(AuthService, "validatePasswordResetToken")
        .mockResolvedValue(true);

      await authController.validatePasswordResetToken(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: { message: "Token is valid" }
      });
    });

    it("should handle missing token", async () => {
      mockReq.query = {};

      await authController.validatePasswordResetToken(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: ERROR_MESSAGES.AUTH.INVALID_TOKEN
      });
    });

    it("should handle invalid token", async () => {
      mockReq.query = { token: "invalid-token" };

      jest
        .spyOn(AuthService, "validatePasswordResetToken")
        .mockResolvedValue(false);

      await authController.validatePasswordResetToken(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: ERROR_MESSAGES.AUTH.INVALID_TOKEN
      });
    });

    it("should handle service error when validating reset token", async () => {
      mockReq.query = { token: "valid-token" };

      jest
        .spyOn(AuthService, "validatePasswordResetToken")
        .mockRejectedValue(new Error("Service error"));

      await authController.validatePasswordResetToken(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Service error"
      });
    });
  });

  describe("replaceEmailInvite", () => {
    it("should successfully replace email invite", async () => {
      mockReq.body = {
        oldEmail: "old@example.com",
        newEmail: "new@example.com"
      };

      jest
        .spyOn(AuthService, "replaceEmailInvite")
        .mockResolvedValue(undefined);

      await authController.replaceEmailInvite(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: { message: "Update email successful" }
      });
    });

    it("should handle missing email fields", async () => {
      mockReq.body = {
        oldEmail: "old@example.com"
      };

      await authController.replaceEmailInvite(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: ERROR_MESSAGES.AUTH.REPLACE_EMAIL
      });
    });

    it("should handle service error when replacing email invite", async () => {
      mockReq.body = {
        oldEmail: "old@example.com",
        newEmail: "new@example.com"
      };

      jest
        .spyOn(AuthService, "replaceEmailInvite")
        .mockRejectedValue(new Error("Service error"));

      await authController.replaceEmailInvite(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Service error"
      });
    });
  });

  describe("resetPassword", () => {
    it("should successfully reset password", async () => {
      mockReq.body = {
        token: "valid-token",
        newPassword: "newPassword123"
      };

      jest.spyOn(AuthService, "resetPassword").mockResolvedValue(undefined);

      await authController.resetPassword(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: { message: "Password reset successful" }
      });
    });

    it("should handle missing token and password", async () => {
      mockReq.body = {
        token: "valid-token"
      };

      await authController.resetPassword(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: ERROR_MESSAGES.AUTH.TOKEN_PASSWORD_REQUIRED
      });
    });

    it("should handle reset password error", async () => {
      mockReq.body = {
        token: "valid-token",
        newPassword: "newPassword123"
      };

      jest
        .spyOn(AuthService, "resetPassword")
        .mockRejectedValue(new Error("Failed to reset password"));

      await authController.resetPassword(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Failed to reset password"
      });
    });
  });
});

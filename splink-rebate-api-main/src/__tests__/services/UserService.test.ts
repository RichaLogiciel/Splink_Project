/**
 * UserService Tests
 *
 * Tests for user management operations
 * Focuses on user profile, password management, and user retrieval
 */

jest.mock("../../models/LoginRelatedAccount", () => ({
  __esModule: true,
  default: {
    belongsTo: jest.fn(),
    hasMany: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn()
  }
}));

jest.mock("../../repositories/UserRepository");
jest.mock("../../models/User");
jest.mock("../../utils/helpers", () => ({
  ...jest.requireActual("../../utils/helpers"),
  getEnvironment: jest.fn(() => "development"),
  getHashedPassword: jest.fn()
}));
jest.mock("bcrypt");

import { ENTITY_TYPE } from "../../config/appConstants";
import { ERROR_MESSAGES } from "../../config/errorMessages";
import sequelize from "../../db";
import User from "../../models/User";
import UserRepository from "../../repositories/UserRepository";
import UserService from "../../services/UserService";
import { getHashedPassword } from "../../utils/helpers";

const bcrypt = require("bcrypt");

describe("UserService", () => {
  let mockTransaction: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock transaction
    mockTransaction = {
      commit: jest.fn(),
      rollback: jest.fn()
    };

    jest.spyOn(sequelize, "transaction").mockResolvedValue(mockTransaction);

    // Mock User.sequelize property
    Object.defineProperty(User, "sequelize", {
      value: sequelize,
      writable: true,
      configurable: true
    });
  });

  describe("logout", () => {
    describe("success cases", () => {
      it("should logout user successfully by clearing refresh token", async () => {
        // Arrange
        const userId = 1;
        (User.update as jest.Mock).mockResolvedValue([1]);

        // Act
        await UserService.logout(userId);

        // Assert
        expect(User.update).toHaveBeenCalledWith(
          {
            refreshToken: null,
            updatedAt: expect.any(Date)
          },
          {
            where: { id: userId },
            transaction: mockTransaction
          }
        );
        expect(mockTransaction.commit).toHaveBeenCalled();
      });

      it("should handle logout for different user IDs", async () => {
        // Arrange
        const userId = 999;
        (User.update as jest.Mock).mockResolvedValue([1]);

        // Act
        await UserService.logout(userId);

        // Assert
        expect(User.update).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            where: { id: 999 }
          })
        );
        expect(mockTransaction.commit).toHaveBeenCalled();
      });
    });

    describe("error cases", () => {
      it("should rollback transaction on database error", async () => {
        // Arrange
        const userId = 1;
        (User.update as jest.Mock).mockRejectedValue(
          new Error("Database error")
        );

        // Act & Assert
        await expect(UserService.logout(userId)).rejects.toThrow(
          "Database error"
        );
        expect(mockTransaction.rollback).toHaveBeenCalled();
        expect(mockTransaction.commit).not.toHaveBeenCalled();
      });

      it("should handle rollback when transaction is undefined", async () => {
        // Arrange
        const userId = 1;
        jest
          .spyOn(sequelize, "transaction")
          .mockRejectedValue(new Error("Transaction failed"));

        // Act & Assert
        await expect(UserService.logout(userId)).rejects.toThrow(
          "Transaction failed"
        );
      });
    });
  });

  describe("getProfileDetails", () => {
    describe("success cases", () => {
      it("should retrieve user profile details successfully", async () => {
        // Arrange
        const userId = 1;
        const role = ENTITY_TYPE.DISTRIBUTOR_ADMIN;
        const mockUser = {
          id: 1,
          email: "test@example.com",
          firstName: "John",
          lastName: "Doe",
          role: ENTITY_TYPE.DISTRIBUTOR_ADMIN
        };

        (UserRepository.getUserById as jest.Mock).mockResolvedValue(mockUser);

        // Act
        const result = await UserService.getProfileDetails(userId, role);

        // Assert
        expect(UserRepository.getUserById).toHaveBeenCalledWith(userId, role);
        expect(result).toEqual(mockUser);
      });

      it("should handle different user roles", async () => {
        // Arrange
        const userId = 2;
        const role = ENTITY_TYPE.MANUFACTURER;
        const mockUser = {
          id: 2,
          email: "manufacturer@example.com",
          role: ENTITY_TYPE.MANUFACTURER
        };

        (UserRepository.getUserById as jest.Mock).mockResolvedValue(mockUser);

        // Act
        const result = await UserService.getProfileDetails(userId, role);

        // Assert
        expect(UserRepository.getUserById).toHaveBeenCalledWith(userId, role);
        expect(result).toEqual(mockUser);
      });
    });

    describe("error cases", () => {
      it("should handle repository errors", async () => {
        // Arrange
        const userId = 1;
        const role = ENTITY_TYPE.DISTRIBUTOR_ADMIN;
        (UserRepository.getUserById as jest.Mock).mockRejectedValue(
          new Error("User not found")
        );

        // Act & Assert
        await expect(
          UserService.getProfileDetails(userId, role)
        ).rejects.toThrow("User not found");
      });
    });
  });

  describe("getUsers", () => {
    const mockUser = {
      id: 1,
      email: "admin@example.com",
      role: ENTITY_TYPE.DISTRIBUTOR_ADMIN
    } as any as User;

    describe("success cases", () => {
      it("should retrieve users for SUPER_ADMIN role", async () => {
        // Arrange
        const role = ENTITY_TYPE.SUPER_ADMIN;
        const page = 1;
        const limit = 10;
        const sort = "createdAt";
        const mockUsers = [
          { id: 1, email: "user1@example.com" },
          { id: 2, email: "user2@example.com" }
        ];
        const mockResponse = { users: mockUsers, totalRes: 2 };

        (
          UserRepository.getAllUsersForSuperAdmin as jest.Mock
        ).mockResolvedValue(mockResponse);

        // Act
        const result = await UserService.getUsers(
          role,
          mockUser,
          page,
          limit,
          sort,
          null,
          null,
          null
        );

        // Assert
        expect(UserRepository.getAllUsersForSuperAdmin).toHaveBeenCalledWith(
          10,
          0,
          "createdAt",
          null,
          null,
          null
        );
        expect(result).toEqual({
          users: mockUsers,
          totalRes: 2,
          totalPages: 1
        });
      });

      it("should retrieve users for DISTRIBUTOR_ADMIN role", async () => {
        // Arrange
        const role = ENTITY_TYPE.DISTRIBUTOR_ADMIN;
        const page = 1;
        const limit = 20;
        const sort = "email";
        const searchQuery = "test";
        const status = "active";
        const type = "user";
        const mockUsers = [{ id: 1, email: "test@example.com" }];
        const mockResponse = { users: mockUsers, totalRes: 1 };

        (UserRepository.getUsersList as jest.Mock).mockResolvedValue(
          mockResponse
        );

        // Act
        const result = await UserService.getUsers(
          role,
          mockUser,
          page,
          limit,
          sort,
          searchQuery,
          status,
          type
        );

        // Assert
        expect(UserRepository.getUsersList).toHaveBeenCalledWith(
          role,
          mockUser,
          20,
          0,
          "email",
          "test",
          "active",
          "user"
        );
        expect(result).toEqual({
          users: mockUsers,
          totalRes: 1,
          totalPages: 1
        });
      });

      it("should retrieve users for DISTRIBUTOR_EXECUTIVE role", async () => {
        // Arrange
        const role = ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE;
        const mockUsers = [{ id: 1 }];
        const mockResponse = { users: mockUsers, totalRes: 1 };

        (UserRepository.getUsersList as jest.Mock).mockResolvedValue(
          mockResponse
        );

        // Act
        const result = await UserService.getUsers(
          role,
          mockUser,
          1,
          10,
          "id",
          null,
          null,
          null
        );

        // Assert
        expect(UserRepository.getUsersList).toHaveBeenCalled();
        expect(result.users).toEqual(mockUsers);
      });

      it("should retrieve users for MANUFACTURER role", async () => {
        // Arrange
        const role = ENTITY_TYPE.MANUFACTURER;
        const mockUsers = [{ id: 1 }];
        const mockResponse = { users: mockUsers, totalRes: 1 };

        (UserRepository.getUsersList as jest.Mock).mockResolvedValue(
          mockResponse
        );

        // Act
        const result = await UserService.getUsers(
          role,
          mockUser,
          1,
          10,
          "id",
          null,
          null,
          null
        );

        // Assert
        expect(UserRepository.getUsersList).toHaveBeenCalled();
        expect(result.users).toEqual(mockUsers);
      });

      it("should retrieve users for MANUFACTURER_EXECUTIVE role", async () => {
        // Arrange
        const role = ENTITY_TYPE.MANUFACTURER_EXECUTIVE;
        const mockUsers = [{ id: 1 }];
        const mockResponse = { users: mockUsers, totalRes: 1 };

        (UserRepository.getUsersList as jest.Mock).mockResolvedValue(
          mockResponse
        );

        // Act
        const result = await UserService.getUsers(
          role,
          mockUser,
          1,
          10,
          "id",
          null,
          null,
          null
        );

        // Assert
        expect(UserRepository.getUsersList).toHaveBeenCalled();
        expect(result.users).toEqual(mockUsers);
      });

      it("should calculate pagination correctly", async () => {
        // Arrange
        const role = ENTITY_TYPE.SUPER_ADMIN;
        const page = 3;
        const limit = 5;
        const mockResponse = { users: [], totalRes: 25 };

        (
          UserRepository.getAllUsersForSuperAdmin as jest.Mock
        ).mockResolvedValue(mockResponse);

        // Act
        const result = await UserService.getUsers(
          role,
          mockUser,
          page,
          limit,
          "id",
          null,
          null,
          null
        );

        // Assert
        expect(UserRepository.getAllUsersForSuperAdmin).toHaveBeenCalledWith(
          5,
          10, // offset = (3-1) * 5
          "id",
          null,
          null,
          null
        );
        expect(result.totalPages).toBe(5); // 25 / 5
      });

      it("should handle search query filtering", async () => {
        // Arrange
        const role = ENTITY_TYPE.SUPER_ADMIN;
        const searchQuery = "john";
        const mockResponse = { users: [], totalRes: 0 };

        (
          UserRepository.getAllUsersForSuperAdmin as jest.Mock
        ).mockResolvedValue(mockResponse);

        // Act
        await UserService.getUsers(
          role,
          mockUser,
          1,
          10,
          "id",
          searchQuery,
          null,
          null
        );

        // Assert
        expect(UserRepository.getAllUsersForSuperAdmin).toHaveBeenCalledWith(
          10,
          0,
          "id",
          "john",
          null,
          null
        );
      });

      it("should handle status filtering", async () => {
        // Arrange
        const role = ENTITY_TYPE.SUPER_ADMIN;
        const status = "active";
        const mockResponse = { users: [], totalRes: 0 };

        (
          UserRepository.getAllUsersForSuperAdmin as jest.Mock
        ).mockResolvedValue(mockResponse);

        // Act
        await UserService.getUsers(
          role,
          mockUser,
          1,
          10,
          "id",
          null,
          status,
          null
        );

        // Assert
        expect(UserRepository.getAllUsersForSuperAdmin).toHaveBeenCalledWith(
          10,
          0,
          "id",
          null,
          "active",
          null
        );
      });

      it("should handle type filtering", async () => {
        // Arrange
        const role = ENTITY_TYPE.SUPER_ADMIN;
        const type = "admin";
        const mockResponse = { users: [], totalRes: 0 };

        (
          UserRepository.getAllUsersForSuperAdmin as jest.Mock
        ).mockResolvedValue(mockResponse);

        // Act
        await UserService.getUsers(
          role,
          mockUser,
          1,
          10,
          "id",
          null,
          null,
          type
        );

        // Assert
        expect(UserRepository.getAllUsersForSuperAdmin).toHaveBeenCalledWith(
          10,
          0,
          "id",
          null,
          null,
          "admin"
        );
      });
    });

    describe("error cases", () => {
      it("should throw error for unauthorized role", async () => {
        // Arrange
        const unauthorizedRole = "UNKNOWN_ROLE";

        // Act & Assert
        await expect(
          UserService.getUsers(
            unauthorizedRole,
            mockUser,
            1,
            10,
            "id",
            null,
            null,
            null
          )
        ).rejects.toThrow("You are not authorized to access users.");
      });

      it("should handle repository errors", async () => {
        // Arrange
        const role = ENTITY_TYPE.SUPER_ADMIN;
        (
          UserRepository.getAllUsersForSuperAdmin as jest.Mock
        ).mockRejectedValue(new Error("Database error"));

        // Act & Assert
        await expect(
          UserService.getUsers(role, mockUser, 1, 10, "id", null, null, null)
        ).rejects.toThrow("Database error");
      });
    });
  });

  describe("updateProfileDetails", () => {
    describe("success cases", () => {
      it("should update user profile details successfully", async () => {
        // Arrange
        const userId = { userID: 1, firstName: "John", lastName: "Doe" };
        const role = ENTITY_TYPE.DISTRIBUTOR_ADMIN;
        const mockUpdatedUser = {
          id: 1,
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com"
        };

        (UserRepository.updateUserDetails as jest.Mock).mockResolvedValue(
          mockUpdatedUser
        );

        // Act
        const result = await UserService.updateProfileDetails(userId, role);

        // Assert
        expect(UserRepository.updateUserDetails).toHaveBeenCalledWith(
          userId,
          role
        );
        expect(result).toEqual(mockUpdatedUser);
      });

      it("should handle updates for different roles", async () => {
        // Arrange
        const userId = { userID: 2, firstName: "Jane" };
        const role = ENTITY_TYPE.MANUFACTURER;
        const mockUpdatedUser = { id: 2, firstName: "Jane" };

        (UserRepository.updateUserDetails as jest.Mock).mockResolvedValue(
          mockUpdatedUser
        );

        // Act
        const result = await UserService.updateProfileDetails(userId, role);

        // Assert
        expect(UserRepository.updateUserDetails).toHaveBeenCalledWith(
          userId,
          role
        );
        expect(result).toEqual(mockUpdatedUser);
      });
    });

    describe("error cases", () => {
      it("should handle repository errors", async () => {
        // Arrange
        const userId = { userID: 1, firstName: "John" };
        const role = ENTITY_TYPE.DISTRIBUTOR_ADMIN;
        (UserRepository.updateUserDetails as jest.Mock).mockRejectedValue(
          new Error("Update failed")
        );

        // Act & Assert
        await expect(
          UserService.updateProfileDetails(userId, role)
        ).rejects.toThrow("Update failed");
      });
    });
  });

  describe("updateUserPassword", () => {
    describe("success cases", () => {
      it("should update user password successfully", async () => {
        // Arrange
        const userId = 1;
        const currentPassword = "oldPassword123";
        const newPassword = "newPassword456";
        const hashedNewPassword = "hashedNewPassword456";

        const mockUser = {
          id: 1,
          passwordHash: "hashedOldPassword123",
          update: jest.fn().mockResolvedValue({
            dataValues: { id: 1, passwordHash: hashedNewPassword }
          })
        };

        (User.findOne as jest.Mock).mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        (getHashedPassword as jest.Mock).mockResolvedValue(hashedNewPassword);

        // Act
        const result = await UserService.updateUserPassword(
          userId,
          currentPassword,
          newPassword
        );

        // Assert
        expect(User.findOne).toHaveBeenCalledWith({ where: { id: userId } });
        expect(bcrypt.compare).toHaveBeenCalledWith(
          currentPassword,
          mockUser.passwordHash
        );
        expect(getHashedPassword).toHaveBeenCalledWith(newPassword);
        expect(mockUser.update).toHaveBeenCalledWith(
          {
            passwordHash: hashedNewPassword,
            updatedAt: expect.any(Date)
          },
          { where: { id: userId } }
        );
        expect(result).toEqual({ id: 1, passwordHash: hashedNewPassword });
      });

      it("should handle password update for different users", async () => {
        // Arrange
        const userId = 999;
        const currentPassword = "current";
        const newPassword = "new";
        const hashedNewPassword = "hashed";

        const mockUser = {
          id: 999,
          passwordHash: "currentHashed",
          update: jest.fn().mockResolvedValue({
            dataValues: { id: 999 }
          })
        };

        (User.findOne as jest.Mock).mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        (getHashedPassword as jest.Mock).mockResolvedValue(hashedNewPassword);

        // Act
        await UserService.updateUserPassword(
          userId,
          currentPassword,
          newPassword
        );

        // Assert
        expect(User.findOne).toHaveBeenCalledWith({ where: { id: 999 } });
        expect(mockUser.update).toHaveBeenCalled();
      });
    });

    describe("error cases", () => {
      it("should throw error when user not found", async () => {
        // Arrange
        const userId = 999;
        (User.findOne as jest.Mock).mockResolvedValue(null);

        // Act & Assert
        await expect(
          UserService.updateUserPassword(userId, "current", "new")
        ).rejects.toThrow(ERROR_MESSAGES.USER.NOT_FOUND);
        expect(bcrypt.compare).not.toHaveBeenCalled();
      });

      it("should throw error when current password is incorrect", async () => {
        // Arrange
        const userId = 1;
        const currentPassword = "wrongPassword";
        const newPassword = "newPassword";

        const mockUser = {
          id: 1,
          passwordHash: "hashedPassword",
          update: jest.fn()
        };

        (User.findOne as jest.Mock).mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        // Act & Assert
        await expect(
          UserService.updateUserPassword(userId, currentPassword, newPassword)
        ).rejects.toThrow(ERROR_MESSAGES.AUTH.PASSWORD.INVALID_CURRENT_PASS);
        expect(mockUser.update).not.toHaveBeenCalled();
        expect(getHashedPassword).not.toHaveBeenCalled();
      });

      it("should handle password hashing errors", async () => {
        // Arrange
        const userId = 1;
        const currentPassword = "current";
        const newPassword = "new";

        const mockUser = {
          id: 1,
          passwordHash: "hashedPassword",
          update: jest.fn()
        };

        (User.findOne as jest.Mock).mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        (getHashedPassword as jest.Mock).mockRejectedValue(
          new Error("Hashing failed")
        );

        // Act & Assert
        await expect(
          UserService.updateUserPassword(userId, currentPassword, newPassword)
        ).rejects.toThrow("Hashing failed");
        expect(mockUser.update).not.toHaveBeenCalled();
      });

      it("should handle database update errors", async () => {
        // Arrange
        const userId = 1;
        const currentPassword = "current";
        const newPassword = "new";
        const hashedNewPassword = "hashed";

        const mockUser = {
          id: 1,
          passwordHash: "hashedPassword",
          update: jest
            .fn()
            .mockRejectedValue(new Error("Database update failed"))
        };

        (User.findOne as jest.Mock).mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        (getHashedPassword as jest.Mock).mockResolvedValue(hashedNewPassword);

        // Act & Assert
        await expect(
          UserService.updateUserPassword(userId, currentPassword, newPassword)
        ).rejects.toThrow("Database update failed");
      });
    });
  });
});

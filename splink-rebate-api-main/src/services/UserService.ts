import { Transaction } from "sequelize";
import { ENTITY_TYPE } from "../config/appConstants";
import { ERROR_MESSAGES } from "../config/errorMessages";
import User from "../models/User";
import UserRepository from "../repositories/UserRepository";
import {
  getUserByIdApiRes,
  updateProfileDetailsReqBody
} from "../types/UserTypes";
import { getHashedPassword } from "../utils/helpers";

const bcrypt = require("bcrypt");

class UserService {
  /**
   * Log out a user by invalidating their refresh token
   */
  public async logout(userId: number): Promise<void> {
    const sequelize = User.sequelize;
    if (!sequelize) {
      throw new Error("Sequelize instance is not available");
    }

    let transaction: Transaction | undefined;

    try {
      transaction = await sequelize.transaction();

      await User.update(
        {
          refreshToken: null,
          updatedAt: new Date()
        },
        {
          where: { id: userId },
          transaction
        }
      );

      await transaction.commit();
    } catch (error) {
      await transaction?.rollback();
      throw error;
    }
  }

  /**
   * Retrieves user details by their ID.
   * Checks if a record exists in the database with the given ID and returns its data.
   * @param {number} userID The ID of the user to be retrieved.
   * @returns {Promise<getUserByIdApiRes>} A promise that resolves with the user data or an error message.
   */
  public async getProfileDetails(
    userID: number,
    role: string
  ): Promise<getUserByIdApiRes> {
    const response = await UserRepository.getUserById(userID, role);

    return response;
  }

  /**
   * Retrieves all users related to a specific parent entity ID with pagination.
   * @param {number} parentEntityId The parent entity ID to search for.
   * @param {number} page The current page number.
   * @param {number} limit The number of items per page.
   * @returns A promise that resolves with the list of users, total results, and total pages.
   */
  public async getUsers(
    role: string,
    user: User,
    page: number,
    limit: number,
    sort: string,
    searchQuery: string | null = null,
    status: string | null = null,
    type: string | null = null
  ): Promise<{ users: User[]; totalRes: number; totalPages: number }> {
    const offset = (page - 1) * limit;

    switch (role) {
      case ENTITY_TYPE.SUPER_ADMIN: {
        const { users, totalRes } =
          await UserRepository.getAllUsersForSuperAdmin(
            limit,
            offset,
            sort,
            searchQuery,
            status,
            type
          );

        const totalPages = Math.ceil(totalRes / limit);

        return { users, totalRes, totalPages };
      }

      case ENTITY_TYPE.DISTRIBUTOR_ADMIN:
      case ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE: {
        const { users, totalRes } = await UserRepository.getUsersList(
          role,
          user,
          limit,
          offset,
          sort,
          searchQuery,
          status,
          type
        );

        const totalPages = Math.ceil(totalRes / limit);

        return { users, totalRes, totalPages };
      }

      case ENTITY_TYPE.MANUFACTURER:
      case ENTITY_TYPE.MANUFACTURER_EXECUTIVE: {
        const { users, totalRes } = await UserRepository.getUsersList(
          role,
          user,
          limit,
          offset,
          sort,
          searchQuery,
          status,
          type
        );

        const totalPages = Math.ceil(totalRes / limit);

        return { users, totalRes, totalPages };
      }

      default:
        throw new Error("You are not authorized to access users.");
    }
  }

  public async updateProfileDetails(
    userID: updateProfileDetailsReqBody,
    role: string
  ): Promise<getUserByIdApiRes> {
    return await UserRepository.updateUserDetails(userID, role);
  }

  public async updateUserPassword(
    userID: number,
    currentPassword: string,
    password: string
  ): Promise<{ message: string }> {
    // Find the user first
    const userDetails = await User.findOne({ where: { id: userID } });
    if (!userDetails) {
      throw new Error(ERROR_MESSAGES.USER.NOT_FOUND);
    }

    // Compare the provided current password with the stored password hash
    const isMatch = await bcrypt.compare(
      currentPassword,
      userDetails.passwordHash
    );

    if (!isMatch) {
      throw new Error(ERROR_MESSAGES.AUTH.PASSWORD.INVALID_CURRENT_PASS);
    }

    // Hash the passwords
    const hashedPassword = await getHashedPassword(password);

    // Update the user's password hash
    const updatedUser = await userDetails.update(
      { passwordHash: hashedPassword, updatedAt: new Date() },
      { where: { id: userID } }
    );

    return updatedUser.dataValues;
  }
}

export default new UserService();

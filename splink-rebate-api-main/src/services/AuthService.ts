import bcrypt from "bcrypt";
import { Request } from "express";
import joi from "joi";
import jwt from "jsonwebtoken";
import { Transaction } from "sequelize";
import { ERROR_MESSAGES } from "../config/errorMessages";
import Distributor from "../models/Distributor";
import User from "../models/User";
import UserRole from "../models/UserRole";

import AuthRepository, {
  StoreUserInvite
} from "../repositories/AuthRepository";

import { ENTITY_TYPE } from "../config/appConstants";
import sequelize from "../db";
import { ApiError } from "../lib/errors/APIError";
import Chain from "../models/Chain";
import Manufacturer from "../models/Manufacturer";
import SignupInvitation from "../models/SignupInvitation";
import Store from "../models/Store";
import DistributorRepository from "../repositories/DistributorRepository";
import ManufacturerRepository from "../repositories/ManufacturerRepository";
import UserMetaRepository from "../repositories/UserMetaRepository";
import UserRepository from "../repositories/UserRepository";
import { validateEmail } from "../utils/helpers";
import { generateJwtToken } from "../utils/jwt";
import {
  sendInvitationEmail,
  sendInvitationEmailFromDist,
  sendResetPasswordEmail,
  sendWelcomeEmail
} from "../utils/nodeMailer";
import {
  getHigherDistributorRole,
  isDistributor,
  isDistributorAdminAndExecutive,
  isManufacturerAdminAndExecutive,
  isManufacturerExecutive
} from "../utils/roles";
import { getFullName } from "../utils/userHelper";
import {
  getUserByIdApiRes,
  LoggedInUser,
  UserType
} from "./../types/UserTypes";

const PHONE_PATTERN = /^\(\d{3}\) \d{3}-\d{4}$/;

const DISTRIBUTOR_ADMIN_SIGNUP_PAYLOAD_SCHEMA = joi.object({
  token: joi.string().required(),
  email: joi.string().email().min(1).max(255).required(),
  firstName: joi.string().min(1).max(255).required(),
  lastName: joi.string().min(1).max(255).required(),
  phones: joi
    .array()
    .items(joi.string().pattern(PHONE_PATTERN).required())
    .min(1)
    .max(2)
    .required(),
  password: joi.string().min(8).max(24).required(),
  address: joi.string().min(1).max(255).required(),
  city: joi.string().min(1).max(255).required(),
  state: joi.string().min(1).max(255).required(),
  zip: joi
    .string()
    .pattern(/(^\d{5}$)|(^\d{5}-\d{4}$)/)
    .required(),
  logo: joi.string(),
  title: joi.string(),
  orgName: joi.string()
});

const DISTRIBUTOR_EXECUTIVE_SIGNUP_PAYLOAD_SCHEMA = joi.object({
  token: joi.string().required(),
  email: joi.string().email().min(1).max(255).required(),
  firstName: joi.string().min(1).max(255).required(),
  lastName: joi.string().min(1).max(255).required(),
  phones: joi
    .array()
    .items(joi.string().pattern(PHONE_PATTERN).required())
    .min(1)
    .max(2)
    .required(),
  password: joi.string().min(8).max(24).required(),
  logo: joi.string() // to bypass validation only
});

const DISTRIBUTOR_SALES_REP_INVITE_PAYLOAD_SCHEMA = joi.object({
  parentUserId: joi.number().required(), // Not sent by FE, added in payload later in BE
  parentUserRole: joi.string().required(), // Not sent by FE, added in payload later in BE
  salesRepId: joi.number().required(),
  email: joi.string().email().min(1).max(255).required(),
  firstName: joi.string().min(1).max(255).required(),
  lastName: joi.string().min(1).max(255).required(),
  phones: joi
    .array()
    .items(joi.string().pattern(PHONE_PATTERN).required())
    .min(1)
    .max(2)
    .required()
});

const DISTRIBUTOR_GENERAL_MANAGER_INVITE_PAYLOAD_SCHEMA = joi.object({
  parentUserId: joi.number().required(), // Not sent by FE, added in payload later in BE
  parentUserRole: joi.string().required(), // Not sent by FE, added in payload later in BE
  salesRepId: joi.number().required(),
  email: joi.string().email().min(1).max(255).required(),
  firstName: joi.string().min(1).max(255).required(),
  lastName: joi.string().min(1).max(255).required(),
  phones: joi
    .array()
    .items(joi.string().pattern(PHONE_PATTERN).required())
    .min(1)
    .max(2)
    .required(),
  warehouses: joi.array().items(joi.number()).optional()
});

const DISTRIBUTOR_SALES_REP_SIGNUP_PAYLOAD_SCHEMA = joi.object({
  token: joi.string().required(),
  email: joi.string().email().min(1).max(255).required(),
  firstName: joi.string().min(1).max(255).required(),
  lastName: joi.string().min(1).max(255).required(),
  phones: joi
    .array()
    .items(joi.string().pattern(PHONE_PATTERN).required())
    .min(1)
    .max(2)
    .required(),
  password: joi.string().min(8).max(24).required(),
  logo: joi.string() // to bypass validation only
});

const STORE_INVITE_PAYLOAD_SCHEMA = joi.object({
  parentUserId: joi.number().required(), // Not sent by FE, added in payload later in BE
  parentUserRole: joi.string().required(), // Not sent by FE, added in payload later in BE
  email: joi.string().email().min(1).max(255).required(),
  firstName: joi.string().min(1).max(255).required(),
  lastName: joi.string().min(1).max(255).required(),
  phones: joi
    .array()
    .items(joi.string().pattern(PHONE_PATTERN).required())
    .min(1)
    .max(2)
    .required(),
  address: joi.string().min(1).max(255).required(),
  city: joi.string().min(1).max(255).required(),
  state: joi.string().min(1).max(255).required(),
  zip: joi
    .string()
    .pattern(/(^\d{5}$)|(^\d{5}-\d{4}$)/)
    .required(),
  storeId: joi.number().required(),
  storeName: joi.string().min(1).max(255).required()
});

const STORE_SIGNUP_PAYLOAD_SCHEMA = joi.object({
  token: joi.string().required(),
  email: joi.string().required(),
  firstName: joi.string().min(1).max(255).required(),
  lastName: joi.string().min(1).max(255).required(),
  phones: joi
    .array()
    .items(joi.string().pattern(PHONE_PATTERN).required())
    .min(1)
    .max(2)
    .required(),
  password: joi.string().min(8).max(24).required(),
  address: joi.string().min(1).max(255).required(),
  city: joi.string().min(1).max(255).required(),
  state: joi.string().min(1).max(255).required(),
  zip: joi
    .string()
    .pattern(/(^\d{5}$)|(^\d{5}-\d{4}$)/)
    .required(),
  logo: joi.string(),
  storeName: joi.string().min(1).max(255).required()
});

const CHAIN_ADMIN_SIGNUP_PAYLOAD_SCHEMA = joi.object({
  token: joi.string().required(),
  parentEntityId: joi.number().required(), // Not sent by FE, added in payload later in BE
  parentEntityType: joi.string().required(), // Not sent by FE, added in payload later in BE
  chainId: joi.number().required(),
  email: joi.string().email().min(1).max(255).required(),
  firstName: joi.string().min(1).max(255).required(),
  lastName: joi.string().min(1).max(255).required(),
  phones: joi
    .array()
    .items(joi.string().pattern(PHONE_PATTERN).required())
    .min(1)
    .max(2)
    .required()
});

const CHAIN_ADMIN_INVITE_PAYLOAD_SCHEMA = joi.object({
  parentEntityId: joi.number().required(), // Not sent by FE, added in payload later in BE
  parentEntityType: joi.string().required(), // Not sent by FE, added in payload later in BE
  chainId: joi.number().required(),
  email: joi.string().email().min(1).max(255).required(),
  firstName: joi.string().min(1).max(255).required(),
  lastName: joi.string().min(1).max(255).required(),
  phones: joi
    .array()
    .items(joi.string().pattern(PHONE_PATTERN).required())
    .min(1)
    .max(2)
    .required()
});

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
}

interface TokenPayload {
  id: number;
  userId: number;
  email: string;
  role: string;
  associatedUserId: number;
  parentEntityId: number | null;
  parentEntityType: string | null;
  isMultiRole?: boolean;
}

interface InviteUserProp {
  email: string;
  role: string;
  childUsers: { name: string; id: number }[] | undefined;
}

class AuthService {
  constructor() {}

  /**
   * Authenticate a user with email and password
   */
  public async login(
    email: string,
    password: string,
    rememberMe: boolean = false
  ): Promise<AuthResult> {
    const sequelize = User.sequelize;
    if (!sequelize) {
      throw new Error("Sequelize instance is not available");
    }

    let transaction: Transaction | null = null;

    try {
      // Start transaction
      transaction = await sequelize.transaction();

      // Get user with role using Sequelize
      const users = await User.findAll({
        where: {
          email: email.toLowerCase(),
          deletedAt: null
        },
        include: [
          {
            model: UserRole,
            required: false
          }
        ]
      });

      const user = users?.length > 0 ? users[0] : null;
      if (
        !user ||
        users.length === 0 ||
        !user?.UserRole ||
        !user?.passwordHash
      ) {
        throw new Error(ERROR_MESSAGES.AUTH.AUTHENTICATION_FAILED);
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        throw new Error(ERROR_MESSAGES.AUTH.AUTHENTICATION_FAILED);
      }

      let userRole = user.UserRole.role;
      if (users.length > 1) {
        // We assume that user will be Distributor only for now
        const userCombinedRoles = await UserRepository.getUserCombinedRoles({
          userId: user.id
        });
        userRole = getHigherDistributorRole(userCombinedRoles);
      }

      // Generate tokens
      const tokenPayload: TokenPayload = {
        userId: user.id,
        id: user.id,
        email: user.email,
        role: userRole,
        associatedUserId: user.UserRole.associatedUserId,
        parentEntityId: user.UserRole.parentEntityId,
        parentEntityType: user.UserRole.parentEntityType,
        isMultiRole: users.length > 1
      };

      const accessToken = this.generateAccessToken(tokenPayload, rememberMe);
      const refreshToken = this.generateRefreshToken(user.id);

      // // Update refresh token in database
      // Update refresh token in database using Sequelize
      await user.update(
        {
          refreshToken,
          updatedAt: new Date()
        },
        { transaction }
      );

      await transaction.commit();

      // Prepare user data payload
      let userData: any = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: userRole,
        associatedUserId: user.UserRole.associatedUserId,
        parentEntityId: user.UserRole.parentEntityId,
        parentEntityType: user.UserRole.parentEntityType,
        isMultiRole: users.length > 1
      };

      // Add logo if applicable
      userData = {
        ...userData,
        ...(await this.getLogoAndNameForUser(
          userData.associatedUserId,
          user.UserRole.associatedEntityType,
          user.UserRole.parentEntityId,
          userRole
        ))
      };

      // Add primaryWarehouseId for DISTRIBUTOR_SALES_REP users
      if (userRole === ENTITY_TYPE.DISTRIBUTOR_SALES_REP) {
        const distributor = await Distributor.findOne({
          where: { id: userData.associatedUserId }
        });
        if (distributor?.primaryWarehouseId) {
          userData.primaryWarehouseId = distributor.primaryWarehouseId;
        }

        // Fetch orderingFeatureEnabled from user_meta table
        const orderingFeatureValue = await UserMetaRepository.getUserMeta(
          userData.associatedUserId,
          ENTITY_TYPE.DISTRIBUTOR_SALES_REP,
          "ENABLE_ORDER_FEATURE"
        );
        if (orderingFeatureValue !== null) {
          // Value is stored as uppercase "TRUE" or "FALSE", so compare case-insensitively
          userData.orderingFeatureEnabled =
            orderingFeatureValue.toUpperCase() === "TRUE";
        }
      }

      // Return authentication result
      return {
        accessToken,
        refreshToken,
        user: userData,
        loginTime: Date(),
        expiresIn: rememberMe
          ? process.env.JWT_LONG_EXPIRATION || "30d"
          : process.env.JWT_EXPIRATION || "24h"
      };
    } catch (error) {
      await (transaction ?? undefined)?.rollback();
      throw error;
    }
  }

  /**
   * Authenticate a user with UserID
   */
  public async loginWithID(userID: number): Promise<AuthResult> {
    const sequelize = User.sequelize;
    if (!sequelize) {
      throw ApiError.internal("Sequelize instance is not available");
    }

    const transaction: Transaction = await sequelize.transaction();

    try {
      // Get user with role using Sequelize
      const users = await User.findAll({
        where: {
          id: userID,
          deletedAt: null
        },
        include: [
          {
            model: UserRole,
            required: false
          }
        ]
      });

      const user = users?.length > 0 ? users[0] : null;
      if (!user || !user?.UserRole) {
        throw ApiError.authenticationFailed(ERROR_MESSAGES.USER.NOT_FOUND);
      }

      let userRole = user.UserRole.role;
      if (users.length > 1) {
        // We assume that user will be Distributor only for now
        const userCombinedRoles = await UserRepository.getUserCombinedRoles({
          userId: user.id
        });
        userRole = getHigherDistributorRole(userCombinedRoles);
      }

      // Generate tokens
      const tokenPayload: TokenPayload = {
        userId: user.id,
        id: user.id,
        email: user.email,
        role: userRole,
        associatedUserId: user.UserRole.associatedUserId,
        parentEntityId: user.UserRole.parentEntityId,
        parentEntityType: user.UserRole.parentEntityType,
        isMultiRole: users.length > 1
      };

      const accessToken = this.generateAccessToken(tokenPayload, true);
      const refreshToken = this.generateRefreshToken(user.id);

      // // Update refresh token in database
      // Update refresh token in database using Sequelize
      await user.update(
        {
          refreshToken,
          updatedAt: new Date()
        },
        { transaction }
      );

      await transaction.commit();

      // Prepare user data payload
      let userData: any = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: userRole,
        associatedUserId: user.UserRole.associatedUserId,
        parentEntityId: user.UserRole.parentEntityId,
        parentEntityType: user.UserRole.parentEntityType,
        isMultiRole: users.length > 1
      };

      // Add logo if applicable
      userData = {
        ...userData,
        ...(await this.getLogoAndNameForUser(
          userData.associatedUserId,
          user.UserRole.associatedEntityType,
          user.UserRole.parentEntityId,
          userRole
        ))
      };

      // Add primaryWarehouseId for DISTRIBUTOR_SALES_REP users
      if (userRole === ENTITY_TYPE.DISTRIBUTOR_SALES_REP) {
        const distributor = await Distributor.findOne({
          where: { id: userData.associatedUserId }
        });
        if (distributor?.primaryWarehouseId) {
          userData.primaryWarehouseId = distributor.primaryWarehouseId;
        }

        // Fetch orderingFeatureEnabled from user_meta table
        const orderingFeatureValue = await UserMetaRepository.getUserMeta(
          userData.associatedUserId,
          ENTITY_TYPE.DISTRIBUTOR_SALES_REP,
          "ENABLE_ORDER_FEATURE"
        );
        if (orderingFeatureValue !== null) {
          // Value is stored as uppercase "TRUE" or "FALSE", so compare case-insensitively
          userData.orderingFeatureEnabled =
            orderingFeatureValue.toUpperCase() === "TRUE";
        }
      }

      // Return authentication result
      return {
        accessToken,
        refreshToken,
        user: userData,
        loginTime: Date(),
        expiresIn: process.env.JWT_EXPIRATION || "24h"
      };
    } catch (error) {
      await (transaction ?? undefined)?.rollback();
      throw error;
    }
  }

  /**
   * Helper function to fetch logo based on user role
   */
  private async getLogoAndNameForUser(
    associatedUserId: number,
    type: string,
    parentEntityId: number,
    role: string
  ): Promise<any> {
    switch (type) {
      case ENTITY_TYPE.STORE: {
        const data = await Store.findOne({
          where: { id: associatedUserId },
          attributes: ["logo", "name"]
        });
        const StoreDistributor =
          await DistributorRepository.getDistributorNameAndLogo(parentEntityId);

        return {
          distributorLogo: StoreDistributor.logo,
          distributorName: StoreDistributor.name,
          logo: data?.dataValues?.logo || "",
          name: data?.dataValues?.name || ""
        };
      }

      case ENTITY_TYPE.DISTRIBUTOR: {
        const data = await Distributor.findOne({
          where: {
            id:
              role == ENTITY_TYPE.DISTRIBUTOR_ADMIN
                ? associatedUserId
                : parentEntityId
          },
          attributes: ["logo", "organization_name"]
        });

        return {
          logo: data?.dataValues?.logo || "",
          name: data?.dataValues?.organization_name || ""
        };
      }

      case ENTITY_TYPE.MANUFACTURER: {
        const manufacturer = await Manufacturer.findOne({
          where: {
            id:
              role == ENTITY_TYPE.MANUFACTURER
                ? associatedUserId
                : parentEntityId
          },
          attributes: ["logo", "organization_name"]
        });

        return {
          logo: manufacturer?.dataValues?.logo || "",
          name: manufacturer?.dataValues?.organization_name || ""
        };
      }
      case ENTITY_TYPE.CHAIN: {
        const data = await Chain.findOne({
          where: { id: associatedUserId },
          attributes: ["name"]
        });

        return {
          logo: "",
          name: data?.dataValues?.name || ""
        };
      }

      default:
        return {
          logo: "",
          name: ""
        };
    }
  }

  /**
   * Refresh access token using a valid refresh token
   */
  public async refreshToken(
    token: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const sequelize = User.sequelize;
    if (!sequelize) {
      throw new Error(ERROR_MESSAGES.COMMON.DB_ERROR);
    }

    let transaction: Transaction | undefined;

    try {
      if (!process.env.REFRESH_TOKEN_SECRET) {
        throw new Error(ERROR_MESSAGES.COMMON.DB_ERROR);
      }

      const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET) as {
        userId: number;
      };

      transaction = await sequelize.transaction();

      // Get user with role using Sequelize
      const users = await User.findAll({
        where: {
          id: decoded.userId,
          refreshToken: token,
          deletedAt: null
        },
        include: [
          {
            model: UserRole,
            required: false
          }
        ],
        transaction
      });

      const user = users?.length > 0 ? users[0] : null;
      if (!user || users.length === 0) {
        throw new Error(ERROR_MESSAGES.AUTH.INVALID_REFRESH_TOKEN);
      }

      if (!user.UserRole || users.length === 0) {
        throw new Error(ERROR_MESSAGES.AUTH.USER_ROLE_NOT_FOUND);
      }

      // Generate new access token
      const tokenPayload: TokenPayload = {
        userId: user.id,
        id: user.id,
        email: user.email,
        role: user.UserRole.role,
        associatedUserId: user.UserRole.associatedUserId,
        parentEntityId: user.UserRole.parentEntityId,
        parentEntityType: user.UserRole.parentEntityType,
        isMultiRole: users.length > 1
      };

      // Generate new access token
      const accessToken = this.generateAccessToken(tokenPayload);

      // Generate new refresh token for rotation
      const newRefreshToken = this.generateRefreshToken(user.id);

      // Update user with new refresh token
      await user.update(
        {
          refreshToken: newRefreshToken,
          updatedAt: new Date()
        },
        { transaction }
      );

      await transaction.commit();

      return { accessToken, refreshToken: newRefreshToken };
    } catch (error) {
      await transaction?.rollback();

      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error(ERROR_MESSAGES.AUTH.INVALID_REFRESH_TOKEN);
      }

      throw error;
    }
  }

  /**
   * Generate a new access token
   */
  private generateAccessToken(
    payload: TokenPayload,
    longExpiry: boolean = false
  ): string {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined");
    }

    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: longExpiry
        ? process.env.JWT_LONG_EXPIRATION || "30d"
        : process.env.JWT_EXPIRATION || "24h"
    });
  }

  /**
   * Generate a new refresh token
   */
  private generateRefreshToken(userId: number): string {
    if (!process.env.REFRESH_TOKEN_SECRET) {
      throw new Error("REFRESH_TOKEN_SECRET is not defined");
    }

    return jwt.sign({ userId }, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRATION || "7d"
    });
  }

  /**
   * Invites users by sending them an invitation email with a JWT token.
   *
   * @param {string[]} emails - The list of email addresses to invite.
   * @returns {Promise<void>} - A promise that resolves once the invitations have been sent.
   * @throws Will throw an error if the email list is invalid, if any email addresses are invalid, or if there is an issue sending the invitations.
   */
  public async inviteUsers(
    inviteUsersList: InviteUserProp[],
    user: LoggedInUser
  ): Promise<void> {
    const sequelize = User.sequelize;
    if (!sequelize) {
      throw new Error("Sequelize instance is not available");
    }

    // Validate that the email list is an array and not empty
    if (!Array.isArray(inviteUsersList) || inviteUsersList.length === 0) {
      throw new Error(
        "Email list is invalid or contains missing addresses. Please review and correct before proceeding."
      );
    }

    // Validate each email address
    const invalidEmails = inviteUsersList.filter(
      (user) => !validateEmail(user.email)
    );
    if (invalidEmails.length > 0) {
      const emails = invalidEmails.map((user) => user.email);
      throw new Error(
        `Invalid email addresses detected. Please correct the following before proceeding: ${emails.join(", ")}`
      );
    }

    // Check for existing users
    const emailList = inviteUsersList.map((invite) => invite.email);

    // Use Promise.all with map to handle asynchronous operations
    const existingUsers = (
      await Promise.all(
        emailList.map(async (email) => {
          const existingUser = await AuthRepository.findUserByEmail(email);
          return existingUser ? email : null;
        })
      )
    ).filter((email) => email !== null);

    // Filter out null values to get only existing emails
    const existingEmails = existingUsers.filter((email) => email !== null);

    if (existingEmails.length > 0) {
      throw new Error(
        `The following email addresses are already associated with existing accounts: ${existingEmails.join(", ")}`
      );
    }

    let transaction: Transaction | undefined;

    try {
      const manufacturerDistributors = isManufacturerAdminAndExecutive(
        user?.role
      )
        ? await ManufacturerRepository.getDistributors(
            isManufacturerExecutive(user?.role)
              ? user.parentEntityId
              : user.associatedUserId
          )
        : [];

      const distributorWarehouses = isDistributorAdminAndExecutive(user?.role)
        ? await DistributorRepository.getDistributorWarehouses(
            isManufacturerExecutive(user?.role)
              ? user.parentEntityId
              : user.associatedUserId
          )
        : [];

      transaction = await sequelize.transaction();

      // Generate JWT tokens and save invitation information
      const invitationPromises = inviteUsersList.map(async (invite) => {
        invite.email = invite.email?.toLowerCase();
        const token = generateJwtToken(invite.email);

        await AuthRepository.saveInvitation(
          { ...invite, token },
          user,
          transaction,
          manufacturerDistributors,
          distributorWarehouses
        );

        if (isDistributor(user?.role)) {
          // Get Dist details
          const { data: profile }: getUserByIdApiRes =
            await UserRepository.getUserById(Number(user.id), user.role);
          const { distributorName, logo } = profile as UserType;

          await sendInvitationEmailFromDist(
            invite.email,
            token,
            logo,
            distributorName
          );
        } else {
          await sendInvitationEmail(invite.email, token);
        }
      });

      // Wait for all invitations to be sent
      await Promise.all(invitationPromises);

      transaction?.commit();
    } catch (error: any) {
      transaction?.rollback();

      throw new Error(
        error?.message ||
          `We’re experiencing some technical issues at the moment. Please try again shortly or contact support if the problem persists.`
      );
    }
  }

  public async inviteStore(
    payload: StoreUserInvite,
    user: LoggedInUser
  ): Promise<void> {
    const sequelize = User.sequelize;
    if (!sequelize) {
      throw new Error("Sequelize instance is not available");
    }

    let transaction: Transaction | undefined;

    try {
      if (!validateEmail(payload.email)) {
        throw new Error(
          `Invalid email addresses detected. Please correct the following before proceeding: ${payload.email}`
        );
      }

      await this.validateSignupRole(ENTITY_TYPE.STORE, payload);

      transaction = await sequelize.transaction();

      const token = generateJwtToken(payload.email);
      await AuthRepository.saveInvitationForStore(payload, token, transaction);

      // Get Dist details
      const { data: profile }: getUserByIdApiRes =
        await UserRepository.getUserById(Number(user.id), user.role);
      const { distributorName, logo } = profile as UserType;

      await sendInvitationEmailFromDist(
        payload.email,
        token,
        logo,
        distributorName
      );

      await transaction?.commit();
    } catch (error: any) {
      transaction?.rollback();

      throw new Error(
        error?.message ||
          `We’re experiencing some technical issues at the moment. Please try again shortly or contact support if the problem persists.`
      );
    }
  }

  public async inviteSalesRep(payload: any, user: LoggedInUser): Promise<void> {
    const sequelize = User.sequelize;
    if (!sequelize) {
      throw new Error("Sequelize instance is not available");
    }

    let transaction: Transaction | undefined;

    try {
      if (!validateEmail(payload.email)) {
        throw new Error(
          `Invalid email addresses detected. Please correct the following before proceeding: ${payload.email}`
        );
      }

      await this.validateSignupRole(ENTITY_TYPE.DISTRIBUTOR_SALES_REP, payload);

      transaction = await sequelize.transaction();

      const token = generateJwtToken(payload.email);
      await AuthRepository.saveInvitationForSalesRep(
        payload,
        token,
        transaction
      );

      // Get Dist details
      const { data: profile }: getUserByIdApiRes =
        await UserRepository.getUserById(Number(user.id), user.role);
      const { distributorName, logo } = profile as UserType;

      await sendInvitationEmailFromDist(
        payload.email,
        token,
        logo,
        distributorName
      );

      await transaction?.commit();
    } catch (error: any) {
      transaction?.rollback();

      throw new Error(
        error?.message ||
          `We're experiencing some technical issues at the moment. Please try again shortly or contact support if the problem persists.`
      );
    }
  }

  public async inviteGeneralManager(
    payload: any,
    user: LoggedInUser
  ): Promise<void> {
    const sequelize = User.sequelize;
    console.log("inviting general manager");
    if (!sequelize) {
      throw new Error("Sequelize instance is not available");
    }

    let transaction: Transaction | undefined;

    try {
      if (!validateEmail(payload.email)) {
        throw new Error(
          `Invalid email addresses detected. Please correct the following before proceeding: ${payload.email}`
        );
      }

      await this.validateSignupRole(
        ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER,
        payload
      );

      transaction = await sequelize.transaction();

      const token = generateJwtToken(payload.email);
      await AuthRepository.saveInvitationForGeneralManager(
        payload,
        token,
        transaction
      );

      // Get Dist details
      const { data: profile }: getUserByIdApiRes =
        await UserRepository.getUserById(Number(user.id), user.role);
      const { distributorName, logo } = profile as UserType;

      await sendInvitationEmailFromDist(
        payload.email,
        token,
        logo,
        distributorName
      );

      await transaction?.commit();
    } catch (error: any) {
      transaction?.rollback();

      throw new Error(
        error?.message ||
          `We're experiencing some technical issues at the moment. Please try again shortly or contact support if the problem persists.`
      );
    }
  }

  public async inviteSalesManager(
    payload: any,
    user: LoggedInUser
  ): Promise<void> {
    const sequelize = User.sequelize;
    if (!sequelize) {
      throw new Error("Sequelize instance is not available");
    }
    console.log("inviting sales manager");

    let transaction: Transaction | undefined;

    try {
      if (!validateEmail(payload.email)) {
        throw new Error(
          `Invalid email addresses detected. Please correct the following before proceeding: ${payload.email}`
        );
      }

      await this.validateSignupRole(
        ENTITY_TYPE.DISTRIBUTOR_SALES_MANAGER,
        payload
      );

      transaction = await sequelize.transaction();

      const token = generateJwtToken(payload.email);
      await AuthRepository.saveInvitationForSalesManager(
        payload,
        token,
        transaction
      );

      // Get Dist details
      const { data: profile }: getUserByIdApiRes =
        await UserRepository.getUserById(Number(user.id), user.role);
      const { distributorName, logo } = profile as UserType;

      await sendInvitationEmailFromDist(
        payload.email,
        token,
        logo,
        distributorName
      );

      await transaction?.commit();
    } catch (error: any) {
      transaction?.rollback();

      throw new Error(
        error?.message ||
          `We're experiencing some technical issues at the moment. Please try again shortly or contact support if the problem persists.`
      );
    }
  }

  public async inviteChain(payload: any, user: LoggedInUser): Promise<void> {
    const sequelize = User.sequelize;
    if (!sequelize) {
      throw new Error("Sequelize instance is not available");
    }

    let transaction: Transaction | undefined;

    try {
      if (!validateEmail(payload.email)) {
        throw new Error(
          `Invalid email addresses detected. Please correct the following before proceeding: ${payload.email}`
        );
      }

      await this.validateSignupRole(ENTITY_TYPE.CHAIN_ADMIN, payload);

      transaction = await sequelize.transaction();

      const token = generateJwtToken(payload.email);
      await AuthRepository.saveInvitationForChain(payload, token, transaction);

      // Get Dist details
      const { data: profile }: getUserByIdApiRes =
        await UserRepository.getUserById(Number(user.id), user.role);
      const { distributorName, logo } = profile as UserType;

      await sendInvitationEmailFromDist(
        payload.email,
        token,
        logo,
        distributorName
      );

      await transaction?.commit();
    } catch (error: any) {
      transaction?.rollback();

      throw new Error(
        error?.message ||
          `We’re experiencing some technical issues at the moment. Please try again shortly or contact support if the problem persists.`
      );
    }
  }

  public async inviteExistingUser(req: Request) {
    const { role: inviterRole } = req.user;

    const { email, role } = req.body;

    req.body.email = email.toLowerCase();

    switch (inviterRole) {
      case ENTITY_TYPE.DISTRIBUTOR_ADMIN:
      case ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE:
      case ENTITY_TYPE.CHAIN_ADMIN:
      case ENTITY_TYPE.DISTRIBUTOR_SALES_REP:
        break;
      default:
        throw new Error(`You are not authorized to invite store`);
    }

    if (!validateEmail(email)) {
      throw new Error(
        `Invalid email addresses detected. Please correct the following before proceeding: ${email}`
      );
    }

    // only distributor admin can invite chain admin
    if (
      inviterRole == ENTITY_TYPE.DISTRIBUTOR_ADMIN &&
      role == ENTITY_TYPE.CHAIN_ADMIN
    ) {
      const { user, body: postBody } = req;
      const payload = {
        parentUserId: user.id,
        parentEntityType: ENTITY_TYPE.DISTRIBUTOR_ADMIN,
        parentEntityId: user.associatedUserId,
        parentUserRole: user.role,
        email: postBody.email,
        firstName: postBody.firstName,
        lastName: postBody.lastName,
        phones: postBody.phones,
        chainId: postBody.chainId,
        stores: postBody.stores
      };

      await this.inviteChain(payload, req.user);
      return;
    }

    console.log(
      "inviteExistingUser - role:",
      role,
      "DISTRIBUTOR_GENERAL_MANAGER:",
      ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER,
      "DISTRIBUTOR_SALES_MANAGER:",
      ENTITY_TYPE.DISTRIBUTOR_SALES_MANAGER
    );

    // For DISTRIBUTOR_SALES_REP role, we need to check the actual role in the database
    // because the frontend sends DISTRIBUTOR_SALES_REP for all distributor employees
    let actualRole = role;
    if (role === ENTITY_TYPE.DISTRIBUTOR_SALES_REP && req.body.salesRepId) {
      const userRole = await UserRole.findOne({
        where: { userId: req.body.salesRepId }
      });

      if (userRole) {
        actualRole = userRole.role;
        console.log("Found actual role in database:", actualRole);
      }
    }

    switch (actualRole) {
      case ENTITY_TYPE.STORE: {
        const payload = {
          parentUserId: req.user.id,
          parentUserRole: req.user.role,
          email: req.body.email,
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          phones: req.body.phones,
          address: req.body.address,
          city: req.body.city,
          state: req.body.state,
          zip: req.body.zip,
          storeId: req.body.storeId,
          storeName: req.body.storeName
        };

        await this.inviteStore(payload, req.user);
        break;
      }

      case ENTITY_TYPE.DISTRIBUTOR_SALES_REP: {
        const payload = {
          parentUserId: req.user.id,
          parentUserRole: req.user.role,
          email: req.body.email,
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          phones: req.body.phones,
          salesRepId: req.body.salesRepId
        };

        await this.inviteSalesRep(payload, req.user);
        break;
      }

      case ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER: {
        console.log("inviting general manager");
        const payload = {
          parentUserId: req.user.id,
          parentUserRole: req.user.role,
          email: req.body.email,
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          phones: req.body.phones,
          salesRepId: req.body.salesRepId, // Keep same field name as frontend sends
          warehouses: req.body.warehouses
        };

        await this.inviteGeneralManager(payload, req.user);
        break;
      }

      case ENTITY_TYPE.DISTRIBUTOR_SALES_MANAGER: {
        console.log("inviting sales manager");
        const payload = {
          parentUserId: req.user.id,
          parentUserRole: req.user.role,
          email: req.body.email,
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          phones: req.body.phones,
          salesRepId: req.body.salesRepId // Keep same field name as frontend sends
        };

        await this.inviteSalesManager(payload, req.user);
        break;
      }

      default:
        throw new Error(`You are not authorized to invite ${role}`);
    }
  }

  /**
   * Retrieve a signup invitation using the provided token.
   *
   * This method delegates the retrieval of the invitation to the AuthRepository.
   * It returns the invitation if found and valid.
   *
   * @param token - The unique token associated with the invitation
   * @returns A Promise that resolves to the SignupInvitation object
   * @throws An error if the invitation is not found or has expired
   */
  public async getInvitation(token: string): Promise<SignupInvitation> {
    return AuthRepository.getInvitation(token);
  }

  /**
   * Handles user signup by validating the invitation and creating a new user.
   *
   * This method retrieves an invitation using the provided email and token,
   * validates the signup parameters against the invitation, and creates a new
   * user with the associated role. It uses a transaction to ensure atomicity.
   *
   * @param params - The signup parameters including email and token.
   * @returns A Promise that resolves when the signup process is complete.
   * @throws An error if the Sequelize instance is unavailable, the invitation
   *         is invalid, or if any other issue occurs during the signup process.
   */
  public async signup(params: any): Promise<any> {
    const sequelize = User.sequelize;
    if (!sequelize) {
      throw new Error("Sequelize instance is not available");
    }

    let transaction: Transaction | undefined;

    try {
      const invitation: SignupInvitation = await AuthRepository.getInvitation(
        params.token
      );

      await this.validateSignupRole(invitation.role, params);

      const {
        id: invitationId,
        role,
        invited_by: invitedBy,
        email,
        invited_user: invitedUser,
        replace_email: replaceEmail
      } = invitation;

      transaction = await sequelize.transaction();

      let user;
      switch (role) {
        case ENTITY_TYPE.STORE:
          user = await UserRepository.storeSignup(
            {
              ...params,
              email,
              role,
              invitedBy
            },
            transaction
          );
          break;

        case ENTITY_TYPE.DISTRIBUTOR_SALES_REP:
        case ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER:
        case ENTITY_TYPE.DISTRIBUTOR_SALES_MANAGER:
          user = invitedUser
            ? await UserRepository.salesRepSignup(
                {
                  ...params,
                  email,
                  role,
                  invitedBy,
                  invitedUser
                },
                transaction
              )
            : await UserRepository.create(
                { ...params, role, invitedBy, invitationId },
                transaction
              );
          break;

        case ENTITY_TYPE.MANUFACTURER:
        case ENTITY_TYPE.MANUFACTURER_EXECUTIVE:
        case ENTITY_TYPE.MANUFACTURER_ACCOUNT_MANAGER:
          user = await UserRepository.create(
            { ...params, role, invitedBy, email, replaceEmail, invitationId },
            transaction
          );
          break;

        case ENTITY_TYPE.DISTRIBUTOR_ADMIN:
          user = await UserRepository.create(
            { ...params, role, invitedBy, email, replaceEmail },
            transaction
          );
          break;

        case ENTITY_TYPE.CHAIN_ADMIN:
          user = await UserRepository.chainSignup(
            {
              ...params,
              email,
              role,
              invitedBy
            },
            transaction
          );
          break;

        default:
          user = await UserRepository.create(
            { ...params, role, invitedBy },
            transaction
          );
          break;
      }

      const contactEmail = replaceEmail || email;

      await sendWelcomeEmail(
        contactEmail,
        getFullName(user.firstName, user.lastName)
      );
      await transaction?.commit();

      return user;
    } catch (error) {
      await transaction?.rollback();
      throw error;
    }
  }

  public async getInvitedStore(email: string): Promise<User> {
    const sequelize = User.sequelize;

    if (!sequelize) {
      throw new Error("Sequelize instance is not available");
    }

    const user = await User.findOne({
      where: {
        email
      },
      attributes: {
        exclude: [
          "passwordHash",
          "refreshToken",
          "lastLogin",
          "created_at",
          "updated_at",
          "deleted_at",
          "createdAt",
          "updatedAt",
          "deletedAt"
        ]
      },
      include: [
        {
          model: UserRole,
          as: "userRole",
          attributes: ["id", "associatedUserId"],
          include: [
            {
              model: Store,
              as: "store",
              attributes: ["id", "name", "logo", "storeName"]
            }
          ]
        }
      ]
    });

    if (!user) {
      throw new Error("User not found with this invitation");
    }

    return user;
  }

  public async cancelUserInvite(
    userId: number,
    loggedInUserID: number,
    chainId?: number
  ): Promise<any> {
    const sequelize = User.sequelize;

    if (!sequelize) {
      throw new Error("Sequelize instance is not available");
    }

    const status = await AuthRepository.cancelUserInvite(
      userId,
      loggedInUserID,
      chainId
    );

    return status;
  }

  public async getInvitedSalesRep(userId: number): Promise<User> {
    const sequelize = User.sequelize;

    if (!sequelize) {
      throw new Error("Sequelize instance is not available");
    }

    const user = await User.findOne({
      where: {
        id: userId
      },
      attributes: {
        exclude: [
          "passwordHash",
          "refreshToken",
          "lastLogin",
          "created_at",
          "updated_at",
          "deleted_at",
          "createdAt",
          "updatedAt",
          "deletedAt"
        ]
      },
      include: [
        {
          model: UserRole,
          as: "userRole",
          attributes: ["id", "associatedUserId"],
          include: [
            {
              model: Distributor,
              as: "distributor",
              attributes: ["id", "name", "logo", "title", "organizationName"]
            }
          ]
        }
      ]
    });

    if (!user) {
      throw new Error("User not found with this invitation");
    }

    return user;
  }

  public async getInvitedGeneralManager(userId: number): Promise<User> {
    const sequelize = User.sequelize;

    if (!sequelize) {
      throw new Error("Sequelize instance is not available");
    }

    const user = await User.findOne({
      where: {
        id: userId
      },
      attributes: {
        exclude: [
          "passwordHash",
          "refreshToken",
          "lastLogin",
          "created_at",
          "updated_at",
          "deleted_at",
          "createdAt",
          "updatedAt",
          "deletedAt"
        ]
      },
      include: [
        {
          model: UserRole,
          as: "userRole",
          attributes: ["id", "associatedUserId"],
          include: [
            {
              model: Distributor,
              as: "distributor",
              attributes: ["id", "name", "logo", "title", "organizationName"]
            }
          ]
        }
      ]
    });

    if (!user) {
      throw new Error("User not found with this invitation");
    }

    return user;
  }

  public async getInvitedSalesManager(userId: number): Promise<User> {
    const sequelize = User.sequelize;

    if (!sequelize) {
      throw new Error("Sequelize instance is not available");
    }

    const user = await User.findOne({
      where: {
        id: userId
      },
      attributes: {
        exclude: [
          "passwordHash",
          "refreshToken",
          "lastLogin",
          "created_at",
          "updated_at",
          "deleted_at",
          "createdAt",
          "updatedAt",
          "deletedAt"
        ]
      },
      include: [
        {
          model: UserRole,
          as: "userRole",
          attributes: ["id", "associatedUserId"],
          include: [
            {
              model: Distributor,
              as: "distributor",
              attributes: ["id", "name", "logo", "title", "organizationName"]
            }
          ]
        }
      ]
    });

    if (!user) {
      throw new Error("User not found with this invitation");
    }

    return user;
  }

  public async getInvitedChain(userId: number): Promise<User> {
    const sequelize = User.sequelize;

    if (!sequelize) {
      throw new Error("Sequelize instance is not available");
    }

    const user = await User.findOne({
      where: {
        id: userId
      },
      attributes: {
        exclude: [
          "passwordHash",
          "refreshToken",
          "lastLogin",
          "created_at",
          "updated_at",
          "deleted_at",
          "createdAt",
          "updatedAt",
          "deletedAt"
        ]
      },
      include: [
        {
          model: UserRole,
          as: "userRole",
          attributes: ["id", "associatedUserId"],
          include: [
            {
              model: Chain,
              as: "ChainUserRole"
            }
          ]
        }
      ]
    });

    if (!user) {
      throw new Error("User not found with this invitation");
    }

    return user;
  }

  public async validateSignupRole(role: string, params: any): Promise<any> {
    let validationResult;

    switch (role) {
      case ENTITY_TYPE.MANUFACTURER:
      case ENTITY_TYPE.DISTRIBUTOR_ADMIN:
        // Note: Same fields and schema are used for DISTRIBUTOR_ADMIN and MANUFACTURER
        validationResult =
          DISTRIBUTOR_ADMIN_SIGNUP_PAYLOAD_SCHEMA.validate(params);

        if (validationResult.error) {
          throw new Error(validationResult.error.details[0].message);
        }
        break;

      case ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE:
      case ENTITY_TYPE.MANUFACTURER_EXECUTIVE:
      case ENTITY_TYPE.MANUFACTURER_ACCOUNT_MANAGER:
        validationResult =
          DISTRIBUTOR_EXECUTIVE_SIGNUP_PAYLOAD_SCHEMA.validate(params);

        if (validationResult.error) {
          throw new Error(validationResult.error.details[0].message);
        }
        break;

      case ENTITY_TYPE.STORE:
        validationResult = params.token
          ? STORE_SIGNUP_PAYLOAD_SCHEMA.validate(params)
          : STORE_INVITE_PAYLOAD_SCHEMA.validate(params);

        if (validationResult.error) {
          throw new Error(validationResult.error.details[0].message);
        }
        break;

      case ENTITY_TYPE.DISTRIBUTOR_SALES_REP:
      case ENTITY_TYPE.DISTRIBUTOR_SALES_MANAGER:
        validationResult = validationResult = params.token
          ? DISTRIBUTOR_SALES_REP_SIGNUP_PAYLOAD_SCHEMA.validate(params)
          : DISTRIBUTOR_SALES_REP_INVITE_PAYLOAD_SCHEMA.validate(params);

        if (validationResult.error) {
          throw new Error(validationResult.error.details[0].message);
        }
        break;

      case ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER:
        validationResult = validationResult = params.token
          ? DISTRIBUTOR_SALES_REP_SIGNUP_PAYLOAD_SCHEMA.validate(params)
          : DISTRIBUTOR_GENERAL_MANAGER_INVITE_PAYLOAD_SCHEMA.validate(params);

        if (validationResult.error) {
          throw new Error(validationResult.error.details[0].message);
        }
        break;

      case ENTITY_TYPE.CHAIN_ADMIN:
        validationResult = params.token
          ? CHAIN_ADMIN_SIGNUP_PAYLOAD_SCHEMA.validate(params)
          : CHAIN_ADMIN_INVITE_PAYLOAD_SCHEMA.validate(params);
        break;
      default:
        throw new Error("User not allowed to signup");
    }
  }

  public validateInvitationRoles(userRole: string, users: any[]) {
    const invitationRules: Record<string, string[]> = {
      [ENTITY_TYPE.SUPER_ADMIN]: [
        ENTITY_TYPE.DISTRIBUTOR_ADMIN,
        ENTITY_TYPE.MANUFACTURER
      ],
      [ENTITY_TYPE.DISTRIBUTOR_ADMIN]: [
        ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE,
        ENTITY_TYPE.DISTRIBUTOR_SALES_REP,
        ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER,
        ENTITY_TYPE.DISTRIBUTOR_SALES_MANAGER
      ],
      [ENTITY_TYPE.MANUFACTURER]: [
        ENTITY_TYPE.MANUFACTURER_EXECUTIVE,
        ENTITY_TYPE.MANUFACTURER_ACCOUNT_MANAGER
      ],
      [ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE]: [
        ENTITY_TYPE.DISTRIBUTOR_SALES_REP,
        ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER,
        ENTITY_TYPE.STORE
      ]
    };
    const errorMessages: Record<string, string> = {
      [ENTITY_TYPE.SUPER_ADMIN]:
        "You can invite only Manufacturer and Distributor Admins.",
      [ENTITY_TYPE.DISTRIBUTOR_ADMIN]:
        "You can invite only Distributor Executive, Sales Executive and Stores",
      [ENTITY_TYPE.MANUFACTURER]:
        "You can invite only Manufacturer Executive and Account Manager",
      [ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE]:
        "You can invite only Sales Rep and Stores",
      default: "You are not allowed to invite new user."
    };
    const allowedRoles = invitationRules[userRole];

    const allUsersHaveAllowedRole = (roles: string[]) =>
      users.every((user) => roles.includes(user.role));

    if (!allowedRoles || !allUsersHaveAllowedRole(allowedRoles)) {
      return errorMessages[userRole] || errorMessages.default;
    }

    return "";
  }

  // public validateInvitationRoles(userRole: string, users: string[]) {
  //   let invitationPermissionErr: string = "";

  //   const isAllowedRole = (roles: string[]) => {
  //     return (
  //       users.filter(({ role }: any) => roles.includes(role)).length ==
  //       users.length
  //     );
  //   };

  //   switch (userRole) {
  //     case ENTITY_TYPE.SUPER_ADMIN:
  //       if (
  //         !isAllowedRole([
  //           ENTITY_TYPE.DISTRIBUTOR_ADMIN,
  //           ENTITY_TYPE.MANUFACTURER
  //         ])
  //       ) {
  //         invitationPermissionErr =
  //           "You can invite only Manufacturer and Distributor Admins.";
  //       }
  //       break;

  //     case ENTITY_TYPE.DISTRIBUTOR_ADMIN:
  //       if (
  //         !isAllowedRole([
  //           ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE,
  //           ENTITY_TYPE.DISTRIBUTOR_SALES_REP
  //         ])
  //       ) {
  //         invitationPermissionErr =
  //           "You can invite only Distributor Executive, Sales Executive and Stores";
  //       }
  //       break;

  //     case ENTITY_TYPE.MANUFACTURER: // To Do
  //       if (!isAllowedRole([ENTITY_TYPE.MANUFACTURER_EXECUTIVE])) {
  //         invitationPermissionErr =
  //           "You can invite only Manufacturer Executive";
  //       }
  //       break;

  //     case ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE:
  //       if (
  //         !isAllowedRole([ENTITY_TYPE.DISTRIBUTOR_SALES_REP, ENTITY_TYPE.STORE])
  //       ) {
  //         invitationPermissionErr = "You can invite only Sales Rep and Stores";
  //       }
  //       break;

  //     case ENTITY_TYPE.DISTRIBUTOR_SALES_REP:
  //     default:
  //       invitationPermissionErr = "You are not allowed to invite new user.";
  //       break;
  //   }

  //   return invitationPermissionErr;
  // }

  /**
   * Sends a reset password email to the user.
   *
   * @param email - The email address of the user.
   * @returns A promise that resolves when the email is successfully sent.
   */
  public async sendResetPasswordEmail(email: string): Promise<void> {
    try {
      const user = await AuthRepository.findUserByEmail(email);

      if (!user) {
        throw new Error(ERROR_MESSAGES.USER.NOT_FOUND);
      }

      // Generate JWT Token
      const token = generateJwtToken(email);
      const expireAt = new Date();
      expireAt.setMinutes(expireAt.getMinutes() + 15); // Token expires in 15 Minutes

      // Save Details into the table
      await AuthRepository.saveResetPasswordToken({
        userId: user.id,
        email,
        token,
        expireAt
      });

      // Send Reset Password Email
      await sendResetPasswordEmail(
        user.email,
        getFullName(user.firstName, user.lastName),
        token
      );
    } catch (error: any) {
      throw new Error(error?.message || "Unable to Send Reset Password Email.");
    }
  }

  /**
   * Validates the reset password token.
   *
   * @param token - The reset password token.
   * @returns A promise that resolves to a boolean indicating if the token is valid.
   */
  public async validatePasswordResetToken(token: string): Promise<boolean> {
    const resetPassword =
      await AuthRepository.validatePasswordResetToken(token);

    return !!resetPassword;
  }

  /**
   * Resets the user's password.
   *
   * @param token - The reset password token.
   * @param newPassword - The new password.
   * @returns A promise that resolves when the password is successfully reset.
   */
  public async resetPassword(
    token: string,
    newPassword: string
  ): Promise<void> {
    try {
      return await AuthRepository.updateUserPassword(token, newPassword);
    } catch (error: any) {
      throw new Error(error?.message || ERROR_MESSAGES.AUTH.PASSWORD_UPDATE);
    }
  }

  /**
   * Replaces the email address associated with a signup invitation and sends a new invitation email.
   *
   * This method validates the provided old and new email addresses, checks for the existence of a user
   * with the new email address, and updates the signup invitation to reflect the new email.
   * If successful, a new invitation email is sent to the new email address.
   *
   * @param oldEmail - The current email address associated with the signup invitation.
   * @param newEmail - The new email address to associate with the signup invitation.
   * @returns A promise that resolves when the email replacement and invitation email sending process is complete.
   * @throws An error if the email addresses are invalid, if a user already exists with the new email,
   *         or if the token associated with the old email is not found.
   */
  public async replaceEmailInvite(
    oldEmail: string,
    newEmail: string
  ): Promise<void> {
    const transaction = await sequelize.transaction();
    try {
      // validate emails
      if (!validateEmail(oldEmail)) {
        throw new Error(
          `Invalid email address. Please correct the it proceeding: ${oldEmail}`
        );
      }

      if (!validateEmail(newEmail)) {
        throw new Error(
          `Invalid email address. Please correct the it proceeding: ${newEmail}`
        );
      }

      // check if user already exists with new email
      const existingUserWithNewEmail =
        await AuthRepository.findUserByEmail(newEmail);

      if (existingUserWithNewEmail) {
        throw new Error(
          `The email address is already associated with existing account: ${existingUserWithNewEmail.email}`
        );
      }

      const existingUserWithOldEmail: User | null =
        await AuthRepository.findUserByEmail(oldEmail);
      if (!existingUserWithOldEmail) {
        throw new Error(`User not found with email: ${oldEmail}`);
      }

      const existingUserRole = await UserRole.findOne({
        where: { user_id: existingUserWithOldEmail.id }
      });

      if (!existingUserRole) {
        throw new Error(`User Role not found with email: ${oldEmail}`);
      }

      const token = await AuthRepository.replaceEmailInvite(
        oldEmail,
        newEmail,
        existingUserRole.role,
        transaction
      );

      await sendInvitationEmail(newEmail, token);
      await transaction.commit();
    } catch (error: any) {
      await transaction.rollback();
      throw new Error(error?.message || ERROR_MESSAGES.AUTH.PASSWORD_UPDATE);
    }
  }
}

export default new AuthService();

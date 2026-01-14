import { Op, Sequelize, Transaction } from "sequelize";

import {
  ENTITY_TYPE,
  ENTITY_TYPE_LONG_MISC,
  ENTITY_TYPE_SHORT,
  USER_STATUS
} from "../config/appConstants";
import { USER_ROLES } from "../config/roles";
import Chain from "../models/Chain";
import ChainStore from "../models/ChainStore";
import Distributor from "../models/Distributor";
import DistributorManagerWarehouse from "../models/DistributorManagerWarehouse";
import EntityAccessMapping from "../models/EntityAccessMapping";
import Manufacturer from "../models/Manufacturer";
import SignupInvitation from "../models/SignupInvitation";
import Store from "../models/Store";
import User from "../models/User";
import UserRole from "../models/UserRole";
import {
  getUserByIdApiRes,
  updateProfileDetailsReqBody
} from "../types/UserTypes";
import { getHashedPassword } from "../utils/helpers";
import LoginRelatedAccountsRepository from "./LoginRelatedAccountsRepository";
import UserRoleRepository from "./UserRoleRepository";

const dotenv = require("dotenv");
dotenv.config();

export type UserPayload = {
  token: string;
  email: string;
  firstName: string;
  lastName: string;
  phones: string[];
  password: string;
  city: string;
  state: string;
  address: string;
  zip: string;
  role: string;
  logo: string | null;
  title: string | null;
  orgName: string | null;
  storeName?: string | null;
  invitedBy: number;
  replaceEmail?: string;
  invitationId?: number;
};

class UserRepository {
  /**
   * Retrieves user details by their ID.
   * Checks if a record exists in the database with the given entityId and returns its data.
   * @param {number} userID The ID of the user to be retrieved.
   * @returns {Promise<getUserByIdApiRes>} A promise that resolves with the user data or an error message.
   */
  public async getUserById(
    userID: number,
    role: string
  ): Promise<getUserByIdApiRes> {
    const sequelize = User.sequelize;
    if (!sequelize) {
      return { status: 500, data: "Sequelize instance is not available" };
    }

    // First, check if any record exists with the given entityId and entityType
    const user = await User.findOne({
      where: { id: userID },
      attributes: {
        exclude: ["passwordHash", "refreshToken", "deletedAt", "deleted_at"]
      }
    });

    if (!user) {
      return { status: 404, data: `User not found with ID ${userID}` };
    }

    const userRole = await UserRole.findOne({
      where: { userId: userID }
    });

    switch (role) {
      case ENTITY_TYPE.DISTRIBUTOR_ADMIN: {
        const distributorAdmin = await Distributor.findOne({
          where: { id: userRole?.associatedUserId }
        });

        return {
          status: 200,
          data: {
            ...user.dataValues,
            distributorName: distributorAdmin?.organizationName,
            title: distributorAdmin?.title,
            logo: distributorAdmin?.logo ?? ""
          }
        };
      }

      case ENTITY_TYPE.MANUFACTURER: {
        const manufacturer = await Manufacturer.findOne({
          where: { id: userRole?.associatedUserId }
        });

        return {
          status: 200,
          data: {
            ...user.dataValues,
            distributorName: manufacturer?.dataValues?.organizationName,
            title: manufacturer?.dataValues?.title,
            logo: manufacturer?.dataValues?.logo ?? ""
          }
        };
      }

      case ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE:
      case ENTITY_TYPE.DISTRIBUTOR_SALES_REP: {
        const distributor = await Distributor.findOne({
          where: { id: userRole?.parentEntityId }
        });

        const parentUserRole = await UserRole.findOne({
          where: {
            associatedUserId: userRole?.parentEntityId,
            associatedEntityType: ENTITY_TYPE.DISTRIBUTOR
          }
        });

        const parentUser = await User.findOne({
          where: { id: parentUserRole?.userId },
          attributes: ["address", "city", "state", "zip"]
        });

        return {
          status: 200,
          data: {
            ...user.dataValues,
            ...parentUser?.dataValues,
            distributorName: distributor?.organizationName,
            title: distributor?.title,
            logo: distributor?.logo ?? ""
          }
        };
      }

      case ENTITY_TYPE.MANUFACTURER_EXECUTIVE: {
        const manufacturer = await Manufacturer.findOne({
          where: { id: userRole?.parentEntityId }
        });

        const parentUserRole = await UserRole.findOne({
          where: {
            associatedUserId: userRole?.parentEntityId,
            associatedEntityType: ENTITY_TYPE.MANUFACTURER
          }
        });

        const parentUser = await User.findOne({
          where: { id: parentUserRole?.userId },
          attributes: ["address", "city", "state", "zip"]
        });

        return {
          status: 200,
          data: {
            ...user.dataValues,
            ...parentUser?.dataValues,
            distributorName: manufacturer?.organizationName,
            logo: manufacturer?.logo ?? ""
          }
        };
      }

      case ENTITY_TYPE.STORE: {
        const store = await Store.findOne({
          where: { id: userRole?.associatedUserId }
        });

        return {
          status: 200,
          data: {
            ...user.dataValues,
            storeName: store?.storeName,
            logo: store?.logo ?? ""
          }
        };
      }

      case ENTITY_TYPE.CHAIN_ADMIN: {
        const chain = await Chain.findOne({
          where: { id: userRole?.associatedUserId }
        });

        return {
          status: 200,
          data: {
            ...user.dataValues,
            chainName: chain?.name,
            logo: ""
          }
        };
      }

      default:
        // Handle the case where the role doesn't match any of the above
        return {
          status: 200,
          data: user.dataValues
        };
    }
  }

  public async updateUserDetails(
    postBody: updateProfileDetailsReqBody,
    role: string
  ): Promise<any> {
    const sequelize = User.sequelize;
    if (!sequelize) {
      return { status: 500, data: "Sequelize instance is not available" };
    }

    // First, check if any record exists with the given entityId and entityType
    const existingUser = await User.findOne({
      where: { id: postBody.userID }
    });

    if (!existingUser) {
      return { status: 404, data: `User not found with ID ${postBody.userID}` };
    }

    const userRole = await UserRole.findOne({
      where: {
        userId: postBody.userID
      }
    });

    const { firstName, lastName } = postBody;

    switch (role) {
      case ENTITY_TYPE.MANUFACTURER:
      case ENTITY_TYPE.MANUFACTURER_EXECUTIVE: {
        const manufacturer = await Manufacturer.findOne({
          where: { id: userRole?.associatedUserId }
        });

        // Validate organizationName
        if (manufacturer && postBody.manufacturerName) {
          const matchedManufacturer = await Manufacturer.findOne({
            where: {
              organizationName: postBody.manufacturerName.trim(),
              id: { [Op.ne]: manufacturer.id }
            }
          });

          if (matchedManufacturer) {
            throw new Error(
              `Manufacturer already exist with same Manufacturer Name: ${postBody.manufacturerName}`
            );
          }
        }

        const updatedManufacturer = await manufacturer?.update({
          name:
            role == ENTITY_TYPE.MANUFACTURER_EXECUTIVE
              ? `${firstName} ${lastName}`.trim()
              : postBody.manufacturerName?.trim(),
          organizationName: postBody.manufacturerName?.trim(),
          updated_at: new Date(),
          ...(postBody.logo ? { logo: postBody.logo } : "")
        });

        const updatedAdmin = await existingUser.update({
          ...postBody,
          updated_at: new Date()
        });

        return {
          ...updatedAdmin.dataValues,
          organizationName: updatedManufacturer?.dataValues?.organizationName
        };
      }

      case ENTITY_TYPE.DISTRIBUTOR_ADMIN: {
        const distributor = await Distributor.findOne({
          where: { id: userRole?.associatedUserId }
        });

        // Validate organizationName
        if (distributor && postBody.distributorName) {
          const matchedDistributor = await Distributor.findOne({
            where: {
              organizationName: postBody.distributorName.trim(),
              id: { [Op.ne]: distributor.id }
            }
          });

          if (matchedDistributor) {
            throw new Error(
              `Distributor already exist with same Distributor Name: ${postBody.distributorName}`
            );
          }
        }

        const updatedDistributor = await distributor?.update({
          name: `${firstName} ${lastName}`.trim(),
          organizationName: postBody.distributorName,
          title: postBody.title,
          logo: postBody.logo ?? "",
          updated_at: new Date()
        });

        const updatedAdmin = await existingUser.update({
          ...postBody,
          updated_at: new Date()
        });

        return {
          ...updatedAdmin.dataValues,
          distributorName: updatedDistributor?.organizationName,
          title: updatedDistributor?.title
        };
      }

      case ENTITY_TYPE.DISTRIBUTOR_SALES_REP:
      case ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE: {
        const updatedAdmin = await existingUser.update({
          ...postBody,
          updated_at: new Date()
        });

        const distributorParent = await Distributor.findOne({
          where: { id: userRole?.parentEntityId }
        });

        return {
          ...updatedAdmin.dataValues,
          distributorName: distributorParent?.organizationName,
          title: distributorParent?.title
        };
      }

      case ENTITY_TYPE.STORE: {
        const store = await Store.findOne({
          where: { id: userRole?.associatedUserId }
        });

        const updatedStore = await store?.update({
          name: `${firstName} ${lastName}`.trim(),
          storeName: postBody.storeName,
          logo: postBody.logo ?? "",
          updated_at: new Date()
        });

        const updatedStoreUser = await existingUser.update({
          ...postBody,
          updated_at: new Date()
        });

        return {
          ...updatedStoreUser.dataValues,
          storeName: updatedStore?.storeName
        };
      }

      default: {
        // Handle the case where the role doesn't match any of the above
        const updatedUser = await existingUser.update({
          ...postBody,
          updated_at: new Date()
        });

        return updatedUser.dataValues;
      }
    }
  }

  /**
   * Retrieves all users related to a specific parent entity ID with pagination.
   * @param {number} parentEntityId The parent entity ID to search for.
   * @param {number} limit The number of items per page.
   * @param {number} offset The offset for pagination.
   * @returns A promise that resolves with the list of users and total results.
   */
  public async getUsersList(
    role: string,
    user: User,
    limit: number,
    offset: number,
    sort: string,
    searchQuery: string | null = null,
    status: string | null = null,
    type: string | null = null
  ): Promise<{ users: User[]; totalRes: number }> {
    let parentId: number | null = null;

    const userRole = await UserRole.findOne({
      where: { user_id: user.id }
    });

    switch (role) {
      case ENTITY_TYPE.DISTRIBUTOR_ADMIN:
      case ENTITY_TYPE.MANUFACTURER: {
        parentId = userRole?.associatedUserId || null;
        break;
      }

      case ENTITY_TYPE.MANUFACTURER_EXECUTIVE:
      case ENTITY_TYPE.DISTRIBUTOR_SALES_REP:
      case ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE: {
        parentId = userRole?.parentEntityId || null;
        break;
      }

      default: {
        throw new Error("Invalid Role");
      }
    }

    if (!parentId) {
      throw new Error(`No associated user found for user id: ${user.id}`);
    }

    // Add search query filter
    const userFilter = {
      ...(searchQuery
        ? {
            [Op.or]: [
              { firstName: { [Op.iLike]: `%${searchQuery}%` } },
              { lastName: { [Op.iLike]: `%${searchQuery}%` } }
            ]
          }
        : {}),
      // Temporary hide user ID: 1812 for PROD only
      ...(process.env.APP_ENV == "prod" ? { id: { [Op.ne]: 1812 } } : null),
      ...(status
        ? {
            [Op.and]: [{ status }]
          }
        : null)
    };

    const getRoleFilter = () => {
      if (role === ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE) {
        return {
          role: {
            [Op.in]: [
              ENTITY_TYPE.DISTRIBUTOR_SALES_REP,
              ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER
            ]
          }
        };
      }

      if (role === ENTITY_TYPE.MANUFACTURER_EXECUTIVE) {
        return { role: ENTITY_TYPE.MANUFACTURER_EXECUTIVE };
      }

      return {};
    };

    const roleFilter = type ? { role: type } : getRoleFilter();

    const getEntityTypeFilter = () => {
      switch (role) {
        case ENTITY_TYPE.DISTRIBUTOR_ADMIN:
        case ENTITY_TYPE.DISTRIBUTOR_SALES_REP:
        case ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE:
          return {
            parentEntityType: ENTITY_TYPE.DISTRIBUTOR,
            associatedEntityType: ENTITY_TYPE.DISTRIBUTOR
          };

        case ENTITY_TYPE.MANUFACTURER_EXECUTIVE:
        case ENTITY_TYPE.MANUFACTURER:
          return {
            parentEntityType: ENTITY_TYPE.MANUFACTURER,
            associatedEntityType: ENTITY_TYPE.MANUFACTURER
          };

        default: {
          throw new Error("Invalid Role");
        }
      }
    };

    const { count, rows } = await User.findAndCountAll({
      attributes: [
        "id",
        "email",
        "firstName",
        "lastName",
        "phone",
        "status",
        "createdAt"
      ],
      include: [
        {
          model: UserRole,
          attributes: ["role", "associatedUserId"],
          where: {
            parentEntityId: parentId,
            ...getEntityTypeFilter(),
            ...roleFilter
          },
          required: true
        }
      ],
      where: userFilter,
      limit,
      offset,
      order: [["firstName", sort]]
    });

    return { users: rows, totalRes: count };
  }

  public async getAllUsersForSuperAdmin(
    limit: number,
    offset: number,
    sort: string,
    searchQuery: string | null = null,
    status: string | null = null,
    type: string | null = null
  ): Promise<{ users: User[]; totalRes: number }> {
    const userFilter = {
      ...(searchQuery
        ? {
            [Op.or]: [
              { email: { [Op.iLike]: `%${searchQuery}%` } },
              { firstName: { [Op.iLike]: `%${searchQuery}%` } },
              { lastName: { [Op.iLike]: `%${searchQuery}%` } },
              {
                "$UserRole.AssociatedManufacturer.organization_name$": {
                  [Op.iLike]: `%${searchQuery}%`
                }
              },
              {
                "$UserRole.AssociatedManufacturer.name$": {
                  [Op.iLike]: `%${searchQuery}%`
                }
              },
              {
                "$UserRole.AssociatedDistributor.organization_name$": {
                  [Op.iLike]: `%${searchQuery}%`
                }
              },
              {
                "$UserRole.AssociatedDistributor.name$": {
                  [Op.iLike]: `%${searchQuery}%`
                }
              },
              {
                "$UserRole.AssociatedStore.name$": {
                  [Op.iLike]: `%${searchQuery}%`
                }
              },
              {
                "$UserRole.AssociatedStore.name$": {
                  [Op.iLike]: `%${searchQuery}%`
                }
              }
            ]
          }
        : {}),
      ...(status
        ? {
            [Op.and]: [{ status }]
          }
        : null)
    };

    // Construct the role filter
    const roleConditions: any[] = [
      { role: { [Op.not]: ENTITY_TYPE.SUPER_ADMIN } } // Exclude SUPER_ADMIN
    ];

    if (type) {
      roleConditions.push({ role: type }); // Include type condition if provided
    }

    let parentEntityJoin: any = null;
    switch (type) {
      case ENTITY_TYPE.MANUFACTURER_EXECUTIVE:
        parentEntityJoin = {
          model: UserRole,
          as: "ParentUserRole",
          required: false,
          attributes: ["role"],
          where: {
            [Op.and]: [
              Sequelize.where(Sequelize.col("UserRole.role"), {
                [Op.in]: [ENTITY_TYPE.MANUFACTURER_EXECUTIVE]
              }),
              Sequelize.where(
                Sequelize.col("UserRole.ParentUserRole.role"),
                ENTITY_TYPE.MANUFACTURER
              )
            ]
          },
          include: [
            {
              model: Manufacturer,
              as: "AssociatedManufacturer",
              required: false,
              attributes: ["name", "organizationName"]
            }
          ]
        };
        break;
      case ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE:
      case ENTITY_TYPE.CHAIN_ADMIN:
      case ENTITY_TYPE.DISTRIBUTOR_SALES_REP:
      case ENTITY_TYPE.DISTRIBUTOR_SALES_MANAGER:
      case ENTITY_TYPE.STORE:
        parentEntityJoin = {
          model: UserRole,
          as: "ParentUserRole",
          required: false,
          attributes: ["role"],
          where: {
            [Op.and]: [
              Sequelize.where(Sequelize.col("UserRole.role"), {
                [Op.in]: [
                  ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE,
                  ENTITY_TYPE.CHAIN_ADMIN,
                  ENTITY_TYPE.DISTRIBUTOR_SALES_REP,
                  ENTITY_TYPE.STORE,
                  ENTITY_TYPE.DISTRIBUTOR_SALES_MANAGER
                ]
              }),
              Sequelize.where(
                Sequelize.col("UserRole.ParentUserRole.role"),
                ENTITY_TYPE.DISTRIBUTOR_ADMIN
              )
            ]
          },
          include: [
            {
              model: Distributor,
              as: "AssociatedDistributor",
              required: false,
              attributes: ["name", "organizationName"]
            }
          ]
        };
    }

    const userRoleIncludes = [
      {
        model: Manufacturer,
        as: "AssociatedManufacturer",
        required: false,
        attributes: ["name", "organizationName"],
        where: Sequelize.where(
          Sequelize.col("UserRole.role"),
          ENTITY_TYPE.MANUFACTURER
        )
      },
      {
        model: Store,
        as: "AssociatedStore",
        required: false,
        attributes: ["name", "externalStoreId"],
        where: Sequelize.where(
          Sequelize.col("UserRole.role"),
          ENTITY_TYPE.STORE
        )
      },
      {
        model: Distributor,
        as: "AssociatedDistributor",
        required: false,
        attributes: ["name", "organizationName"],
        where: Sequelize.where(Sequelize.col("UserRole.role"), {
          [Op.in]: [ENTITY_TYPE.DISTRIBUTOR, ENTITY_TYPE.DISTRIBUTOR_ADMIN]
        })
      },
      {
        model: Distributor,
        as: "ParentDistributor",
        required: false,
        attributes: ["name", "organizationName"],
        where: Sequelize.where(Sequelize.col("UserRole.role"), {
          [Op.in]: [
            ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE,
            ENTITY_TYPE.DISTRIBUTOR_SALES_REP,
            ENTITY_TYPE.DISTRIBUTOR_SALES_MANAGER
          ]
        })
      }
    ];

    if (parentEntityJoin) {
      userRoleIncludes.push(parentEntityJoin);
    }

    const { count, rows } = await User.findAndCountAll({
      attributes: [
        "id",
        "email",
        "firstName",
        "lastName",
        "phone",
        "status",
        "createdAt"
      ],
      include: [
        {
          model: UserRole,
          attributes: [
            "parent_entity_id",
            "parent_entity_type",
            "associated_user_id",
            "associated_entity_type",
            "role"
          ],
          where: {
            [Op.and]: roleConditions
          },
          required: true,
          include: userRoleIncludes
        }
      ],
      where: userFilter,
      limit,
      offset,
      order: [["firstName", sort]]
    });

    return { users: rows, totalRes: count };
  }

  public async getFormattedUserPayload(payload: UserPayload, isUpdate = false) {
    const {
      email,
      firstName,
      lastName,
      phones,
      password,
      city,
      state,
      address,
      zip
    } = payload;

    const [phone, secondaryPhone] = phones;

    const userPayload: any = {
      email,
      passwordHash: await getHashedPassword(password),
      firstName,
      lastName,
      city,
      state,
      address,
      zip,
      phone: phone || null,
      secondaryPhone: secondaryPhone || null,
      isActive: true,
      status: "ACTIVE",
      lastLogin: null,
      created_at: new Date(),
      updated_at: new Date()
    };

    if (isUpdate) {
      userPayload.created_at = undefined;
    }

    return userPayload;
  }

  /**
   * Creates a new user and associated records in the database.
   *
   * This method checks if a user with the given email already exists.
   * If not, it creates a new user, an associated user entity, and a user role.
   * It also deletes the signup invitation using the provided token.
   *
   * @param {any} payload - The data required to create a new user, including email, name, phones, password, and more.
   * @returns {Promise<any>} A promise that resolves with the created user role or throws an error if the user already exists.
   * @throws {Error} If a user with the given email already exists.
   */
  public async create(
    payload: UserPayload,
    transaction: Transaction
  ): Promise<User> {
    const {
      token,
      email,
      role,
      title,
      orgName,
      invitedBy,
      replaceEmail,
      storeName = null,
      invitationId
    } = payload;

    const user = await User.findOne({ where: { email } });
    if (user && !replaceEmail) {
      throw new Error(`User (${email}) already exist.`);
    }

    const userPayload = await this.getFormattedUserPayload(payload);

    // Replace Email Signup Setup
    if (user && replaceEmail) {
      // update users table
      user.firstName = userPayload.firstName;
      user.lastName = userPayload.lastName;
      user.email = replaceEmail;
      user.address = userPayload.address;
      user.city = userPayload.city;
      user.state = userPayload.state;
      user.zip = userPayload.zip;
      user.passwordHash = userPayload.passwordHash;
      user.phone = userPayload.phone;
      user.isActive = userPayload.isActive;
      user.status = userPayload.status;
      user.lastLogin = userPayload.lastLogin;
      await user.save({ transaction });

      // find associated_user_id
      const userRole = await UserRole.findOne({
        where: {
          user_id: user.id
        }
      });

      if (userRole) {
        switch (userRole.role) {
          case USER_ROLES.DISTRIBUTOR_ADMIN:
          case USER_ROLES.DISTRIBUTOR_SALES_REP:
          case USER_ROLES.DISTRIBUTOR_EXECUTIVE:
          case USER_ROLES.DISTRIBUTOR_GENERAL_MANAGER:
            {
              const distributor = await Distributor.findOne({
                where: {
                  id: userRole.associatedUserId
                }
              });

              if (distributor) {
                if (payload.orgName) {
                  // Validate organizationName
                  const matchedDistributor = await Distributor.findOne({
                    where: {
                      organizationName: payload.orgName,
                      id: { [Op.ne]: distributor.id }
                    }
                  });

                  if (matchedDistributor) {
                    throw new Error(
                      `Distributor already exist with same Distributor Name: ${payload.orgName}`
                    );
                  }
                }

                distributor.organizationName = payload.orgName || "";
                distributor.name =
                  userPayload.firstName + " " + userPayload.lastName;
                distributor.logo = payload.logo || "";
                await distributor.save({ transaction });
              }
            }
            break;

          case USER_ROLES.MANUFACTURER:
          case USER_ROLES.MANUFACTURER_EXECUTIVE:
          case USER_ROLES.MANUFACTURER_ACCOUNT_MANAGER:
            {
              const manufacturer = await Manufacturer.findOne({
                where: {
                  id: userRole.associatedUserId
                }
              });

              if (manufacturer) {
                if (orgName) {
                  // Validate organizationName
                  const matchedManufacturer = await Manufacturer.findOne({
                    where: {
                      organizationName: orgName,
                      id: { [Op.ne]: manufacturer.id }
                    }
                  });

                  if (matchedManufacturer) {
                    throw new Error(
                      `Manufacturer already exist with same Manufacturer Name: ${orgName}`
                    );
                  }
                }

                manufacturer.organizationName = payload.orgName || "";
                manufacturer.logo = payload.logo || "";

                manufacturer.name =
                  userRole.role == USER_ROLES.MANUFACTURER_EXECUTIVE
                    ? userPayload.firstName + " " + userPayload.lastName
                    : payload.orgName || "";

                await manufacturer.save({ transaction });
              }
            }
            break;
          default:
            break;
        }
      }

      await this.markInvitationAsCompleted(token, transaction);
      return user;
    }

    const newUser = await User.create(userPayload, { transaction });

    const associatedUserRole =
      await UserRoleRepository.getAssociatedUser(invitedBy);

    if (!associatedUserRole) {
      throw new Error(
        `Associated user for invitedBy (${invitedBy}) not found.`
      );
    }

    const inviteByRole = associatedUserRole.role;
    // Create Associated User
    const associatedUser = await UserRoleRepository.createAssociatedUser(
      {
        ...payload,
        title,
        orgName,
        storeName
      },
      transaction
    );
    let parentEntityId = null;
    let parentEntityType = null;

    if (inviteByRole !== ENTITY_TYPE.SUPER_ADMIN) {
      parentEntityId = associatedUserRole.associatedUserId;
      parentEntityType = associatedUserRole.associatedEntityType;
    }

    // update account manager access mapping relation id after entity user roles creation
    if (role == ENTITY_TYPE.MANUFACTURER_ACCOUNT_MANAGER && invitationId) {
      // the fields to update
      const updatedFields = {
        parentEntityId: associatedUser.id,
        parentEntityType: role,
        updatedAt: new Date() // Update timestamp
      };

      // Perform the bulk update
      await EntityAccessMapping.update(updatedFields, {
        where: {
          parent_entity_id: invitationId,
          parent_entity_type: USER_STATUS.INVITATION_SENT
        },
        transaction
      });
    }

    // update distributor General manager - warehouse mapping relation id after entity user roles creation
    if (role == ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER && invitationId) {
      // the fields to update
      const updatedFields = {
        distributorId: associatedUser.id,
        role: role,
        updatedAt: new Date() // Update timestamp
      };

      // Perform the bulk update
      await DistributorManagerWarehouse.update(updatedFields, {
        where: {
          distributor_id: invitationId,
          role: USER_STATUS.INVITATION_SENT
        },
        transaction
      });
    }

    if (payload.role != ENTITY_TYPE.CHAIN_ADMIN) {
      // Create User Role
      // Chain is already created, so we skip creating new entity for chain
      await UserRoleRepository.createUserRole(
        { role, userId: newUser.id, parentEntityId, parentEntityType },
        associatedUser,
        transaction
      );
    }

    await this.markInvitationAsCompleted(token, transaction);

    return newUser;
  }

  /**
   * Marks the invitation as completed by updating the invitation status to "completed", deleting at to the current timestamp, setting the completed_at timestamp to the current time, and updating the updated_at timestamp.
   *
   * @param {string} token - The unique token associated with the invitation.
   * @param {Transaction} transaction - The Sequelize transaction that this operation is part of.
   * @returns {Promise<void>} A promise that resolves when the invitation status has been updated.
   * @throws {Error} If there is an issue updating the invitation status.
   */
  public async markInvitationAsCompleted(
    token: string,
    transaction: Transaction
  ) {
    return await SignupInvitation.update(
      {
        status: "completed",
        deleted_at: new Date(),
        completed_at: new Date(),
        updated_at: new Date()
      },
      { transaction, where: { token } }
    );
  }

  public async storeSignup(
    payload: UserPayload,
    transaction: Transaction
  ): Promise<User> {
    const { token, email, storeName, firstName, lastName, logo } = payload;

    const user = await User.findOne({ where: { email } });

    if (!user) {
      throw new Error(`User not found.`);
    }

    const userPayload = await this.getFormattedUserPayload(payload, true);

    const updatedUser = await user.update(userPayload, { transaction });

    const associatedUserId = await UserRoleRepository.getAssociatedEntityId(
      updatedUser.id
    );

    await Store.update(
      {
        storeName,
        name: `${firstName} ${lastName}`,
        logo,
        updated_at: new Date()
      },
      { transaction, where: { id: associatedUserId } }
    );

    // Delete Invitation
    await SignupInvitation.update(
      {
        status: "completed",
        deleted_at: new Date(),
        completed_at: new Date(),
        updated_at: new Date()
      },
      { transaction, where: { token } }
    );

    return updatedUser;
  }

  public async salesRepSignup(
    payload: any,
    transaction: Transaction
  ): Promise<User> {
    const { token, email, phones, firstName, lastName, password, invitedUser } =
      payload;

    const user = await User.findOne({ where: { email } });

    if (invitedUser && !user) {
      throw new Error(`User not found.`);
    }

    if (!invitedUser && user) {
      throw new Error(`User already exist.`);
    }

    const [phone, secondaryPhone] = phones;

    const updatedUser = user
      ? await user.update(
          {
            firstName,
            lastName,
            phone: phone || null,
            secondaryPhone: secondaryPhone || null,
            passwordHash: await getHashedPassword(password),
            isActive: true,
            status: "ACTIVE",
            updated_at: new Date()
          },
          { transaction }
        )
      : await User.create(
          {
            firstName,
            lastName,
            email,
            phone: phone || null,
            secondaryPhone: secondaryPhone || null,
            passwordHash: await getHashedPassword(password),
            isActive: true,
            status: "ACTIVE",
            created_at: new Date(),
            updated_at: new Date()
          },
          { transaction }
        );

    // Delete Invitation
    await SignupInvitation.update(
      {
        status: "completed",
        deleted_at: new Date(),
        completed_at: new Date(),
        updated_at: new Date()
      },

      { transaction, where: { token } }
    );

    return updatedUser;
  }

  public async chainSignup(
    payload: UserPayload,
    transaction: Transaction
  ): Promise<User> {
    const { token, email } = payload;

    const user = await User.findOne({ where: { email } });

    if (!user) {
      throw new Error(`User not found.`);
    }

    const userPayload = await this.getFormattedUserPayload(payload, true);

    const updatedUser = await user.update(userPayload, { transaction });

    const chainUserRole = await UserRole.findOne({
      where: {
        user_id: user.id
      }
    });

    const chainStores = await ChainStore.findAll({
      where: {
        chain_id: chainUserRole?.associatedUserId
      }
    });

    const chainStoreIds = chainStores.map((cs) => cs.storeId);

    const storeUserRoles = await UserRole.findAll({
      where: {
        associated_user_id: { [Op.in]: chainStoreIds },
        role: ENTITY_TYPE.STORE
      },
      attributes: ["userId", "associatedUserId"]
    });

    // Update Stores User
    await this.updateStoreUsersStatus(
      storeUserRoles,
      USER_STATUS.CHAIN_ACTIVE,
      transaction
    );

    // Delete Invitation
    await SignupInvitation.update(
      {
        status: "completed",
        deleted_at: new Date(),
        completed_at: new Date(),
        updated_at: new Date()
      },
      { transaction, where: { token } }
    );

    return updatedUser;
  }

  public async updateStoreUsersStatus(
    storeUserRoles: any[],
    status: string,
    transaction?: Transaction
  ) {
    return Promise.all(
      storeUserRoles.map((userRole) =>
        User.update(
          { status },
          transaction
            ? { where: { id: userRole.userId }, transaction }
            : { where: { id: userRole.userId } }
        )
      )
    );
  }

  public async updateUserLogo(entiryID: number, type: string, newLogo: string) {
    switch (type) {
      case ENTITY_TYPE.DISTRIBUTOR_ADMIN:
      case ENTITY_TYPE.DISTRIBUTOR_SALES_REP:
      case ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE:
        await Distributor.update(
          { logo: newLogo },
          { where: { id: entiryID } }
        );
        break;
      case ENTITY_TYPE.STORE:
        await Store.update({ logo: newLogo }, { where: { id: entiryID } });
        break;
      case ENTITY_TYPE.MANUFACTURER:
        await Manufacturer.update(
          { logo: newLogo },
          { where: { id: entiryID } }
        );
    }
  }

  public async getRelatedUsersDetails(userId: number) {
    const userRelatedAC =
      await LoginRelatedAccountsRepository.getAllRelatedUserAccounts(userId);

    if (userRelatedAC.length == 0) return [];

    const userRole: any = await UserRole.findAll({
      attributes: ["id"],
      where: {
        user_id: {
          [Op.in]: userRelatedAC
        }
      },
      include: [
        {
          model: Manufacturer,
          as: "AssociatedManufacturer",
          attributes: ["id", "name", "organization_name", "logo"]
        }
      ],
      raw: true
    });

    if (userRole.length > 0) {
      return userRole.map((user: any) => ({
        id: user.id,
        role: user.role,
        name:
          user?.["AssociatedManufacturer.organization_name"] ||
          user?.["AssociatedManufacturer.name"] ||
          "",
        logo: user?.["AssociatedManufacturer.logo"] || ""
      }));
    }

    return [];
  }

  public async getUserCombinedRoles({
    userId,
    getShortEntityType = false,
    getLongEntityType = false
  }: {
    userId: number;
    getShortEntityType?: boolean;
    getLongEntityType?: boolean;
  }) {
    const users = await User.findAll({
      where: { id: userId },
      include: [
        {
          model: UserRole,
          required: true,
          attributes: ["role"]
        }
      ],
      raw: true
    });

    const userCombinedRoles = users.map((user: any) => user["UserRole.role"]);

    if (getLongEntityType) {
      return userCombinedRoles.map(
        (role: string) =>
          ENTITY_TYPE_LONG_MISC[role as keyof typeof ENTITY_TYPE_LONG_MISC] ??
          role
      );
    }

    if (getShortEntityType) {
      return userCombinedRoles.map(
        (role: string) =>
          ENTITY_TYPE_SHORT[role as keyof typeof ENTITY_TYPE_SHORT] ?? role
      );
    }

    return userCombinedRoles;
  }
}

export default new UserRepository();

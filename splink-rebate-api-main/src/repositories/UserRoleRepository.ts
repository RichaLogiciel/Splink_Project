import { Transaction } from "sequelize";
import { ENTITY_TYPE } from "../config/appConstants";
import { ApiError } from "../lib/errors/APIError";
import Distributor from "../models/Distributor";
import Manufacturer from "../models/Manufacturer";
import Store from "../models/Store";
import UserRole from "../models/UserRole";
import { getHigherDistributorRole } from "../utils/roles";
import UserRepository from "./UserRepository";

class UserRoleRepository {
  // Function to fetch associated entity ID by user ID
  public async getAssociatedEntityId(userId: number): Promise<number | null> {
    try {
      const userRole = await UserRole.findOne({
        where: { user_id: userId }
      });

      if (!userRole) {
        return null;
      }

      return userRole.associatedUserId;
    } catch (error) {
      if (error instanceof Error) {
        throw ApiError.internal(` ${error.message}`);
      } else {
        throw ApiError.internal("An unknown error occurred");
      }
    }
  }

  public async getAssociatedUser(
    userId: number,
    getHigherRole: boolean = false
  ): Promise<UserRole | null> {
    try {
      let userRole: UserRole | null = null;
      if (getHigherRole) {
        // We assume that user will be Distributor types only for now
        const userCombinedRoles = await UserRepository.getUserCombinedRoles({
          userId: userId
        });
        const higherDistributorRole =
          getHigherDistributorRole(userCombinedRoles);

        userRole = (await UserRole.findOne({
          where: { role: higherDistributorRole, user_id: userId }
        })) as UserRole;
      } else {
        userRole = await UserRole.findOne({
          where: { user_id: userId }
        });
      }
      if (!userRole) {
        return null;
      }

      return userRole;
    } catch (error) {
      if (error instanceof Error) {
        throw ApiError.internal(` ${error.message}`);
      } else {
        throw ApiError.internal("An unknown error occurred");
      }
    }
  }

  public async createAssociatedUser(
    payload: {
      firstName: string;
      lastName: string;
      role: string;
      logo: string | null;
      title: string | null;
      orgName: string | null;
      storeName: string | null;
    },
    transaction: Transaction
  ): Promise<Distributor> {
    const {
      firstName,
      lastName,
      role,
      logo = null,
      orgName = null,
      title = null,
      storeName = null
    } = payload;

    let associatedUser: any;

    const associatedUserPayload = {
      name: `${firstName} ${lastName}`,
      logo,
      createdAt: new Date(),
      updatedAt: new Date(),
      authorized: false
    };

    switch (role) {
      case ENTITY_TYPE.MANUFACTURER:
        {
          if (orgName) {
            const matchedManufacturer = await Manufacturer.findOne({
              where: { organizationName: orgName.trim() }
            });

            if (matchedManufacturer) {
              throw new Error(
                `Manufacturer already exist with same Manufacturer Name: ${orgName}`
              );
            }
          }

          associatedUser = await Manufacturer.create(
            {
              ...associatedUserPayload,
              name: orgName,
              organizationName: orgName
            },
            { transaction }
          );
        }
        break;

      case ENTITY_TYPE.MANUFACTURER_EXECUTIVE:
      case ENTITY_TYPE.MANUFACTURER_ACCOUNT_MANAGER:
        associatedUser = await Manufacturer.create(
          { ...associatedUserPayload, organizationName: orgName },
          { transaction }
        );
        break;

      case ENTITY_TYPE.DISTRIBUTOR_ADMIN:
      case ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE:
      case ENTITY_TYPE.DISTRIBUTOR_SALES_REP:
      case ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER:
      case ENTITY_TYPE.DISTRIBUTOR_SALES_MANAGER:
        {
          if (orgName) {
            const matchedDistributor = await Distributor.findOne({
              where: { organizationName: orgName.trim() }
            });

            if (matchedDistributor) {
              throw new Error(
                `Distributor already exist with same Distributor Name: ${orgName}`
              );
            }
          }

          associatedUser = await Distributor.create(
            { ...associatedUserPayload, organizationName: orgName, title },
            { transaction }
          );
        }
        break;

      case ENTITY_TYPE.STORE:
        associatedUser = await Store.create(
          { ...associatedUserPayload, storeName },
          { transaction }
        );
        break;

      default:
        break;
    }

    return associatedUser;
  }

  public async createUserRole(
    payload: {
      role: string;
      userId: number;
      parentEntityId: number | null;
      parentEntityType: string | null;
    },
    associatedUser: Distributor,
    transaction: Transaction
  ): Promise<void> {
    const { role, userId, parentEntityId, parentEntityType } = payload;

    const userRolePayload = {
      userId,
      role,
      parentEntityId,
      parentEntityType,
      associatedUserId: associatedUser.id,
      associatedEntityType: associatedUser.constructor.name.toUpperCase(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Create User Role
    await UserRole.create(userRolePayload, { transaction });
  }

  public async updateUserRole(
    payload: {
      role: string;
      userId: number;
      getAssociatedUserId: number;
      getAssociatedUserType: string;
    },
    associatedUser: Distributor,
    transaction: Transaction
  ): Promise<void> {
    const { role, userId, getAssociatedUserId, getAssociatedUserType } =
      payload;

    const userRolePayload = {
      role,
      parentEntityId: getAssociatedUserId,
      parentEntityType: getAssociatedUserType,
      associatedUserId: associatedUser.id,
      associatedEntityType: associatedUser.constructor.name.toUpperCase(),
      updatedAt: new Date()
    };

    // Update User Role
    await UserRole.update(userRolePayload, { transaction, where: { userId } });
  }
}

export default new UserRoleRepository();

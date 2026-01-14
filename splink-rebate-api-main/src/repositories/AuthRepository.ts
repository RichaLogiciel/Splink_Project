import { Op, Transaction } from "sequelize";
import {
  ENTITY_TYPE,
  SIGNUP_INVITATION_STATUS,
  USER_STATUS
} from "../config/appConstants";
import { ERROR_MESSAGES } from "../config/errorMessages";
import Chain from "../models/Chain";
import ChainStore from "../models/ChainStore";
import Distributor from "../models/Distributor";
import DistributorManagerWarehouse from "../models/DistributorManagerWarehouse";
import EntityAccessMapping from "../models/EntityAccessMapping";
import ResetPassword from "../models/ResetPassword";
import SignupInvitation from "../models/SignupInvitation";
import Store from "../models/Store";
import User from "../models/User";
import UserRole from "../models/UserRole";
import { LoggedInUser } from "../types/UserTypes";
import {
  generateRandomString,
  getExpiresAtTime,
  getHashedPassword
} from "../utils/helpers";
import { generateJwtToken } from "../utils/jwt";
import { validatePassword } from "../utils/userHelper";
import UserRepository from "./UserRepository";

export interface StoreUserInvite {
  email: string;
  parentUserRole: string;
  parentUserId: number;
  firstName: string;
  lastName: string;
  phones: string[];
  address: string;
  city: string;
  state: string;
  zip: string;
  logo?: string;
  title?: string;
  storeName: string;
  storeId: number;
}

class AuthRepository {
  /**
   * Finds a user by email.
   *
   * @param email - The email address of the user.
   * @returns A promise that resolves to the user or null if not found.
   */
  public async findUserByEmail(email: string): Promise<User | null> {
    return User.findOne({
      where: {
        email: email.toLowerCase(),
        deletedAt: null
      }
    });
  }

  /**
   * Save or update an invitation record by email.
   *
   * This method checks for an existing invitation record for a given email. If found,
   * it updates the expiration date and role. If not, it creates a new invitation entry
   * with the provided email, token, role, and expiration date.
   *
   * @param email - The email address of the user to invite
   * @param token - A unique token for the invitation
   * @param role - The role associated with the invitation (default is "DISTRIBUTOR_SALES_REP")
   * @returns A Promise that resolves when the invitation has been saved or updated
   * @throws An error if the invitation cannot be saved due to database or other issues
   */

  public async saveInvitation(
    {
      email,
      token,
      role,
      childUsers
    }: {
      email: string;
      token: string;
      role: string;
      childUsers?: { id: number }[];
    },
    user: LoggedInUser,
    transaction: Transaction | undefined,
    manufacturerDistributors?: any[],
    distributorWarehouses?: any[]
  ): Promise<void> {
    try {
      // Parse INVITE_JWT_EXPIRES_IN and set the expiration date
      const expiresAt = getExpiresAtTime();
      let invitationId: number | null = null;

      // Check for existing invitation with the same email
      const existingInvitation = await SignupInvitation.findOne({
        where: { email }
      });

      if (existingInvitation) {
        invitationId = existingInvitation.id;

        // remove all mapping record for manager and ditributor relation
        if (
          existingInvitation.role ===
            ENTITY_TYPE.MANUFACTURER_ACCOUNT_MANAGER &&
          role != ENTITY_TYPE.MANUFACTURER_ACCOUNT_MANAGER
        ) {
          const relatedDistributorIds =
            manufacturerDistributors?.map((ds: any) => ds.associatedUserId) ??
            [];

          await EntityAccessMapping.destroy({
            where: {
              parent_entity_id: invitationId,
              parent_entity_type: USER_STATUS.INVITATION_SENT,
              associated_entity_type: ENTITY_TYPE.DISTRIBUTOR_ADMIN,
              associated_entity_id: { [Op.in]: relatedDistributorIds }
            },
            transaction
          });
        }

        // If an invitation already exists, update it
        await existingInvitation.update(
          {
            expires_at: expiresAt,
            token,
            role, // Update role as necessary
            invited_by: user.id,
            updated_at: new Date()
          },
          { transaction }
        );
      } else {
        // Use the SignupInvitation model to create the entry
        const invitation = await SignupInvitation.create(
          {
            email,
            role,
            token,
            expires_at: expiresAt,
            invited_by: user.id,
            created_at: new Date(),
            updated_at: new Date()
          },
          { transaction }
        );

        // Access the newly created ID
        invitationId = invitation.id;
      }

      // create new mapping records for manager and ditributors relation
      if (
        role === ENTITY_TYPE.MANUFACTURER_ACCOUNT_MANAGER &&
        childUsers &&
        invitationId
      ) {
        const distributorIds = childUsers.map((u: any) => u.id);
        const relatedDistributorIds =
          manufacturerDistributors
            ?.filter((ds: any) => distributorIds.includes(ds.associatedUserId))
            ?.map((ds: any) => ds.associatedUserId) ?? [];

        const newMappings = relatedDistributorIds.map((userId) => ({
          parentEntityId: invitationId,
          parentEntityType: USER_STATUS.INVITATION_SENT,
          associatedEntityId: userId,
          associatedEntityType: ENTITY_TYPE.DISTRIBUTOR_ADMIN,
          createdAt: new Date()
        }));

        // Create new entity access mappings in bulk
        if (newMappings.length > 0) {
          await EntityAccessMapping.bulkCreate(newMappings, { transaction });
        }
      }

      // create new records for distributor general manager and warehouse relation
      if (
        role === ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER &&
        childUsers &&
        invitationId
      ) {
        const warehouseIds = childUsers.map((u: any) => u.id);
        const relatedWarehouseIds =
          distributorWarehouses
            ?.filter((ds: any) => warehouseIds.includes(ds.id))
            ?.map((ds: any) => ds.id) ?? [];

        const newMappings = relatedWarehouseIds.map((warehouseId) => ({
          warehouseId: warehouseId,
          distributorId: invitationId,
          role: USER_STATUS.INVITATION_SENT,
          createdAt: new Date(),
          updatedAt: new Date()
        }));

        // Create new entity access mappings in bulk
        if (newMappings.length > 0) {
          await DistributorManagerWarehouse.bulkCreate(newMappings, {
            transaction
          });
        }
      }
    } catch {
      throw new Error(
        "Unable to save the email invitation. Please try again later or contact support if the issue persists."
      );
    }
  }

  public async saveInvitationForStore(
    payload: StoreUserInvite,
    token: string,
    transaction: Transaction
  ): Promise<void> {
    const inviteWithSameEmail = await SignupInvitation.findOne({
      where: { email: payload.email, deleted_at: null }
    });

    const userRole = await UserRole.findOne({
      where: { associatedUserId: payload.storeId, role: ENTITY_TYPE.STORE }
    });

    if (!userRole) {
      throw new Error("The invited Store is not exist in records.");
    }

    const user = await User.findOne({
      where: {
        id: userRole.userId
      }
    });

    if (!user) {
      throw new Error("The invited Store is not exist in records.");
    }

    const userWithSameEmail = await User.findOne({
      where: {
        email: payload.email
      }
    });

    if (
      userWithSameEmail &&
      (userWithSameEmail?.status == "ACTIVE" ||
        userWithSameEmail?.id != user.id)
    ) {
      throw new Error(`User already exist with same email (${payload.email}).`);
    }

    const store = await Store.findOne({
      where: { id: userRole?.associatedUserId }
    });

    if (!store) {
      throw new Error("The invited Store is not exist in records.");
    }

    const [phone, secondaryPhone] = payload.phones;

    // Update User
    await user.update(
      {
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        address: payload.address,
        city: payload.city,
        state: payload.state,
        zip: payload.zip,
        phone: phone || null,
        secondaryPhone: secondaryPhone || null,
        status: "INVITATION_SENT",
        updated_at: new Date()
      },
      { transaction }
    );

    // Update Store
    await store.update(
      {
        name: `${payload.firstName} ${payload.lastName}`,
        storeName: payload.storeName,
        updated_at: new Date()
      },
      { transaction }
    );

    const expiresAt = new Date();
    const expiresInSeconds = parseInt("86400"); // Defaults to 24 hours (86400 seconds)
    expiresAt.setSeconds(expiresAt.getSeconds() + expiresInSeconds);

    if (inviteWithSameEmail) {
      // If an invitation already exists, update it
      await inviteWithSameEmail.update(
        {
          expires_at: expiresAt,
          role: ENTITY_TYPE.STORE,
          token,
          invited_by: payload.parentUserId,
          updated_at: new Date()
        },
        { transaction }
      );
    } else {
      // Use the SignupInvitation model to create the entry
      await SignupInvitation.create(
        {
          email: payload.email,
          role: ENTITY_TYPE.STORE,
          token,
          expires_at: expiresAt,
          invited_by: payload.parentUserId,
          created_at: new Date(),
          updated_at: new Date()
        },
        { transaction }
      );
    }
  }

  public async saveInvitationForSalesRep(
    payload: any,
    token: string,
    transaction: Transaction
  ): Promise<void> {
    try {
      const inviteWithSameEmail = await SignupInvitation.findOne({
        where: { email: payload.email, deleted_at: null }
      });

      const userRole = await UserRole.findOne({
        where: {
          userId: payload.salesRepId,
          role: ENTITY_TYPE.DISTRIBUTOR_SALES_REP
        }
      });

      if (!userRole) {
        throw new Error("The invited Sales Rep is not exist in records.");
      }

      const user = await User.findOne({
        where: {
          id: userRole.userId
        }
      });

      if (!user) {
        throw new Error("The invited Sales Rep is not exist in records.");
      }

      const userWithSameEmail = await User.findOne({
        where: {
          email: payload.email
        }
      });

      if (
        userWithSameEmail &&
        (userWithSameEmail?.status == "ACTIVE" ||
          userWithSameEmail?.id != user.id)
      ) {
        throw new Error(
          `User already exist with same email (${payload.email}).`
        );
      }

      const parentUserRole = await UserRole.findOne({
        where: {
          associatedUserId: userRole?.parentEntityId,
          associated_entity_type: ENTITY_TYPE.DISTRIBUTOR
        }
      });

      if (!parentUserRole) {
        throw new Error(`User is not associated with any Distributor Admin`);
      }

      const parentDistributorEntry = await Distributor.findOne({
        where: { id: parentUserRole.associatedUserId }
      });

      const userDistributorEntry = await Distributor.findOne({
        where: { id: userRole.associatedUserId }
      });

      if (!userDistributorEntry || !parentDistributorEntry) {
        throw new Error(`User does not have entry in Distributor`);
      }

      const [phone, secondaryPhone] = payload.phones;

      await user?.update(
        {
          email: payload.email,
          firstName: payload.firstName,
          lastName: payload.lastName,
          phone: phone || null,
          secondaryPhone: secondaryPhone || null,
          status: "INVITATION_SENT",
          updated_at: new Date()
        },
        { transaction }
      );

      // saveInvitationForSalesRep()
      // This method is only invoked for users with the Sales Rep role i.e "role: DISTRIBUTOR_SALES_REP".
      // For Sales Reps, we inherit title and organization from their parent Distributor,
      // so there’s no need to set those fields here.
      await userDistributorEntry.update(
        {
          name:
            (payload.firstName?.trim() || "") +
            (payload.lastName?.trim() ? " " + payload.lastName.trim() : ""),
          updated_at: new Date()
        },
        { transaction }
      );

      const expiresAt = new Date();
      const expiresInSeconds = parseInt("86400"); // Defaults to 24 hours (86400 seconds)
      expiresAt.setSeconds(expiresAt.getSeconds() + expiresInSeconds);

      if (inviteWithSameEmail) {
        // If an invitation already exists, update it
        await inviteWithSameEmail.update(
          {
            expires_at: expiresAt,
            role: ENTITY_TYPE.DISTRIBUTOR_SALES_REP,
            token,
            invited_by: payload.parentUserId,
            invited_user: user.id,
            updated_at: new Date()
          },
          { transaction }
        );
      } else {
        // Use the SignupInvitation model to create the entry
        await SignupInvitation.create(
          {
            email: payload.email,
            role: ENTITY_TYPE.DISTRIBUTOR_SALES_REP,
            token,
            expires_at: expiresAt,
            invited_by: payload.parentUserId,
            invited_user: user.id,
            created_at: new Date(),
            updated_at: new Date()
          },
          { transaction }
        );
      }
    } catch (err: any) {
      throw new Error(err.message!);
    }
  }

  public async saveInvitationForGeneralManager(
    payload: any,
    token: string,
    transaction: Transaction
  ): Promise<void> {
    try {
      const inviteWithSameEmail = await SignupInvitation.findOne({
        where: { email: payload.email, deleted_at: null }
      });

      // Find the user directly by ID
      const user = await User.findOne({
        where: {
          id: payload.salesRepId
        }
      });

      if (!user) {
        throw new Error(
          "The invited General Manager does not exist in records."
        );
      }

      // Get the user role - must exist for onboarding
      const userRole = await UserRole.findOne({
        where: {
          userId: payload.salesRepId
        }
      });

      if (!userRole) {
        throw new Error(
          "The invited General Manager does not have a user role record."
        );
      }

      const userWithSameEmail = await User.findOne({
        where: {
          email: payload.email
        }
      });

      if (
        userWithSameEmail &&
        (userWithSameEmail?.status == "ACTIVE" ||
          userWithSameEmail?.id != user.id)
      ) {
        throw new Error(
          `User already exist with same email (${payload.email}).`
        );
      }

      const parentUserRole = await UserRole.findOne({
        where: {
          associatedUserId: userRole.parentEntityId,
          associated_entity_type: ENTITY_TYPE.DISTRIBUTOR
        }
      });

      if (!parentUserRole) {
        throw new Error(`User is not associated with any Distributor Admin`);
      }

      const parentDistributorEntry = await Distributor.findOne({
        where: { id: parentUserRole.associatedUserId }
      });

      const userDistributorEntry = await Distributor.findOne({
        where: { id: userRole.associatedUserId }
      });

      if (!userDistributorEntry || !parentDistributorEntry) {
        throw new Error(`User does not have entry in Distributor`);
      }

      const [phone, secondaryPhone] = payload.phones;

      await user?.update(
        {
          email: payload.email,
          firstName: payload.firstName,
          lastName: payload.lastName,
          phone: phone || null,
          secondaryPhone: secondaryPhone || null,
          status: "INVITATION_SENT",
          updated_at: new Date()
        },
        { transaction }
      );

      await userDistributorEntry.update(
        {
          name:
            (payload.firstName?.trim() || "") +
            (payload.lastName?.trim() ? " " + payload.lastName.trim() : ""),
          updated_at: new Date()
        },
        { transaction }
      );

      const expiresAt = new Date();
      const expiresInSeconds = parseInt("86400"); // Defaults to 24 hours (86400 seconds)
      expiresAt.setSeconds(expiresAt.getSeconds() + expiresInSeconds);

      if (inviteWithSameEmail) {
        // If an invitation already exists, update it
        await inviteWithSameEmail.update(
          {
            expires_at: expiresAt,
            role: ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER,
            token,
            invited_by: payload.parentUserId,
            invited_user: user.id,
            updated_at: new Date()
          },
          { transaction }
        );
      } else {
        // Use the SignupInvitation model to create the entry
        await SignupInvitation.create(
          {
            email: payload.email,
            role: ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER,
            token,
            expires_at: expiresAt,
            invited_by: payload.parentUserId,
            invited_user: user.id,
            created_at: new Date(),
            updated_at: new Date()
          },
          { transaction }
        );
      }

      // Create warehouse mappings if warehouses are provided
      if (payload.warehouses && payload.warehouses.length > 0) {
        const invitation = await SignupInvitation.findOne({
          where: { email: payload.email, deleted_at: null }
        });

        if (invitation) {
          // Delete existing warehouse mappings for this invitation
          await DistributorManagerWarehouse.destroy({
            where: {
              distributorId: invitation.id,
              role: USER_STATUS.INVITATION_SENT
            },
            transaction
          });

          // Create new warehouse mappings
          const warehouseMappings = payload.warehouses.map(
            (warehouseId: number) => ({
              warehouseId: warehouseId,
              distributorId: invitation.id,
              role: USER_STATUS.INVITATION_SENT,
              createdAt: new Date(),
              updatedAt: new Date()
            })
          );

          await DistributorManagerWarehouse.bulkCreate(warehouseMappings, {
            transaction
          });
        }
      }
    } catch (err: any) {
      throw new Error(err.message!);
    }
  }

  public async saveInvitationForSalesManager(
    payload: any,
    token: string,
    transaction: Transaction
  ): Promise<void> {
    try {
      const inviteWithSameEmail = await SignupInvitation.findOne({
        where: { email: payload.email, deleted_at: null }
      });

      // Find the user directly by ID
      const user = await User.findOne({
        where: {
          id: payload.salesRepId
        }
      });

      if (!user) {
        throw new Error("The invited Sales Manager does not exist in records.");
      }

      // Get the user role - must exist for onboarding
      const userRole = await UserRole.findOne({
        where: {
          userId: payload.salesRepId
        }
      });

      if (!userRole) {
        throw new Error(
          "The invited Sales Manager does not have a user role record."
        );
      }

      const userWithSameEmail = await User.findOne({
        where: {
          email: payload.email
        }
      });

      if (
        userWithSameEmail &&
        (userWithSameEmail?.status == "ACTIVE" ||
          userWithSameEmail?.id != user.id)
      ) {
        throw new Error(
          `User already exist with same email (${payload.email}).`
        );
      }

      const parentUserRole = await UserRole.findOne({
        where: {
          associatedUserId: userRole.parentEntityId,
          associated_entity_type: ENTITY_TYPE.DISTRIBUTOR
        }
      });

      if (!parentUserRole) {
        throw new Error(`User is not associated with any Distributor Admin`);
      }

      const parentDistributorEntry = await Distributor.findOne({
        where: { id: parentUserRole.associatedUserId }
      });

      const userDistributorEntry = await Distributor.findOne({
        where: { id: userRole.associatedUserId }
      });

      if (!userDistributorEntry || !parentDistributorEntry) {
        throw new Error(`User does not have entry in Distributor`);
      }

      const [phone, secondaryPhone] = payload.phones;

      await user?.update(
        {
          email: payload.email,
          firstName: payload.firstName,
          lastName: payload.lastName,
          phone: phone || null,
          secondaryPhone: secondaryPhone || null,
          status: "INVITATION_SENT",
          updated_at: new Date()
        },
        { transaction }
      );

      await userDistributorEntry.update(
        {
          name:
            (payload.firstName?.trim() || "") +
            (payload.lastName?.trim() ? " " + payload.lastName.trim() : ""),
          updated_at: new Date()
        },
        { transaction }
      );

      const expiresAt = new Date();
      const expiresInSeconds = parseInt("86400"); // Defaults to 24 hours (86400 seconds)
      expiresAt.setSeconds(expiresAt.getSeconds() + expiresInSeconds);

      if (inviteWithSameEmail) {
        // If an invitation already exists, update it
        await inviteWithSameEmail.update(
          {
            expires_at: expiresAt,
            role: ENTITY_TYPE.DISTRIBUTOR_SALES_MANAGER,
            token,
            invited_by: payload.parentUserId,
            invited_user: user.id,
            updated_at: new Date()
          },
          { transaction }
        );
      } else {
        // Use the SignupInvitation model to create the entry
        await SignupInvitation.create(
          {
            email: payload.email,
            role: ENTITY_TYPE.DISTRIBUTOR_SALES_MANAGER,
            token,
            expires_at: expiresAt,
            invited_by: payload.parentUserId,
            invited_user: user.id,
            created_at: new Date(),
            updated_at: new Date()
          },
          { transaction }
        );
      }
    } catch (err: any) {
      throw new Error(err.message!);
    }
  }

  public async saveInvitationForChain(
    payload: any,
    token: string,
    transaction: Transaction
  ): Promise<void> {
    try {
      const { chainId, email, phones, firstName, lastName, parentEntityId } =
        payload;

      const inviteWithSameEmail = await SignupInvitation.findOne({
        where: { email: email }
      });

      if (
        inviteWithSameEmail &&
        inviteWithSameEmail.role != ENTITY_TYPE.CHAIN_ADMIN &&
        inviteWithSameEmail.status != SIGNUP_INVITATION_STATUS.CANCELED
      ) {
        throw new Error(
          `Invitation already exit with same email (${email}) for other User.`
        );
      }

      let user;
      const checkExistingUser = await User.findOne({
        where: { email: email }
      });
      if (checkExistingUser) {
        //check if user already exit with the same email
        const userRole = await UserRole.findOne({
          where: { userId: checkExistingUser.id }
        });

        if (
          userRole?.associatedUserId &&
          userRole?.associatedUserId != chainId &&
          checkExistingUser?.status == "ACTIVE"
        ) {
          throw new Error(
            `User already exist with same email (${checkExistingUser.email}).`
          );
        }

        user = checkExistingUser;
      } else {
        user = await User.create({
          firstName: firstName,
          lastName: lastName,
          phone:
            Array.isArray(phones) && phones.length > 0 ? phones[0] : phones,
          email: email,
          passwordHash: await getHashedPassword("Password@123"),
          status: "INVITATION_SENT",
          created_at: new Date(),
          updated_at: new Date()
        });
      }

      const checkUserRole = await UserRole.findOne({
        where: {
          user_id: user.id
        }
      });

      if (!checkUserRole) {
        UserRole.create({
          userId: user.id,
          role: ENTITY_TYPE.CHAIN_ADMIN,
          associatedUserId: chainId,
          associatedEntityType: ENTITY_TYPE.CHAIN,
          parentEntityId: parentEntityId,
          parentEntityType: ENTITY_TYPE.DISTRIBUTOR,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      const chain = await Chain.findByPk(chainId);

      if (!chain) {
        throw new Error("The invited Chain does not exist in records.");
      }

      // update chain stores
      if (payload.stores?.length) {
        const chainStores = payload.stores;
        const chainStoreIds = chainStores.map((st: any) => st.id);
        const chainNewStores = chainStores.filter((st: any) => st?.isNew);

        const storeUserRoles = await UserRole.findAll({
          where: {
            associated_user_id: { [Op.in]: chainStoreIds },
            role: ENTITY_TYPE.STORE
          },
          attributes: ["userId", "associatedUserId"]
        });

        // Update Stores
        await Promise.all(
          chainStores.map((store: any) =>
            Store.update(
              {
                storeName: store.storeName,
                name: store.storeName
              }, // Fields to update
              { where: { id: store.id }, transaction }
            )
          )
        );

        // Update Stores User
        await Promise.all(
          storeUserRoles.map((userRole: any) => {
            const currentStore = chainStores.find(
              (st: any) => st.id === userRole.associatedUserId
            );

            if (!currentStore) return;

            User.update(
              {
                firstName: currentStore.storeName,
                city: currentStore.city,
                state: currentStore.state,
                address: currentStore.address,
                zip: currentStore.zip,
                status: USER_STATUS.CHAIN_INVITATION_SENT
              }, // Fields to update
              { where: { id: userRole.userId }, transaction }
            );
          })
        );

        // delete store chain relation for disconnected stores
        await ChainStore.destroy({
          where: {
            chainId: chainId,
            storeId: { [Op.notIn]: chainStoreIds }
          },
          transaction
        });

        if (chainNewStores.length) {
          await Promise.all(
            chainNewStores.map(async (store: any) => {
              await ChainStore.create(
                {
                  storeId: store.id,
                  store_id: store.id,
                  chainId: chainId,
                  chain_id: chainId,
                  created_at: new Date(),
                  updated_at: new Date()
                }, // Fields
                { transaction }
              );
            })
          );
        }
      }

      const expiresAt = new Date();
      const expiresInSeconds = parseInt("86400"); // Defaults to 24 hours (86400 seconds)
      expiresAt.setSeconds(expiresAt.getSeconds() + expiresInSeconds);

      if (inviteWithSameEmail) {
        // If an invitation already exists, update it
        await inviteWithSameEmail.update(
          {
            expires_at: expiresAt,
            role: ENTITY_TYPE.CHAIN_ADMIN,
            token,
            invited_by: payload.parentUserId,
            invited_user: user.id,
            updated_at: new Date()
          },
          { transaction }
        );
      } else {
        // Use the SignupInvitation model to create the entry
        await SignupInvitation.create(
          {
            email: payload.email,
            role: ENTITY_TYPE.CHAIN_ADMIN,
            token,
            expires_at: expiresAt,
            invited_by: payload.parentUserId,
            invited_user: user.id,
            created_at: new Date(),
            updated_at: new Date()
          },
          { transaction }
        );
      }
    } catch (err: any) {
      throw new Error(err.message!);
    }
  }

  public async cancelUserInvite(
    userId: number,
    loggedInUserID: any,
    chainId?: number
  ): Promise<void> {
    let chainUserRole = null;
    let chainManagerId = null;

    if (chainId) {
      chainUserRole = await UserRole.findOne({
        where: {
          associated_user_id: chainId,
          role: ENTITY_TYPE.CHAIN_ADMIN
        }
      });
    }

    // Find the user by userId and retrieve their email
    const user = await User.findOne({
      where: { id: chainUserRole ? chainUserRole.userId : userId },
      attributes: ["email", "id", "firstName", "lastName"]
    });

    if (!user) {
      throw new Error("Selected user account could not be found.");
    }

    //check if user chain manager exist
    const userRole = await UserRole.findOne({
      where: {
        user_id: user.id
      }
    });

    if (userRole?.role == ENTITY_TYPE.STORE) {
      const chainStore = await ChainStore.findOne({
        where: {
          store_id: userRole?.associatedUserId
        }
      });

      const chainUserRole = chainStore
        ? await UserRole.findOne({
            where: {
              associated_user_id: chainStore.chainId,
              role: ENTITY_TYPE.CHAIN_ADMIN
            }
          })
        : null;

      if (chainUserRole) {
        const chainUser = await User.findOne({
          where: { id: chainUserRole.userId, status: USER_STATUS.ACTIVE },
          attributes: ["id"]
        });

        chainManagerId = chainUser ? chainUserRole.userId : null;
      }
    }

    // Find the pending invitation for the user
    const userInvite = await SignupInvitation.findOne({
      where: {
        email: user.email,
        status: "pending",
        invited_by: chainManagerId ? chainManagerId : loggedInUserID,
        deleted_at: null
      }
    });

    if (!userInvite) {
      throw new Error("Unable to find the user invitation.");
    }

    // Update the user's status to "INVITATION_PENDING"
    const name = `${user.dataValues.firstName || ""}_${user.dataValues.lastName || ""}`;
    const email = `${name.replace(/[\s']/g, "").toLowerCase()}_${generateRandomString()}@example.com`;

    await User.update(
      {
        status: chainManagerId
          ? USER_STATUS.CHAIN_ACTIVE
          : USER_STATUS.INVITATION_PENDING,
        email
      },
      {
        where: { id: user.id }
      }
    );

    if (chainUserRole) {
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
      await UserRepository.updateStoreUsersStatus(
        storeUserRoles,
        USER_STATUS.INVITATION_PENDING
      );
    }

    // Cancel the invitation by updating its status and timestamps
    await SignupInvitation.update(
      {
        status: SIGNUP_INVITATION_STATUS.CANCELED,
        completed_at: new Date(),
        updated_at: new Date(),
        deleted_at: new Date()
      },
      { where: { id: userInvite.id } }
    );
  }

  /**
   * Retrieve a signup invitation by its token.
   *
   * This method searches for a signup invitation using the provided token.
   * If the invitation is found and has not expired, it is returned.
   * Throws an error if the invitation is not found or has expired.
   *
   * @param token - The unique token associated with the invitation
   * @returns A Promise that resolves to the invitation object if found and valid
   * @throws An error if the invitation is not found or has expired
   */
  public async getInvitation(token: string): Promise<SignupInvitation> {
    try {
      const invitation = await SignupInvitation.findOne({
        where: { token, deleted_at: null }
      });

      if (!invitation) {
        throw new Error("Invitation not found.");
      }

      if (invitation.expires_at < new Date()) {
        invitation.status = "expired";
        invitation.updated_at = new Date();
        await invitation.save();

        throw new Error("Invitation expired.");
      }

      return invitation;
    } catch (error: any) {
      throw new Error(error?.message || "Unable to find invitation.");
    }
  }

  /**
   * Validates the reset password token.
   *
   * @param token - The reset password token.
   * @returns A promise that resolves to the reset password record or null if invalid.
   */
  public async validatePasswordResetToken(
    token: string
  ): Promise<ResetPassword | null> {
    const resetPassword = await ResetPassword.findOne({
      where: {
        token,
        deletedAt: null
      }
    });

    if (!resetPassword || resetPassword.expireAt < new Date()) {
      return null;
    }

    return resetPassword;
  }

  /**
   * Save Reset Password Token.
   *
   * @param userId - The ID of the user.
   * @param token - Reset JWT token.
   * @param email - user email.
   * @param expireAt - 15 mins from now.
   * @returns A promise that resolves when Password reset Token is saved in DB.
   */
  public async saveResetPasswordToken({
    token,
    userId,
    email,
    expireAt
  }: {
    token: string;
    userId: number;
    email: string;
    expireAt: Date;
  }): Promise<void> {
    try {
      // Check for existing reset password email
      const existingEmail = await ResetPassword.findOne({
        where: { userId, status: "pending" }
      });

      if (!existingEmail) {
        await ResetPassword.create({
          userId,
          email,
          token,
          expireAt,
          created_at: new Date(),
          updated_at: new Date()
        });
      } else {
        await existingEmail.update({
          token,
          expireAt,
          updated_at: new Date()
        });
      }
    } catch {
      throw new Error("Unable to Save Reset password Data.");
    }
  }

  /**
   * Updates the user's password.
   *
   * @param userId - The ID of the user.
   * @param hashedPassword - The hashed new password.
   * @returns A promise that resolves when the password is successfully updated.
   */
  public async updateUserPassword(
    token: string,
    newPassword: string
  ): Promise<void> {
    const sequelize = User.sequelize;
    if (!sequelize) {
      throw new Error("Sequelize instance is not available");
    }

    let transaction: Transaction | undefined;

    try {
      transaction = await sequelize.transaction();

      // Validate the reset password token
      const resetPassword = await this.validatePasswordResetToken(token);
      if (!resetPassword) {
        throw new Error(ERROR_MESSAGES.AUTH.INVALID_TOKEN);
      }

      // Validate the new password
      const passwordValidationMessage = validatePassword(newPassword);
      if (passwordValidationMessage !== true) {
        throw new Error(passwordValidationMessage as string);
      }

      // Hash the new password
      const hashedPassword = await getHashedPassword(newPassword);

      // Update the user's password
      await User.update(
        { passwordHash: hashedPassword },
        { where: { id: resetPassword.userId }, transaction }
      );

      // Mark the reset password token as used by setting deletedAt
      await resetPassword.update(
        { status: "completed", deletedAt: new Date() },
        { transaction }
      );

      await transaction.commit();
    } catch (error: any) {
      await transaction?.rollback();
      throw new Error(error?.message || ERROR_MESSAGES.AUTH.PASSWORD_UPDATE);
    }
  }

  /**
   * Replaces the email in a signup invitation with a new email.
   * The invitation must be for a distributor admin and the email must be valid.
   * @param invitation - The signup invitation to update.
   * @param oldEmail - The current email associated with the invitation.
   * @param newEmail - The new email to update the invitation to.
   * @param transaction - The transaction to use for the update.
   * @throws If the invitation is not for a distributor admin or if the email is invalid.
   */
  public async replaceEmailInvite(
    oldEmail: string,
    newEmail: string,
    role: string,
    transaction: Transaction
  ): Promise<string> {
    const invitation = await SignupInvitation.findOne({
      where: { email: oldEmail },
      paranoid: false
    });

    const token = generateJwtToken(newEmail);

    if (!invitation) {
      await SignupInvitation.create(
        {
          email: oldEmail,
          role,
          token,
          expires_at: getExpiresAtTime(),
          invited_by: 1,
          created_at: new Date(),
          updated_at: new Date(),
          replace_email: newEmail
        },
        { transaction }
      );
    } else {
      const expiresAt = getExpiresAtTime();
      if (invitation.deleted_at) {
        await invitation.restore({ transaction });
      }

      invitation.status = "pending";
      invitation.expires_at = expiresAt;
      invitation.completed_at = null;
      invitation.deleted_at = null;
      invitation.replace_email = newEmail;
      invitation.token = token;

      await invitation.save({ transaction });
    }

    return token;
  }
}

export default new AuthRepository();

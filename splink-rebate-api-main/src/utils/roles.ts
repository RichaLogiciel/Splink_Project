import { ENTITY_TYPE } from "../config/appConstants";
import { USER_ROLES } from "../config/roles";

export const isSuperAdmin = (role: any) => {
  return role == ENTITY_TYPE.SUPER_ADMIN;
};

export const isDistributor = (role: any) => {
  return [
    ENTITY_TYPE.DISTRIBUTOR_ADMIN,
    ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE,
    ENTITY_TYPE.DISTRIBUTOR_SALES_REP,
    ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER,
    ENTITY_TYPE.DISTRIBUTOR_SALES_MANAGER
  ].includes(role);
};

export const isDistributorAdminAndExecutive = (role: any) => {
  return [
    ENTITY_TYPE.DISTRIBUTOR_ADMIN,
    ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE,
    ENTITY_TYPE.DISTRIBUTOR_SALES_MANAGER
  ].includes(role);
};

export const isDistributorAdmin = (role: any) => {
  return role == ENTITY_TYPE.DISTRIBUTOR_ADMIN;
};

export const isDistributorExecutive = (role: any) => {
  return role == ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE;
};

export const isDistributorSalesRep = (role: any) => {
  return role == ENTITY_TYPE.DISTRIBUTOR_SALES_REP;
};

export const isDistributorSalesRepManager = (role: any) => {
  return role == ENTITY_TYPE.DISTRIBUTOR_SALES_MANAGER;
};

export const isDistributorGeneralManager = (role: any) => {
  return role == ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER;
};

export const isDistributorAdminOrManagerOrExecutive = (role: any) => {
  return [
    ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER,
    ENTITY_TYPE.DISTRIBUTOR_ADMIN,
    ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE,
    ENTITY_TYPE.DISTRIBUTOR_SALES_MANAGER
  ].includes(role);
};

export const isStore = (role: any) => {
  return role == ENTITY_TYPE.STORE;
};

export const isChainAdmin = (role: any) => {
  return role == ENTITY_TYPE.CHAIN_ADMIN;
};

export const isManufacturer = (role: any) => {
  return [
    ENTITY_TYPE.MANUFACTURER,
    ENTITY_TYPE.MANUFACTURER_EXECUTIVE,
    ENTITY_TYPE.MANUFACTURER_SALES_REP,
    ENTITY_TYPE.MANUFACTURER_ACCOUNT_MANAGER
  ].includes(role);
};

export const isManufacturerAdminAndExecutive = (role: any) => {
  return [
    ENTITY_TYPE.MANUFACTURER,
    ENTITY_TYPE.MANUFACTURER_EXECUTIVE
  ].includes(role);
};

export const isManufacturerAdmin = (role: any) => {
  return role == ENTITY_TYPE.MANUFACTURER;
};

export const isManufacturerExecutive = (role: string) => {
  return role == ENTITY_TYPE.MANUFACTURER_EXECUTIVE;
};
export const isManufacturerSalesRep = (role: string) => {
  return role == ENTITY_TYPE.MANUFACTURER_SALES_REP;
};

export const isManufacturerAccountManager = (role: string) => {
  return role == ENTITY_TYPE.MANUFACTURER_ACCOUNT_MANAGER;
};

export const getDistributorIdAsRole = (user: any, role: string) => {
  switch (role) {
    case ENTITY_TYPE.DISTRIBUTOR_ADMIN:
    case ENTITY_TYPE.DISTRIBUTOR_SALES_REP:
      return user.associatedUserId;

    case ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE:
    case ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER:
    case ENTITY_TYPE.DISTRIBUTOR_SALES_MANAGER:
      return user.parentEntityId;

    default:
      throw new Error("Invalid Role");
  }
};

export const getParentDistributorId = (user: any, role: string) => {
  switch (role) {
    case ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE:
    case ENTITY_TYPE.DISTRIBUTOR_SALES_REP:
    case ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER:
    case ENTITY_TYPE.DISTRIBUTOR_SALES_MANAGER:
    case ENTITY_TYPE.STORE:
      return user.parentEntityId;

    case ENTITY_TYPE.DISTRIBUTOR_ADMIN:
      return user.associatedUserId;

    default:
      return 0;
  }
};

// Return the higher distributor role from the user roles for multiple roles Distributor Sales Rep Manager, Sales Rep
export const getHigherDistributorRole = (userRoles: string[]): string => {
  const rolePriority = [
    // TODO: FOR FUTURE USE ONLY, IF MULTIPLE ROLES ARE NEEDED, AND WE NEED TO GET THE HIGHER ROLE, NOT JUST THE FIRST ONE
    // USER_ROLES.DISTRIBUTOR_ADMIN,
    // USER_ROLES.DISTRIBUTOR_GENERAL_MANAGER,
    // USER_ROLES.DISTRIBUTOR_EXECUTIVE,
    USER_ROLES.DISTRIBUTOR_SALES_MANAGER,
    USER_ROLES.DISTRIBUTOR_SALES_REP
  ];

  // Return the first role in priority order that exists in userRoles
  // Find the highest role from the list
  const higherRole = rolePriority.find((role) => userRoles.includes(role));

  // Always return a string — fallback to the first user role or an empty string
  return higherRole || userRoles[0] || "";
};

/**
 * Get the program compliance earning column based on the role
 * @param role - The role of the user
 * @returns The program compliance earning column
 */
export const getProgramComplianceEarningColumn = (role: string | undefined) => {
  if (!role) {
    return "earned_rebate";
  }
  const allowedRoles = [
    ENTITY_TYPE.DISTRIBUTOR_ADMIN,
    ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE
  ];
  if (allowedRoles.includes(role as ENTITY_TYPE)) {
    return "unadjusted_earned_rebate";
  }
  return "earned_rebate";
};

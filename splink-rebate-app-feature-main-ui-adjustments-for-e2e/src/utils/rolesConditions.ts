import { USER_ROLES } from "@/configs/roles";

export const isSuperAdmin = (role: string = "") => {
  return role == USER_ROLES.SUPER_ADMIN;
};

export const isDistributor = (role: string) => {
  return [
    USER_ROLES.DISTRIBUTOR_ADMIN,
    USER_ROLES.DISTRIBUTOR_EXECUTIVE,
    USER_ROLES.DISTRIBUTOR_SALES_REP,
    USER_ROLES.DISTRIBUTOR_GENERAL_MANAGER,
    USER_ROLES.DISTRIBUTOR_SALES_MANAGER
  ].includes(role);
};

export const isDistributorAdminAndExecutive = (role: string = "") => {
  return [
    USER_ROLES.DISTRIBUTOR_ADMIN,
    USER_ROLES.DISTRIBUTOR_EXECUTIVE,
    USER_ROLES.DISTRIBUTOR_SALES_MANAGER
  ].includes(role);
};

export const isDistributorAdmin = (role: string) => {
  return role == USER_ROLES.DISTRIBUTOR_ADMIN;
};

export const isDistributorExecutive = (role: string) => {
  return role == USER_ROLES.DISTRIBUTOR_EXECUTIVE;
};

export const isDistributorSalesRep = (role: string) => {
  return role == USER_ROLES.DISTRIBUTOR_SALES_REP;
};

export const isDistributorSalesRepManager = (role: string) => {
  return role == USER_ROLES.DISTRIBUTOR_SALES_MANAGER;
};

export const isChain = (role: string) => {
  return role == USER_ROLES.CHAIN_ADMIN;
};

export const isStore = (role: string) => {
  return role == USER_ROLES.STORE;
};

export const isManufacturer = (role: string) => {
  return [
    USER_ROLES.MANUFACTURER,
    USER_ROLES.MANUFACTURER_EXECUTIVE,
    USER_ROLES.MANUFACTURER_SALES_REP,
    USER_ROLES.MANUFACTURER_ACCOUNT_MANAGER
  ].includes(role);
};

export const isManufacturerAdminAndExecutive = (role: string = "") => {
  return [USER_ROLES.MANUFACTURER, USER_ROLES.MANUFACTURER_EXECUTIVE].includes(
    role
  );
};

export const isManufacturerAccountManager = (role: string) => {
  return [USER_ROLES.MANUFACTURER_ACCOUNT_MANAGER].includes(role);
};

export const isDistributorGeneralManager = (role: string) => {
  return [USER_ROLES.DISTRIBUTOR_GENERAL_MANAGER].includes(role);
};

export const isManufacturerAdmin = (role: string) => {
  return role == USER_ROLES.MANUFACTURER;
};

export const isManufacturerExecutive = (role: string) => {
  return role == USER_ROLES.MANUFACTURER_EXECUTIVE;
};

export const isManufacturerSalesRep = (role: string) => {
  return role == USER_ROLES.MANUFACTURER_SALES_REP;
};

export const getManufacturerId = (role: string, user: any) => {
  const isAdmin = isManufacturerAdmin(role);
  return isAdmin ? user?.associatedUserId : user.parentEntityId;
};

// get the parent distributor id from the user
export const getParentDistributorId = (role: string, user: any) => {
  const isAdmin = isDistributorAdmin(role);
  return isAdmin ? user?.associatedUserId : user.parentEntityId;
};

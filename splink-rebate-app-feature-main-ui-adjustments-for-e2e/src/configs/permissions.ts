import { USER_ROLES } from "./roles";

export const PERMISSIONS: any = {
  [USER_ROLES.DISTRIBUTOR_ADMIN]: {
    programs: true
  },
  [USER_ROLES.DISTRIBUTOR_EXECUTIVE]: {
    programs: true
  },
  [USER_ROLES.DISTRIBUTOR_SALES_REP]: {
    programs: true
  },
  [USER_ROLES.MANUFACTURER]: {
    programs: true
  },
  [USER_ROLES.MANUFACTURER_EXECUTIVE]: {
    programs: true
  },
  [USER_ROLES.MANUFACTURER_SALES_REP]: {
    programs: true
  },
  [USER_ROLES.STORE]: {
    programs: true
  }
};

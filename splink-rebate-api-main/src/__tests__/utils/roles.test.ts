/**
 * Roles Utility Functions Tests
 *
 * Tests for role checking and utility functions:
 * - Role validation functions (isSuperAdmin, isDistributor, etc.)
 * - Distributor ID retrieval functions
 * - Role hierarchy and priority functions
 * - Program compliance earning column selection
 */

import { ENTITY_TYPE } from "../../config/appConstants";
import { USER_ROLES } from "../../config/roles";
import {
  isSuperAdmin,
  isDistributor,
  isDistributorAdminAndExecutive,
  isDistributorAdmin,
  isDistributorExecutive,
  isDistributorSalesRep,
  isDistributorSalesRepManager,
  isDistributorGeneralManager,
  isDistributorAdminOrManagerOrExecutive,
  isStore,
  isChainAdmin,
  isManufacturer,
  isManufacturerAdminAndExecutive,
  isManufacturerAdmin,
  isManufacturerExecutive,
  isManufacturerSalesRep,
  isManufacturerAccountManager,
  getDistributorIdAsRole,
  getParentDistributorId,
  getHigherDistributorRole,
  getProgramComplianceEarningColumn
} from "../../utils/roles";

describe("Roles Utility Functions", () => {
  describe("isSuperAdmin", () => {
    it("should return true for SUPER_ADMIN role", () => {
      expect(isSuperAdmin(ENTITY_TYPE.SUPER_ADMIN)).toBe(true);
    });

    it("should return false for non-super-admin roles", () => {
      expect(isSuperAdmin(ENTITY_TYPE.DISTRIBUTOR_ADMIN)).toBe(false);
      expect(isSuperAdmin(ENTITY_TYPE.STORE)).toBe(false);
      expect(isSuperAdmin(ENTITY_TYPE.MANUFACTURER)).toBe(false);
    });

    it("should return false for null or undefined", () => {
      expect(isSuperAdmin(null)).toBe(false);
      expect(isSuperAdmin(undefined)).toBe(false);
    });
  });

  describe("isDistributor", () => {
    it("should return true for all distributor role types", () => {
      expect(isDistributor(ENTITY_TYPE.DISTRIBUTOR_ADMIN)).toBe(true);
      expect(isDistributor(ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE)).toBe(true);
      expect(isDistributor(ENTITY_TYPE.DISTRIBUTOR_SALES_REP)).toBe(true);
      expect(isDistributor(ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER)).toBe(true);
      expect(isDistributor(ENTITY_TYPE.DISTRIBUTOR_SALES_MANAGER)).toBe(true);
    });

    it("should return false for non-distributor roles", () => {
      expect(isDistributor(ENTITY_TYPE.STORE)).toBe(false);
      expect(isDistributor(ENTITY_TYPE.MANUFACTURER)).toBe(false);
      expect(isDistributor(ENTITY_TYPE.SUPER_ADMIN)).toBe(false);
    });
  });

  describe("isDistributorAdminAndExecutive", () => {
    it("should return true for admin, executive, and sales manager", () => {
      expect(
        isDistributorAdminAndExecutive(ENTITY_TYPE.DISTRIBUTOR_ADMIN)
      ).toBe(true);
      expect(
        isDistributorAdminAndExecutive(ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE)
      ).toBe(true);
      expect(
        isDistributorAdminAndExecutive(ENTITY_TYPE.DISTRIBUTOR_SALES_MANAGER)
      ).toBe(true);
    });

    it("should return false for other distributor roles", () => {
      expect(
        isDistributorAdminAndExecutive(ENTITY_TYPE.DISTRIBUTOR_SALES_REP)
      ).toBe(false);
      expect(
        isDistributorAdminAndExecutive(ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER)
      ).toBe(false);
    });
  });

  describe("isDistributorAdmin", () => {
    it("should return true only for DISTRIBUTOR_ADMIN", () => {
      expect(isDistributorAdmin(ENTITY_TYPE.DISTRIBUTOR_ADMIN)).toBe(true);
    });

    it("should return false for other roles", () => {
      expect(isDistributorAdmin(ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE)).toBe(false);
      expect(isDistributorAdmin(ENTITY_TYPE.DISTRIBUTOR_SALES_REP)).toBe(false);
    });
  });

  describe("isDistributorExecutive", () => {
    it("should return true only for DISTRIBUTOR_EXECUTIVE", () => {
      expect(isDistributorExecutive(ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE)).toBe(
        true
      );
    });

    it("should return false for other roles", () => {
      expect(isDistributorExecutive(ENTITY_TYPE.DISTRIBUTOR_ADMIN)).toBe(false);
    });
  });

  describe("isDistributorSalesRep", () => {
    it("should return true only for DISTRIBUTOR_SALES_REP", () => {
      expect(isDistributorSalesRep(ENTITY_TYPE.DISTRIBUTOR_SALES_REP)).toBe(
        true
      );
    });

    it("should return false for other roles", () => {
      expect(isDistributorSalesRep(ENTITY_TYPE.DISTRIBUTOR_ADMIN)).toBe(false);
    });
  });

  describe("isDistributorSalesRepManager", () => {
    it("should return true only for DISTRIBUTOR_SALES_MANAGER", () => {
      expect(
        isDistributorSalesRepManager(ENTITY_TYPE.DISTRIBUTOR_SALES_MANAGER)
      ).toBe(true);
    });

    it("should return false for other roles", () => {
      expect(
        isDistributorSalesRepManager(ENTITY_TYPE.DISTRIBUTOR_SALES_REP)
      ).toBe(false);
    });
  });

  describe("isDistributorGeneralManager", () => {
    it("should return true only for DISTRIBUTOR_GENERAL_MANAGER", () => {
      expect(
        isDistributorGeneralManager(ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER)
      ).toBe(true);
    });

    it("should return false for other roles", () => {
      expect(isDistributorGeneralManager(ENTITY_TYPE.DISTRIBUTOR_ADMIN)).toBe(
        false
      );
    });
  });

  describe("isDistributorAdminOrManagerOrExecutive", () => {
    it("should return true for admin, manager, executive, and general manager", () => {
      expect(
        isDistributorAdminOrManagerOrExecutive(ENTITY_TYPE.DISTRIBUTOR_ADMIN)
      ).toBe(true);
      expect(
        isDistributorAdminOrManagerOrExecutive(
          ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE
        )
      ).toBe(true);
      expect(
        isDistributorAdminOrManagerOrExecutive(
          ENTITY_TYPE.DISTRIBUTOR_SALES_MANAGER
        )
      ).toBe(true);
      expect(
        isDistributorAdminOrManagerOrExecutive(
          ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER
        )
      ).toBe(true);
    });

    it("should return false for sales rep", () => {
      expect(
        isDistributorAdminOrManagerOrExecutive(
          ENTITY_TYPE.DISTRIBUTOR_SALES_REP
        )
      ).toBe(false);
    });
  });

  describe("isStore", () => {
    it("should return true only for STORE role", () => {
      expect(isStore(ENTITY_TYPE.STORE)).toBe(true);
    });

    it("should return false for non-store roles", () => {
      expect(isStore(ENTITY_TYPE.DISTRIBUTOR_ADMIN)).toBe(false);
      expect(isStore(ENTITY_TYPE.CHAIN_ADMIN)).toBe(false);
    });
  });

  describe("isChainAdmin", () => {
    it("should return true only for CHAIN_ADMIN role", () => {
      expect(isChainAdmin(ENTITY_TYPE.CHAIN_ADMIN)).toBe(true);
    });

    it("should return false for non-chain-admin roles", () => {
      expect(isChainAdmin(ENTITY_TYPE.STORE)).toBe(false);
    });
  });

  describe("isManufacturer", () => {
    it("should return true for all manufacturer role types", () => {
      expect(isManufacturer(ENTITY_TYPE.MANUFACTURER)).toBe(true);
      expect(isManufacturer(ENTITY_TYPE.MANUFACTURER_EXECUTIVE)).toBe(true);
      expect(isManufacturer(ENTITY_TYPE.MANUFACTURER_SALES_REP)).toBe(true);
      expect(isManufacturer(ENTITY_TYPE.MANUFACTURER_ACCOUNT_MANAGER)).toBe(
        true
      );
    });

    it("should return false for non-manufacturer roles", () => {
      expect(isManufacturer(ENTITY_TYPE.DISTRIBUTOR_ADMIN)).toBe(false);
      expect(isManufacturer(ENTITY_TYPE.STORE)).toBe(false);
    });
  });

  describe("isManufacturerAdminAndExecutive", () => {
    it("should return true for manufacturer admin and executive", () => {
      expect(isManufacturerAdminAndExecutive(ENTITY_TYPE.MANUFACTURER)).toBe(
        true
      );
      expect(
        isManufacturerAdminAndExecutive(ENTITY_TYPE.MANUFACTURER_EXECUTIVE)
      ).toBe(true);
    });

    it("should return false for other manufacturer roles", () => {
      expect(
        isManufacturerAdminAndExecutive(ENTITY_TYPE.MANUFACTURER_SALES_REP)
      ).toBe(false);
      expect(
        isManufacturerAdminAndExecutive(
          ENTITY_TYPE.MANUFACTURER_ACCOUNT_MANAGER
        )
      ).toBe(false);
    });
  });

  describe("isManufacturerAdmin", () => {
    it("should return true only for MANUFACTURER role", () => {
      expect(isManufacturerAdmin(ENTITY_TYPE.MANUFACTURER)).toBe(true);
    });

    it("should return false for other roles", () => {
      expect(isManufacturerAdmin(ENTITY_TYPE.MANUFACTURER_EXECUTIVE)).toBe(
        false
      );
    });
  });

  describe("isManufacturerExecutive", () => {
    it("should return true only for MANUFACTURER_EXECUTIVE", () => {
      expect(isManufacturerExecutive(ENTITY_TYPE.MANUFACTURER_EXECUTIVE)).toBe(
        true
      );
    });

    it("should return false for other roles", () => {
      expect(isManufacturerExecutive(ENTITY_TYPE.MANUFACTURER)).toBe(false);
    });
  });

  describe("isManufacturerSalesRep", () => {
    it("should return true only for MANUFACTURER_SALES_REP", () => {
      expect(isManufacturerSalesRep(ENTITY_TYPE.MANUFACTURER_SALES_REP)).toBe(
        true
      );
    });

    it("should return false for other roles", () => {
      expect(isManufacturerSalesRep(ENTITY_TYPE.MANUFACTURER)).toBe(false);
    });
  });

  describe("isManufacturerAccountManager", () => {
    it("should return true only for MANUFACTURER_ACCOUNT_MANAGER", () => {
      expect(
        isManufacturerAccountManager(ENTITY_TYPE.MANUFACTURER_ACCOUNT_MANAGER)
      ).toBe(true);
    });

    it("should return false for other roles", () => {
      expect(
        isManufacturerAccountManager(ENTITY_TYPE.MANUFACTURER_SALES_REP)
      ).toBe(false);
    });
  });

  describe("getDistributorIdAsRole", () => {
    it("should return associatedUserId for DISTRIBUTOR_ADMIN", () => {
      const user = { associatedUserId: 123, parentEntityId: 456 };
      const result = getDistributorIdAsRole(
        user,
        ENTITY_TYPE.DISTRIBUTOR_ADMIN
      );
      expect(result).toBe(123);
    });

    it("should return associatedUserId for DISTRIBUTOR_SALES_REP", () => {
      const user = { associatedUserId: 789, parentEntityId: 101 };
      const result = getDistributorIdAsRole(
        user,
        ENTITY_TYPE.DISTRIBUTOR_SALES_REP
      );
      expect(result).toBe(789);
    });

    it("should return parentEntityId for DISTRIBUTOR_EXECUTIVE", () => {
      const user = { associatedUserId: 123, parentEntityId: 456 };
      const result = getDistributorIdAsRole(
        user,
        ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE
      );
      expect(result).toBe(456);
    });

    it("should return parentEntityId for DISTRIBUTOR_GENERAL_MANAGER", () => {
      const user = { associatedUserId: 123, parentEntityId: 789 };
      const result = getDistributorIdAsRole(
        user,
        ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER
      );
      expect(result).toBe(789);
    });

    it("should return parentEntityId for DISTRIBUTOR_SALES_MANAGER", () => {
      const user = { associatedUserId: 123, parentEntityId: 111 };
      const result = getDistributorIdAsRole(
        user,
        ENTITY_TYPE.DISTRIBUTOR_SALES_MANAGER
      );
      expect(result).toBe(111);
    });

    it("should throw error for invalid role", () => {
      const user = { associatedUserId: 123, parentEntityId: 456 };
      expect(() => getDistributorIdAsRole(user, "INVALID_ROLE")).toThrow(
        "Invalid Role"
      );
      expect(() => getDistributorIdAsRole(user, ENTITY_TYPE.STORE)).toThrow(
        "Invalid Role"
      );
    });
  });

  describe("getParentDistributorId", () => {
    it("should return parentEntityId for DISTRIBUTOR_EXECUTIVE", () => {
      const user = { associatedUserId: 123, parentEntityId: 456 };
      const result = getParentDistributorId(
        user,
        ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE
      );
      expect(result).toBe(456);
    });

    it("should return parentEntityId for DISTRIBUTOR_SALES_REP", () => {
      const user = { associatedUserId: 123, parentEntityId: 789 };
      const result = getParentDistributorId(
        user,
        ENTITY_TYPE.DISTRIBUTOR_SALES_REP
      );
      expect(result).toBe(789);
    });

    it("should return parentEntityId for DISTRIBUTOR_GENERAL_MANAGER", () => {
      const user = { associatedUserId: 123, parentEntityId: 111 };
      const result = getParentDistributorId(
        user,
        ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER
      );
      expect(result).toBe(111);
    });

    it("should return parentEntityId for DISTRIBUTOR_SALES_MANAGER", () => {
      const user = { associatedUserId: 123, parentEntityId: 222 };
      const result = getParentDistributorId(
        user,
        ENTITY_TYPE.DISTRIBUTOR_SALES_MANAGER
      );
      expect(result).toBe(222);
    });

    it("should return parentEntityId for STORE", () => {
      const user = { associatedUserId: 123, parentEntityId: 333 };
      const result = getParentDistributorId(user, ENTITY_TYPE.STORE);
      expect(result).toBe(333);
    });

    it("should return associatedUserId for DISTRIBUTOR_ADMIN", () => {
      const user = { associatedUserId: 999, parentEntityId: 456 };
      const result = getParentDistributorId(
        user,
        ENTITY_TYPE.DISTRIBUTOR_ADMIN
      );
      expect(result).toBe(999);
    });

    it("should return 0 for invalid/unknown roles", () => {
      const user = { associatedUserId: 123, parentEntityId: 456 };
      const result = getParentDistributorId(user, "UNKNOWN_ROLE");
      expect(result).toBe(0);
    });
  });

  describe("getHigherDistributorRole", () => {
    it("should return DISTRIBUTOR_SALES_MANAGER when present", () => {
      const roles = [
        USER_ROLES.DISTRIBUTOR_SALES_REP,
        USER_ROLES.DISTRIBUTOR_SALES_MANAGER
      ];
      const result = getHigherDistributorRole(roles);
      expect(result).toBe(USER_ROLES.DISTRIBUTOR_SALES_MANAGER);
    });

    it("should return DISTRIBUTOR_SALES_REP if manager not present", () => {
      const roles = [USER_ROLES.DISTRIBUTOR_SALES_REP];
      const result = getHigherDistributorRole(roles);
      expect(result).toBe(USER_ROLES.DISTRIBUTOR_SALES_REP);
    });

    it("should return first role if no priority roles match", () => {
      const roles = ["SOME_OTHER_ROLE", "ANOTHER_ROLE"];
      const result = getHigherDistributorRole(roles);
      expect(result).toBe("SOME_OTHER_ROLE");
    });

    it("should return empty string for empty array", () => {
      const result = getHigherDistributorRole([]);
      expect(result).toBe("");
    });

    it("should prioritize manager over sales rep", () => {
      const roles = [
        USER_ROLES.DISTRIBUTOR_SALES_REP,
        "OTHER_ROLE",
        USER_ROLES.DISTRIBUTOR_SALES_MANAGER
      ];
      const result = getHigherDistributorRole(roles);
      expect(result).toBe(USER_ROLES.DISTRIBUTOR_SALES_MANAGER);
    });
  });

  describe("getProgramComplianceEarningColumn", () => {
    it('should return "unadjusted_earned_rebate" for DISTRIBUTOR_ADMIN', () => {
      const result = getProgramComplianceEarningColumn(
        ENTITY_TYPE.DISTRIBUTOR_ADMIN
      );
      expect(result).toBe("unadjusted_earned_rebate");
    });

    it('should return "unadjusted_earned_rebate" for DISTRIBUTOR_EXECUTIVE', () => {
      const result = getProgramComplianceEarningColumn(
        ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE
      );
      expect(result).toBe("unadjusted_earned_rebate");
    });

    it('should return "earned_rebate" for DISTRIBUTOR_SALES_REP', () => {
      const result = getProgramComplianceEarningColumn(
        ENTITY_TYPE.DISTRIBUTOR_SALES_REP
      );
      expect(result).toBe("earned_rebate");
    });

    it('should return "earned_rebate" for STORE', () => {
      const result = getProgramComplianceEarningColumn(ENTITY_TYPE.STORE);
      expect(result).toBe("earned_rebate");
    });

    it('should return "earned_rebate" for undefined role', () => {
      const result = getProgramComplianceEarningColumn(undefined);
      expect(result).toBe("earned_rebate");
    });

    it('should return "earned_rebate" for null role', () => {
      const result = getProgramComplianceEarningColumn(null as any);
      expect(result).toBe("earned_rebate");
    });

    it('should return "earned_rebate" for unknown role', () => {
      const result = getProgramComplianceEarningColumn("UNKNOWN_ROLE");
      expect(result).toBe("earned_rebate");
    });
  });
});

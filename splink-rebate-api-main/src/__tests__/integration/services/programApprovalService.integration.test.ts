jest.mock("../../../db");
jest.mock("../../../models/Program");
jest.mock("../../../models/ProgramApproval");
jest.mock("../../../models/ProgramDetail");
jest.mock("../../../models/Manufacturer");
jest.mock("../../../models/ProgramVisibility");
jest.mock("../../../models/ProgramParticipant");
jest.mock("../../../services/Programs/ListProgramsService");
jest.mock("../../../utils/helpers", () => ({
  ...jest.requireActual("../../../utils/helpers"),
  getEnvironment: jest.fn(() => "development")
}));

// Create manual mocks for models
jest.mock("../../../models/Program", () => ({
  __esModule: true,
  default: {
    findAndCountAll: jest.fn(),
    findOne: jest.fn(),
    hasMany: jest.fn()
  }
}));

jest.mock("../../../models/ProgramDetail", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    belongsTo: jest.fn()
  }
}));

jest.mock("../../../models/ProgramApproval", () => ({
  __esModule: true,
  default: {
    update: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn()
  }
}));

jest.mock("../../../models/ProgramVisibility", () => ({
  __esModule: true,
  default: {
    upsert: jest.fn(),
    update: jest.fn()
  }
}));

jest.mock("../../../models/ProgramParticipant", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    create: jest.fn()
  }
}));

jest.mock("../../../models/Manufacturer", () => ({
  __esModule: true,
  default: {}
}));

jest.mock("../../../models/ProductCodeMapping", () => ({
  __esModule: true,
  default: {
    init: jest.fn()
  }
}));

// Mock other dependencies
jest.mock("../../../db", () => ({
  __esModule: true,
  default: {
    transaction: jest.fn()
  }
}));

jest.mock("../../../services/Programs/ListProgramsService", () => ({
  __esModule: true,
  default: {
    getSingleStoreProgram: jest.fn()
  }
}));

import { ENTITY_TYPE, PROGRAM_APPROVAL_STATUS } from "@/config/appConstants";
import { ERROR_MESSAGES } from "@/config/errorMessages";
import { Op } from "sequelize";
import sequelize from "../../../db";
import Program from "../../../models/Program";
import ProgramApproval from "../../../models/ProgramApproval";
import ProgramParticipant from "../../../models/ProgramParticipant";
import ProgramVisibility from "../../../models/ProgramVisibility";
import ProgramApprovalService from "../../../services/ProgramApproval/ProgramApprovalService";
import ListProgramsService from "../../../services/Programs/ListProgramsService";

describe("ProgramApprovalService Integration Tests", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("getPendingApprovalPrograms", () => {
    it("should successfully get pending approval programs", async () => {
      const mockPrograms = {
        rows: [
          {
            id: 121,
            name: "Store Rebate Program",
            participantType: "SALES_REP",
            programType: "SPIFF",
            paymentTerm: "QUARTERLY",
            startDate: "2025-05-06T18:30:00.000Z",
            endDate: "2025-05-30T18:30:00.000Z",
            targetAudience: "SALES_REP",
            approval_status: "PENDING",
            created_at: "2025-05-07T14:20:36.677Z",
            updated_at: "2025-05-07T14:20:36.677Z",
            ProgramCreator: {
              logo: "https://example.com/logo.png",
              name: "Wonderful Pistachios",
              authorized: true,
              organizationName: "Wonderful Pistachios"
            },
            ProgramApproval: [
              {
                status: "PENDING"
              }
            ],
            ProgramDetails: [
              {
                id: 200,
                overview: "$20 per compliant store. One-time payment per store."
              }
            ]
          }
        ],
        count: 1
      };

      (Program.findAndCountAll as jest.Mock).mockResolvedValue(mockPrograms);

      const result = await ProgramApprovalService.getPendingApprovalPrograms({
        distributorId: 1,
        page: 1,
        limit: 10
      });

      expect(Program.findAndCountAll).toHaveBeenCalled();
      expect(result).toEqual({
        programs: mockPrograms.rows,
        limit: 10,
        page: 1,
        totalCount: mockPrograms.count
      });
    });

    it("should handle service error", async () => {
      (Program.findAndCountAll as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      await expect(
        ProgramApprovalService.getPendingApprovalPrograms({
          distributorId: 1,
          page: 1,
          limit: 10
        })
      ).rejects.toThrow("Database error");
    });
  });

  describe("getProgramDetailsForApproval", () => {
    it("should successfully get program details for approval", async () => {
      const mockProgram = {
        id: 1,
        name: "Test Program",
        approval_status: "PENDING",
        toJSON: jest.fn().mockReturnValue({
          id: 1,
          name: "Test Program",
          approval_status: "PENDING"
        }),
        ProgramCreator: {
          id: 1,
          logo: "logo.png",
          name: "Manufacturer",
          authorized: true
        },
        ProgramDetails: [
          {
            id: 1,
            overview: "Program Overview"
          }
        ]
      };

      const mockApproval = {
        status: "PENDING"
      };

      (Program.findOne as jest.Mock).mockResolvedValue(mockProgram);
      (ProgramApproval.findOne as jest.Mock).mockResolvedValue(mockApproval);

      const result = await ProgramApprovalService.getProgramDetailsForApproval({
        distributorId: 1,
        programId: 1
      });

      expect(Program.findOne).toHaveBeenCalled();
      expect(ProgramApproval.findOne).toHaveBeenCalled();
      expect(result).toEqual({
        id: 1,
        name: "Test Program",
        approval_status: "PENDING"
      });
    });

    it("should throw an error if program is not found", async () => {
      (Program.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        ProgramApprovalService.getProgramDetailsForApproval({
          distributorId: 1,
          programId: 999
        })
      ).rejects.toThrow("Program not found or not eligible for approval");
    });

    it("should handle generic error when fetching program details", async () => {
      // Mock Program.findOne to throw a generic error
      const mockError = new Error("Database error");
      (Program.findOne as jest.Mock).mockRejectedValue(mockError);

      await expect(
        ProgramApprovalService.getProgramDetailsForApproval({
          distributorId: 1,
          programId: 1
        })
      ).rejects.toThrow("Error fetching program details");
    });
  });

  describe("approveProgram", () => {
    it("should successfully approve a program", async () => {
      // Mock transaction
      const mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
      (sequelize.transaction as jest.Mock).mockImplementation(
        async (callback) => {
          return await callback(mockTransaction);
        }
      );

      // Mock ProgramApproval update
      (ProgramApproval.update as jest.Mock).mockResolvedValue([1]);
      (ProgramApproval.findAll as jest.Mock).mockResolvedValue([
        { program_detail_id: 1, approver_type: "DISTRIBUTOR" }
      ]);
      (ProgramVisibility.upsert as jest.Mock).mockResolvedValue([{}, true]);

      const result = await ProgramApprovalService.approveProgram({
        distributorId: 1,
        programId: 1,
        programDetailId: 1,
        notes: "Approved"
      });

      expect(sequelize.transaction).toHaveBeenCalled();
      expect(ProgramApproval.update).toHaveBeenCalledWith(
        {
          status: PROGRAM_APPROVAL_STATUS.APPROVED,
          notes: "Approved"
        },
        {
          where: {
            program_id: 1,
            approver_id: 1,
            status: {
              [Op.in]: [
                PROGRAM_APPROVAL_STATUS.PENDING,
                PROGRAM_APPROVAL_STATUS.REJECTED
              ]
            },
            deleted_at: null,
            program_detail_id: 1
          },
          transaction: mockTransaction
        }
      );
      expect(ProgramVisibility.upsert).toHaveBeenCalled();
      expect(result).toBe("Program approved successfully");
    });

    it("should throw an error if no programs to approve", async () => {
      // Mock transaction
      const mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
      (sequelize.transaction as jest.Mock).mockImplementation(
        async (callback) => {
          return await callback(mockTransaction);
        }
      );

      // Mock ProgramApproval update returning 0 (no rows updated)
      (ProgramApproval.update as jest.Mock).mockResolvedValue([0]);

      await expect(
        ProgramApprovalService.approveProgram({
          distributorId: 1,
          programId: 999,
          programDetailId: 1,
          notes: "Approved"
        })
      ).rejects.toThrow("Program detail not found or already approved");
    });

    it("should approve program without programDetailId", async () => {
      // Mock transaction
      const mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
      (sequelize.transaction as jest.Mock).mockImplementation(
        async (callback) => {
          return await callback(mockTransaction);
        }
      );

      // Mock ProgramApproval update
      (ProgramApproval.update as jest.Mock).mockResolvedValue([1]);
      (ProgramApproval.findAll as jest.Mock).mockResolvedValue([
        { program_detail_id: 1, approver_type: "DISTRIBUTOR" }
      ]);
      (ProgramVisibility.upsert as jest.Mock).mockResolvedValue([{}, true]);

      const result = await ProgramApprovalService.approveProgram({
        distributorId: 1,
        programId: 1,
        notes: "Approved without detail ID"
      });

      expect(sequelize.transaction).toHaveBeenCalled();
      expect(ProgramApproval.update).toHaveBeenCalledWith(
        {
          status: PROGRAM_APPROVAL_STATUS.APPROVED,
          notes: "Approved without detail ID"
        },
        {
          where: {
            program_id: 1,
            approver_id: 1,
            status: {
              [Op.in]: [
                PROGRAM_APPROVAL_STATUS.PENDING,
                PROGRAM_APPROVAL_STATUS.REJECTED
              ]
            },
            deleted_at: null
          },
          transaction: mockTransaction
        }
      );
      expect(result).toBe("Program approved successfully");
    });

    it("should handle generic error when approving", async () => {
      // Mock transaction to throw a generic error
      const mockError = new Error("Database connection error");
      (sequelize.transaction as jest.Mock).mockImplementation(async () => {
        throw mockError;
      });

      await expect(
        ProgramApprovalService.approveProgram({
          distributorId: 1,
          programId: 1,
          notes: "Testing generic error"
        })
      ).rejects.toThrow("Database connection error");
    });
  });

  describe("rejectProgram", () => {
    it("should successfully reject a program", async () => {
      // Mock transaction
      const mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
      (sequelize.transaction as jest.Mock).mockImplementation(
        async (callback) => {
          return await callback(mockTransaction);
        }
      );

      // Mock ProgramApproval update
      (ProgramApproval.update as jest.Mock).mockResolvedValue([1]);
      // Mock ProgramVisibility update
      (ProgramVisibility.update as jest.Mock).mockResolvedValue([1]);

      const result = await ProgramApprovalService.rejectProgram({
        distributorId: 1,
        programId: 1,
        programDetailId: 1,
        notes: "Rejected"
      });

      expect(sequelize.transaction).toHaveBeenCalled();
      expect(ProgramApproval.update).toHaveBeenCalledWith(
        {
          status: PROGRAM_APPROVAL_STATUS.REJECTED,
          notes: "Rejected"
        },
        {
          where: {
            program_id: 1,
            approver_id: 1,
            status: {
              [Op.in]: [
                PROGRAM_APPROVAL_STATUS.PENDING,
                PROGRAM_APPROVAL_STATUS.APPROVED
              ]
            },
            deleted_at: null,
            program_detail_id: 1
          },
          transaction: mockTransaction
        }
      );
      expect(ProgramVisibility.update).toHaveBeenCalled();
      expect(result).toBe("Program rejected successfully");
    });

    it("should throw an error if no programs to reject", async () => {
      // Mock transaction
      const mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
      (sequelize.transaction as jest.Mock).mockImplementation(
        async (callback) => {
          return await callback(mockTransaction);
        }
      );

      // Mock ProgramApproval update returning 0 (no rows updated)
      (ProgramApproval.update as jest.Mock).mockResolvedValue([0]);

      await expect(
        ProgramApprovalService.rejectProgram({
          distributorId: 1,
          programId: 999,
          programDetailId: 1,
          notes: "Rejected"
        })
      ).rejects.toThrow("Program detail not found or already processed");
    });

    it("should reject program without programDetailId", async () => {
      // Mock transaction
      const mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
      (sequelize.transaction as jest.Mock).mockImplementation(
        async (callback) => {
          return await callback(mockTransaction);
        }
      );

      // Mock ProgramApproval update
      (ProgramApproval.update as jest.Mock).mockResolvedValue([1]);
      // Mock ProgramVisibility update
      (ProgramVisibility.update as jest.Mock).mockResolvedValue([1]);

      const result = await ProgramApprovalService.rejectProgram({
        distributorId: 1,
        programId: 1,
        notes: "Rejected without detail ID"
      });

      expect(sequelize.transaction).toHaveBeenCalled();
      expect(ProgramApproval.update).toHaveBeenCalledWith(
        {
          status: PROGRAM_APPROVAL_STATUS.REJECTED,
          notes: "Rejected without detail ID"
        },
        {
          where: {
            program_id: 1,
            approver_id: 1,
            status: {
              [Op.in]: [
                PROGRAM_APPROVAL_STATUS.PENDING,
                PROGRAM_APPROVAL_STATUS.APPROVED
              ]
            },
            deleted_at: null
          },
          transaction: mockTransaction
        }
      );
      expect(result).toBe("Program rejected successfully");
    });

    it("should handle generic error when rejecting", async () => {
      // Mock transaction to throw a generic error
      const mockError = new Error("Database connection error");
      (sequelize.transaction as jest.Mock).mockImplementation(async () => {
        throw mockError;
      });

      await expect(
        ProgramApprovalService.rejectProgram({
          distributorId: 1,
          programId: 1,
          notes: "Testing generic error"
        })
      ).rejects.toThrow("Database connection error");
    });
  });

  describe("handleProgramAction", () => {
    it("should call approveProgram for distributor roles", async () => {
      const approveSpy = jest.spyOn(ProgramApprovalService, "approveProgram");
      const user = {
        id: 1,
        role: ENTITY_TYPE.DISTRIBUTOR_ADMIN,
        associatedUserId: 72
      };

      // Mock approveProgram implementation
      approveSpy.mockResolvedValue("Program approved successfully");

      const result = await ProgramApprovalService.handleProgramAction({
        user,
        role: ENTITY_TYPE.DISTRIBUTOR,
        programId: 1,
        programDetailId: 1,
        notes: "Test notes"
      });

      expect(approveSpy).toHaveBeenCalledWith({
        distributorId: 72,
        programId: 1,
        programDetailId: 1,
        notes: "Test notes"
      });
      expect(result).toBe("Program approved successfully");

      // Restore the original implementation
      approveSpy.mockRestore();
    });

    it("should call enrollStoreInProgram for store role", async () => {
      const enrollSpy = jest.spyOn(
        ProgramApprovalService as any,
        "enrollStoreInProgram"
      );
      const user = {
        id: 1,
        role: ENTITY_TYPE.STORE,
        associatedUserId: 100,
        parentEntityId: 72
      };

      // Mock enrollStoreInProgram implementation
      enrollSpy.mockResolvedValue("Store enrolled in program successfully");

      const result = await ProgramApprovalService.handleProgramAction({
        user,
        role: ENTITY_TYPE.STORE,
        programId: 1
      });

      expect(enrollSpy).toHaveBeenCalledWith({
        distributorId: 72,
        storeId: 100,
        programId: 1
      });
      expect(result).toBe("Store enrolled in program successfully");

      // Restore the original implementation
      enrollSpy.mockRestore();
    });

    it("should throw error for invalid role", async () => {
      const user = {
        id: 1,
        role: "INVALID_ROLE",
        associatedUserId: 72,
        parentEntityId: 100
      };

      await expect(
        ProgramApprovalService.handleProgramAction({
          user,
          role: "INVALID_ROLE",
          programId: 1
        })
      ).rejects.toThrow(ERROR_MESSAGES.REQUIRED.DISTRIBUTOR_ID);
    });

    it("should throw error if distributorId is missing", async () => {
      const user = {
        id: 1,
        role: ENTITY_TYPE.DISTRIBUTOR
        // No associatedUserId
      };

      await expect(
        ProgramApprovalService.handleProgramAction({
          user,
          role: ENTITY_TYPE.DISTRIBUTOR,
          programId: 1
        })
      ).rejects.toThrow(ERROR_MESSAGES.REQUIRED.DISTRIBUTOR_ID);
    });

    it("should handle generic error in program action", async () => {
      const user = {
        id: 1,
        role: ENTITY_TYPE.DISTRIBUTOR_ADMIN,
        associatedUserId: 72,
        parentEntityId: 100
      };

      // Mock approveProgram to throw a generic error
      const error = new Error("Unexpected error");
      jest
        .spyOn(ProgramApprovalService, "approveProgram")
        .mockRejectedValue(error);

      await expect(
        ProgramApprovalService.handleProgramAction({
          user,
          role: ENTITY_TYPE.DISTRIBUTOR_ADMIN,
          programId: 1
        })
      ).rejects.toThrow("Unexpected error");

      // Restore the original implementation
      jest.spyOn(ProgramApprovalService, "approveProgram").mockRestore();
    });
  });

  describe("optOutProgram", () => {
    it("should successfully opt out of a program", async () => {
      const mockProgramParticipant = {
        destroy: jest.fn().mockResolvedValue(true)
      };

      (ProgramParticipant.findOne as jest.Mock).mockResolvedValue(
        mockProgramParticipant
      );

      const result = await ProgramApprovalService.optOutProgram({
        storeId: 100,
        programId: 1,
        notes: "Opt out test"
      });

      expect(ProgramParticipant.findOne).toHaveBeenCalledWith({
        where: {
          programId: 1,
          entityId: 100,
          entityType: ENTITY_TYPE.STORE,
          deletedAt: null
        }
      });
      expect(mockProgramParticipant.destroy).toHaveBeenCalled();
      expect(result).toEqual({
        message: "Successfully opted out of program",
        effectiveDate: expect.any(Date),
        notes: "Opt out test"
      });
    });

    it("should throw error if program enrollment not found", async () => {
      (ProgramParticipant.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        ProgramApprovalService.optOutProgram({
          storeId: 100,
          programId: 999,
          notes: "Opt out test"
        })
      ).rejects.toThrow(ERROR_MESSAGES.NO_PROGRAMS_FOUND);
    });

    it("should handle generic error when opting out", async () => {
      const mockProgramParticipant = {
        destroy: jest.fn().mockRejectedValue(new Error("Database error"))
      };

      (ProgramParticipant.findOne as jest.Mock).mockResolvedValue(
        mockProgramParticipant
      );

      await expect(
        ProgramApprovalService.optOutProgram({
          storeId: 100,
          programId: 1,
          notes: "Opt out test"
        })
      ).rejects.toThrow("Database error");
    });
  });

  describe("enrollStoreInProgram", () => {
    it("should successfully enroll store in program", async () => {
      (
        ListProgramsService.getSingleStoreProgram as jest.Mock
      ).mockResolvedValue({
        id: 1,
        name: "Test Program"
      });
      (ProgramParticipant.findOne as jest.Mock).mockResolvedValue(null);
      (ProgramParticipant.create as jest.Mock).mockResolvedValue({
        id: 1,
        programId: 1,
        entityId: 100,
        entityType: ENTITY_TYPE.STORE
      });

      const enrollStoreInProgram = (ProgramApprovalService as any)
        .enrollStoreInProgram;
      const result = await enrollStoreInProgram({
        distributorId: 1,
        storeId: 100,
        programId: 1
      });

      expect(ListProgramsService.getSingleStoreProgram).toHaveBeenCalledWith({
        distributorId: 1,
        storeId: 100,
        programId: 1
      });
      expect(ProgramParticipant.findOne).toHaveBeenCalled();
      expect(ProgramParticipant.create).toHaveBeenCalledWith({
        programId: 1,
        entityId: 100,
        entityType: ENTITY_TYPE.STORE
      });
      expect(result).toBe("Store enrolled in program successfully");
    });

    it("should return already enrolled message if store is already enrolled", async () => {
      (
        ListProgramsService.getSingleStoreProgram as jest.Mock
      ).mockResolvedValue({
        id: 1,
        name: "Test Program"
      });
      (ProgramParticipant.findOne as jest.Mock).mockResolvedValue({
        id: 1,
        programId: 1,
        entityId: 100,
        entityType: ENTITY_TYPE.STORE
      });

      const enrollStoreInProgram = (ProgramApprovalService as any)
        .enrollStoreInProgram;
      const result = await enrollStoreInProgram({
        distributorId: 1,
        storeId: 100,
        programId: 1
      });

      expect(ProgramParticipant.create).not.toHaveBeenCalled();
      expect(result).toBe("Store is already enrolled in this program");
    });

    it("should throw error if program not found", async () => {
      (
        ListProgramsService.getSingleStoreProgram as jest.Mock
      ).mockResolvedValue(null);

      const enrollStoreInProgram = (ProgramApprovalService as any)
        .enrollStoreInProgram;

      await expect(
        enrollStoreInProgram({
          distributorId: 1,
          storeId: 100,
          programId: 999
        })
      ).rejects.toThrow("Program not found or not eligible for enrollment");
    });

    it("should handle generic error in store enrollment", async () => {
      // Mock ListProgramsService to return a program but ProgramParticipant.create to throw an error
      (
        ListProgramsService.getSingleStoreProgram as jest.Mock
      ).mockResolvedValue({
        id: 1,
        name: "Test Program"
      });
      (ProgramParticipant.findOne as jest.Mock).mockResolvedValue(null);
      (ProgramParticipant.create as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      const enrollStoreInProgram = (ProgramApprovalService as any)
        .enrollStoreInProgram;

      await expect(
        enrollStoreInProgram({
          distributorId: 1,
          storeId: 100,
          programId: 1
        })
      ).rejects.toThrow("Database error");
    });
  });
});

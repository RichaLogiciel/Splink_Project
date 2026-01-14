import { ENTITY_TYPE } from "@/config/appConstants";
import { ERROR_MESSAGES } from "@/config/errorMessages";
import { USER_ROLES } from "@/config/roles";
import { Request, Response } from "express";
import ProgramApprovalController from "../../controllers/ProgramApproval/ProgramApprovalController";
import Program from "../../models/Program";
import ProgramApprovalService from "../../services/ProgramApproval/ProgramApprovalService";
import { createMockRequestResponse } from "../helpers/test-utils";

describe("Program Approval Integration Tests", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    jest.resetAllMocks();
    const { req, res } = createMockRequestResponse();
    mockReq = req as Partial<Request>;
    mockRes = res as Partial<Response>;

    // Set default user as DISTRIBUTOR_ADMIN
    mockReq.user = {
      id: 1,
      role: USER_ROLES.DISTRIBUTOR_ADMIN,
      associatedUserId: 72,
      parentEntityId: 1,
      parentEntityType: ENTITY_TYPE.DISTRIBUTOR
    };
  });

  describe("getPendingApprovalPrograms", () => {
    it("should successfully get pending approval programs", async () => {
      mockReq.query = {
        page: "1",
        limit: "10"
      };

      const mockPrograms = {
        programs: [
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
              logo: "https://dev-splink-s3.s3.us-east-2.amazonaws.com/eac8104d-ceff-47fa-95c7-89ad72936c05-image (9).png",
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
                overview:
                  "$20 per compliant store. One-time QUARTERLY payment per store."
              }
            ]
          },
          {
            id: 120,
            name: "Store Rebate Program",
            participantType: "SALES_REP",
            programType: "SPIFF",
            paymentTerm: "ANNUAL",
            startDate: "2025-05-06T18:30:00.000Z",
            endDate: "2025-05-30T18:30:00.000Z",
            targetAudience: "SALES_REP",
            approval_status: "PENDING",
            created_at: "2025-05-07T10:21:30.125Z",
            updated_at: "2025-05-07T10:21:30.125Z",
            ProgramCreator: {
              logo: "https://dev-splink-s3.s3.us-east-2.amazonaws.com/eac8104d-ceff-47fa-95c7-89ad72936c05-image (9).png",
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
                id: 199,
                overview: "Earn per Shipper per store"
              }
            ]
          }
        ] as unknown as Program[],
        limit: 10,
        page: 1,
        totalCount: 2
      };

      jest
        .spyOn(ProgramApprovalService, "getPendingApprovalPrograms")
        .mockResolvedValue(mockPrograms);

      await ProgramApprovalController.getPendingApprovalPrograms(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockPrograms
      });
      expect(
        ProgramApprovalService.getPendingApprovalPrograms
      ).toHaveBeenCalledWith({
        distributorId: 72,
        page: 1,
        limit: 10
      });
    });

    it("should handle missing distributor ID", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.DISTRIBUTOR_ADMIN
        // Missing associatedUserId
      };

      mockReq.query = {
        page: "1",
        limit: "10"
      };

      await ProgramApprovalController.getPendingApprovalPrograms(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: ERROR_MESSAGES.REQUIRED.DISTRIBUTOR_ID
      });
    });

    it("should handle service error", async () => {
      mockReq.query = {
        page: "1",
        limit: "10"
      };

      jest
        .spyOn(ProgramApprovalService, "getPendingApprovalPrograms")
        .mockRejectedValue(new Error("Service error"));

      await ProgramApprovalController.getPendingApprovalPrograms(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Service error"
      });
    });
  });

  describe("getProgramDetailsForApproval", () => {
    it("should successfully get program details for approval", async () => {
      mockReq.params = {
        programId: "1"
      };

      const mockProgramDetails = {
        id: 1,
        name: "Test Program",
        programType: "Base",
        approval_status: "PENDING",
        ProgramCreator: {
          id: 1,
          logo: "logo.png",
          name: "Test Manufacturer",
          authorized: true,
          organizationName: "Test Org"
        },
        ProgramDetails: [
          {
            id: 1,
            overview: "Test Overview"
          }
        ],
        ProgramApproval: [
          {
            status: "PENDING"
          }
        ]
      } as any;

      jest
        .spyOn(ProgramApprovalService, "getProgramDetailsForApproval")
        .mockResolvedValue(mockProgramDetails);

      await ProgramApprovalController.getProgramDetailsForApproval(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockProgramDetails
      });
      expect(
        ProgramApprovalService.getProgramDetailsForApproval
      ).toHaveBeenCalledWith({
        distributorId: 72,
        programId: 1
      });
    });

    it("should handle missing distributor ID", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.DISTRIBUTOR_ADMIN
        // Missing associatedUserId
      };

      mockReq.params = {
        programId: "1"
      };

      await ProgramApprovalController.getProgramDetailsForApproval(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: ERROR_MESSAGES.REQUIRED.DISTRIBUTOR_ID
      });
    });

    it("should handle missing program ID", async () => {
      mockReq.params = {};

      await ProgramApprovalController.getProgramDetailsForApproval(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: ERROR_MESSAGES.REQUIRED.PROGRAM_ID
      });
    });

    it("should handle service error", async () => {
      mockReq.params = {
        programId: "1"
      };

      jest
        .spyOn(ProgramApprovalService, "getProgramDetailsForApproval")
        .mockRejectedValue(new Error("Service error"));

      await ProgramApprovalController.getProgramDetailsForApproval(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Service error"
      });
    });
  });

  describe("approveProgram", () => {
    it("should successfully approve program with programDetailId", async () => {
      mockReq.body = {
        programId: 1,
        programDetailId: 2,
        notes: "Approval notes"
      };

      const successMessage = "Program approved successfully";
      jest
        .spyOn(ProgramApprovalService, "handleProgramAction")
        .mockResolvedValue(successMessage);

      await ProgramApprovalController.approveProgram(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: successMessage
      });
      expect(ProgramApprovalService.handleProgramAction).toHaveBeenCalledWith({
        user: mockReq.user,
        role: USER_ROLES.DISTRIBUTOR_ADMIN,
        programId: 1,
        programDetailId: 2,
        notes: "Approval notes"
      });
    });

    it("should successfully approve program without programDetailId", async () => {
      mockReq.body = {
        programId: 121,
        notes: "Tier specific approval - meets criteria"
      };

      const successMessage = "Program approved successfully";
      jest
        .spyOn(ProgramApprovalService, "handleProgramAction")
        .mockResolvedValue(successMessage);

      await ProgramApprovalController.approveProgram(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: successMessage
      });
      expect(ProgramApprovalService.handleProgramAction).toHaveBeenCalledWith({
        user: mockReq.user,
        role: USER_ROLES.DISTRIBUTOR_ADMIN,
        programId: 121,
        programDetailId: undefined,
        notes: "Tier specific approval - meets criteria"
      });
    });

    it("should successfully approve program without notes", async () => {
      mockReq.body = {
        programId: 121
      };

      const successMessage = "Program approved successfully";
      jest
        .spyOn(ProgramApprovalService, "handleProgramAction")
        .mockResolvedValue(successMessage);

      await ProgramApprovalController.approveProgram(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: successMessage
      });
      expect(ProgramApprovalService.handleProgramAction).toHaveBeenCalledWith({
        user: mockReq.user,
        role: USER_ROLES.DISTRIBUTOR_ADMIN,
        programId: 121,
        programDetailId: undefined,
        notes: undefined
      });
    });

    it("should handle approving as a store user", async () => {
      mockReq.user = {
        id: 1,
        role: ENTITY_TYPE.STORE,
        associatedUserId: 100,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.DISTRIBUTOR
      };

      mockReq.body = {
        programId: 121,
        notes: "Store enrollment"
      };

      const successMessage = "Store enrolled in program successfully";
      jest
        .spyOn(ProgramApprovalService, "handleProgramAction")
        .mockResolvedValue(successMessage);

      await ProgramApprovalController.approveProgram(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: successMessage
      });
      expect(ProgramApprovalService.handleProgramAction).toHaveBeenCalledWith({
        user: mockReq.user,
        role: ENTITY_TYPE.STORE,
        programId: 121,
        programDetailId: undefined,
        notes: "Store enrollment"
      });
    });

    it("should handle missing program ID", async () => {
      mockReq.body = {
        programDetailId: 2,
        notes: "Approval notes"
      };

      await ProgramApprovalController.approveProgram(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: ERROR_MESSAGES.REQUIRED.PROGRAM_ID
      });
    });

    it("should handle invalid program detail ID", async () => {
      mockReq.body = {
        programId: 1,
        programDetailId: "invalid",
        notes: "Approval notes"
      };

      await ProgramApprovalController.approveProgram(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: ERROR_MESSAGES.REQUIRED.PROGRAM_DETAIL_ID
      });
    });

    it("should handle service error", async () => {
      mockReq.body = {
        programId: 1,
        programDetailId: 2,
        notes: "Approval notes"
      };

      jest
        .spyOn(ProgramApprovalService, "handleProgramAction")
        .mockRejectedValue(new Error("Service error"));

      await ProgramApprovalController.approveProgram(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Service error"
      });
    });

    it("should handle API error with status code", async () => {
      mockReq.body = {
        programId: 1,
        notes: "Approval notes"
      };

      const apiError = new Error("Not found") as any;
      apiError.statusCode = 404;

      jest
        .spyOn(ProgramApprovalService, "handleProgramAction")
        .mockRejectedValue(apiError);

      await ProgramApprovalController.approveProgram(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Not found"
      });
    });
  });

  describe("optOutProgram", () => {
    it("should successfully opt out of program", async () => {
      mockReq.user = {
        id: 1,
        role: ENTITY_TYPE.STORE,
        associatedUserId: 100,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.DISTRIBUTOR
      };

      mockReq.body = {
        programId: 1,
        notes: "Opt out notes"
      };

      const successResult = {
        message: "Successfully opted out of program",
        effectiveDate: new Date(),
        notes: "Opt out notes"
      };

      jest
        .spyOn(ProgramApprovalService, "optOutProgram")
        .mockResolvedValue(successResult);

      await ProgramApprovalController.optOutProgram(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: successResult
      });
      expect(ProgramApprovalService.optOutProgram).toHaveBeenCalledWith({
        storeId: 100,
        programId: 1,
        notes: "Opt out notes"
      });
    });

    it("should handle missing program ID", async () => {
      mockReq.user = {
        id: 1,
        role: ENTITY_TYPE.STORE,
        associatedUserId: 100,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.DISTRIBUTOR
      };

      mockReq.body = {
        notes: "Opt out notes"
      };

      await ProgramApprovalController.optOutProgram(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: ERROR_MESSAGES.REQUIRED.PROGRAM_ID
      });
    });

    it("should handle missing store ID", async () => {
      mockReq.user = {
        id: 1,
        role: ENTITY_TYPE.STORE,
        // Missing associatedUserId
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.DISTRIBUTOR
      };

      mockReq.body = {
        programId: 1,
        notes: "Opt out notes"
      };

      await ProgramApprovalController.optOutProgram(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: ERROR_MESSAGES.REQUIRED.STORE_ID
      });
    });

    it("should reject if user is not a store", async () => {
      // User is DISTRIBUTOR_ADMIN, not STORE
      mockReq.body = {
        programId: 1,
        notes: "Opt out notes"
      };

      await ProgramApprovalController.optOutProgram(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Only stores can opt out of programs"
      });
    });

    it("should handle service error", async () => {
      mockReq.user = {
        id: 1,
        role: ENTITY_TYPE.STORE,
        associatedUserId: 100,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.DISTRIBUTOR
      };

      mockReq.body = {
        programId: 1,
        notes: "Opt out notes"
      };

      jest
        .spyOn(ProgramApprovalService, "optOutProgram")
        .mockRejectedValue(new Error("Service error"));

      await ProgramApprovalController.optOutProgram(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Service error"
      });
    });
  });

  describe("rejectProgram", () => {
    it("should successfully reject program with programDetailId", async () => {
      mockReq.body = {
        programId: 1,
        programDetailId: 2,
        notes: "Rejection notes"
      };

      const successMessage = "Program rejected successfully";
      jest
        .spyOn(ProgramApprovalService, "rejectProgram")
        .mockResolvedValue(successMessage);

      await ProgramApprovalController.rejectProgram(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: successMessage
      });
      expect(ProgramApprovalService.rejectProgram).toHaveBeenCalledWith({
        distributorId: 72,
        programId: 1,
        programDetailId: 2,
        notes: "Rejection notes"
      });
    });

    it("should successfully reject program without programDetailId", async () => {
      mockReq.body = {
        programId: 121,
        notes: "Program does not meet our criteria"
      };

      const successMessage = "Program rejected successfully";
      jest
        .spyOn(ProgramApprovalService, "rejectProgram")
        .mockResolvedValue(successMessage);

      await ProgramApprovalController.rejectProgram(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: successMessage
      });
      expect(ProgramApprovalService.rejectProgram).toHaveBeenCalledWith({
        distributorId: 72,
        programId: 121,
        programDetailId: undefined,
        notes: "Program does not meet our criteria"
      });
    });

    it("should successfully reject program without notes", async () => {
      mockReq.body = {
        programId: 121
      };

      const successMessage = "Program rejected successfully";
      jest
        .spyOn(ProgramApprovalService, "rejectProgram")
        .mockResolvedValue(successMessage);

      await ProgramApprovalController.rejectProgram(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: successMessage
      });
      expect(ProgramApprovalService.rejectProgram).toHaveBeenCalledWith({
        distributorId: 72,
        programId: 121,
        programDetailId: undefined,
        notes: undefined
      });
    });

    it("should handle missing distributor ID", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.DISTRIBUTOR_ADMIN
        // Missing associatedUserId
      };

      mockReq.body = {
        programId: 1,
        notes: "Rejection notes"
      };

      await ProgramApprovalController.rejectProgram(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: ERROR_MESSAGES.REQUIRED.DISTRIBUTOR_ID
      });
    });

    it("should handle missing program ID", async () => {
      mockReq.body = {
        programDetailId: 2,
        notes: "Rejection notes"
      };

      await ProgramApprovalController.rejectProgram(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: ERROR_MESSAGES.REQUIRED.PROGRAM_ID
      });
    });

    it("should handle invalid program detail ID", async () => {
      mockReq.body = {
        programId: 1,
        programDetailId: "invalid",
        notes: "Rejection notes"
      };

      await ProgramApprovalController.rejectProgram(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: ERROR_MESSAGES.REQUIRED.PROGRAM_DETAIL_ID
      });
    });

    it("should handle service error", async () => {
      mockReq.body = {
        programId: 1,
        notes: "Rejection notes"
      };

      jest
        .spyOn(ProgramApprovalService, "rejectProgram")
        .mockRejectedValue(new Error("Service error"));

      await ProgramApprovalController.rejectProgram(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Service error"
      });
    });

    it("should handle API error with status code", async () => {
      mockReq.body = {
        programId: 1,
        notes: "Rejection notes"
      };

      const apiError = new Error("Program not found") as any;
      apiError.statusCode = 404;

      jest
        .spyOn(ProgramApprovalService, "rejectProgram")
        .mockRejectedValue(apiError);

      await ProgramApprovalController.rejectProgram(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Program not found"
      });
    });
  });
});

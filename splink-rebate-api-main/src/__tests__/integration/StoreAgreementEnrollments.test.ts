/**
 * Integration Tests for GET /store/:storeId/agreements
 */

import { Request, Response } from "express";
import StoreController from "../../controllers/StoreController";
import ProgramAgreementService from "../../services/ProgramAgreementService";
import { createMockRequestResponse } from "../helpers/test-utils";

// Mock the logger to prevent console output during tests
jest.mock("../../lib/logger", () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

describe("Store Agreement Enrollments Integration Tests", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    jest.resetAllMocks();
    const { req, res } = createMockRequestResponse();
    mockReq = req as Partial<Request>;
    mockRes = res as Partial<Response>;
  });

  describe("GET /store/:storeId/agreements", () => {
    it("should return 200 with enrollment and available agreement data", async () => {
      mockReq.params = { storeId: "1072" };
      mockReq.query = {};

      const mockServiceResult = {
        enrollments: [
          {
            agreementId: 1,
            agreementName: "Q1 2024 Rebate Agreement",
            programIds: [114],
            endDate: "2024-12-31",
            manufacturerId: 5
          }
        ],
        count: 1,
        availableAgreements: [],
        availableCount: 0,
        storeId: 1072
      };

      jest
        .spyOn(ProgramAgreementService, "getStoreAgreementEnrollments")
        .mockResolvedValue(mockServiceResult);

      await StoreController.getStoreAgreementEnrollments(
        mockReq as Request,
        mockRes as Response
      );

      expect(
        ProgramAgreementService.getStoreAgreementEnrollments
      ).toHaveBeenCalledWith(
        {
          storeId: 1072,
          manufacturerIds: undefined
        },
        {
          role: undefined,
          parentEntityId: undefined,
          associatedUserId: undefined
        }
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockServiceResult
      });
    });

    it("should filter by manufacturerId and return available agreements", async () => {
      mockReq.params = { storeId: "1072" };
      mockReq.query = { manufacturerId: "15" };

      const mockServiceResult = {
        enrollments: [
          {
            agreementId: 2,
            agreementName: "Filtered Agreement",
            programIds: [120],
            endDate: "2024-06-30",
            manufacturerId: 15
          }
        ],
        count: 1,
        availableAgreements: [
          {
            agreementId: 3,
            agreementName: "Available Agreement",
            programIds: [121],
            endDate: "2024-12-31",
            manufacturerId: 15
          }
        ],
        availableCount: 1,
        storeId: 1072,
        manufacturerIds: [15]
      };

      jest
        .spyOn(ProgramAgreementService, "getStoreAgreementEnrollments")
        .mockResolvedValue(mockServiceResult);

      await StoreController.getStoreAgreementEnrollments(
        mockReq as Request,
        mockRes as Response
      );

      expect(
        ProgramAgreementService.getStoreAgreementEnrollments
      ).toHaveBeenCalledWith(
        {
          storeId: 1072,
          manufacturerIds: [15]
        },
        {
          role: undefined,
          parentEntityId: undefined,
          associatedUserId: undefined
        }
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockServiceResult
      });
      expect(mockServiceResult.availableAgreements).toHaveLength(1);
      expect(mockServiceResult.availableCount).toBe(1);
    });

    it("should return 400 for invalid storeId", async () => {
      mockReq.params = { storeId: "invalid" };
      mockReq.query = {};

      await StoreController.getStoreAgreementEnrollments(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Invalid storeId format. Must be a positive integer."
      });
    });

    it("should return 400 for negative storeId", async () => {
      mockReq.params = { storeId: "-1" };
      mockReq.query = {};

      await StoreController.getStoreAgreementEnrollments(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Invalid storeId format. Must be a positive integer."
      });
    });

    it("should return 400 for invalid manufacturerId", async () => {
      mockReq.params = { storeId: "1072" };
      mockReq.query = { manufacturerId: "invalid" };

      await StoreController.getStoreAgreementEnrollments(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: 'Invalid manufacturerId format: "invalid". Must be positive integer(s).'
      });
    });

    it("should return 400 for negative manufacturerId", async () => {
      mockReq.params = { storeId: "1072" };
      mockReq.query = { manufacturerId: "-1" };

      await StoreController.getStoreAgreementEnrollments(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: 'Invalid manufacturerId format: "-1". Must be positive integer(s).'
      });
    });

    it("should handle service errors gracefully", async () => {
      mockReq.params = { storeId: "1072" };
      mockReq.query = {};

      jest
        .spyOn(ProgramAgreementService, "getStoreAgreementEnrollments")
        .mockRejectedValue(new Error("Database connection failed"));

      await StoreController.getStoreAgreementEnrollments(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Database connection failed"
      });
    });

    it("should return empty enrollments and available agreements when no matches found", async () => {
      mockReq.params = { storeId: "9999" };
      mockReq.query = {};

      const mockServiceResult = {
        enrollments: [],
        count: 0,
        availableAgreements: [],
        availableCount: 0,
        storeId: 9999
      };

      jest
        .spyOn(ProgramAgreementService, "getStoreAgreementEnrollments")
        .mockResolvedValue(mockServiceResult);

      await StoreController.getStoreAgreementEnrollments(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockServiceResult
      });
      expect(mockServiceResult.availableAgreements).toEqual([]);
      expect(mockServiceResult.availableCount).toBe(0);
    });
  });
});

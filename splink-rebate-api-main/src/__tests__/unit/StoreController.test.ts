/**
 * StoreController.getStoreAgreementEnrollments Unit Tests
 *
 * Tests controller logic in isolation
 */

import StoreController from "../../controllers/StoreController";
import ProgramAgreementService from "../../services/ProgramAgreementService";

jest.mock("../../services/ProgramAgreementService");
jest.mock("../../lib/logger");

describe("StoreController", () => {
  let mockRequest: any;
  let mockResponse: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      params: {},
      query: {},
      user: { id: 1, role: "DISTRIBUTOR_ADMIN" }
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe("getStoreAgreementEnrollments", () => {
    it("should return enrollments for valid storeId", async () => {
      // Arrange
      mockRequest.params.storeId = "1072";
      const mockServiceResult = {
        enrollments: [
          {
            agreementId: 1,
            agreementName: "Q1 Agreement",
            programId: 114,
            endDate: "2024-12-31"
          }
        ],
        count: 1,
        storeId: 1072
      };

      (
        ProgramAgreementService.getStoreAgreementEnrollments as jest.Mock
      ).mockResolvedValue(mockServiceResult);

      // Act
      await StoreController.getStoreAgreementEnrollments(
        mockRequest,
        mockResponse
      );

      // Assert
      expect(
        ProgramAgreementService.getStoreAgreementEnrollments
      ).toHaveBeenCalledWith(
        {
          storeId: 1072,
          manufacturerIds: undefined
        },
        {
          role: "DISTRIBUTOR_ADMIN",
          parentEntityId: undefined,
          associatedUserId: undefined
        }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: "success",
        data: mockServiceResult
      });
    });

    it("should filter by manufacturerId when provided", async () => {
      // Arrange
      mockRequest.params.storeId = "1072";
      mockRequest.query.manufacturerId = "15";
      const mockServiceResult = {
        enrollments: [],
        count: 0,
        storeId: 1072,
        manufacturerId: 15
      };

      (
        ProgramAgreementService.getStoreAgreementEnrollments as jest.Mock
      ).mockResolvedValue(mockServiceResult);

      // Act
      await StoreController.getStoreAgreementEnrollments(
        mockRequest,
        mockResponse
      );

      // Assert
      expect(
        ProgramAgreementService.getStoreAgreementEnrollments
      ).toHaveBeenCalledWith(
        {
          storeId: 1072,
          manufacturerIds: [15]
        },
        {
          role: "DISTRIBUTOR_ADMIN",
          parentEntityId: undefined,
          associatedUserId: undefined
        }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it("should reject invalid storeId", async () => {
      // Arrange
      mockRequest.params.storeId = "invalid";

      // Act
      await StoreController.getStoreAgreementEnrollments(
        mockRequest,
        mockResponse
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "error",
          data: expect.stringContaining("Invalid storeId format")
        })
      );
    });

    it("should reject negative storeId", async () => {
      // Arrange
      mockRequest.params.storeId = "-1";

      // Act
      await StoreController.getStoreAgreementEnrollments(
        mockRequest,
        mockResponse
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "error",
          data: expect.stringContaining("Invalid storeId format")
        })
      );
    });

    it("should reject zero storeId", async () => {
      // Arrange
      mockRequest.params.storeId = "0";

      // Act
      await StoreController.getStoreAgreementEnrollments(
        mockRequest,
        mockResponse
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "error",
          data: expect.stringContaining("Invalid storeId format")
        })
      );
    });

    it("should reject invalid manufacturerId", async () => {
      // Arrange
      mockRequest.params.storeId = "1072";
      mockRequest.query.manufacturerId = "invalid";

      // Act
      await StoreController.getStoreAgreementEnrollments(
        mockRequest,
        mockResponse
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "error",
          data: expect.stringContaining("Invalid manufacturerId format")
        })
      );
    });

    it("should reject negative manufacturerId", async () => {
      // Arrange
      mockRequest.params.storeId = "1072";
      mockRequest.query.manufacturerId = "-1";

      // Act
      await StoreController.getStoreAgreementEnrollments(
        mockRequest,
        mockResponse
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "error",
          data: expect.stringContaining("Invalid manufacturerId format")
        })
      );
    });

    it("should reject zero manufacturerId", async () => {
      // Arrange
      mockRequest.params.storeId = "1072";
      mockRequest.query.manufacturerId = "0";

      // Act
      await StoreController.getStoreAgreementEnrollments(
        mockRequest,
        mockResponse
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "error",
          data: expect.stringContaining("Invalid manufacturerId format")
        })
      );
    });

    it("should handle service errors gracefully", async () => {
      // Arrange
      mockRequest.params.storeId = "1072";

      (
        ProgramAgreementService.getStoreAgreementEnrollments as jest.Mock
      ).mockRejectedValue(new Error("Database connection failed"));

      // Act
      await StoreController.getStoreAgreementEnrollments(
        mockRequest,
        mockResponse
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });
});

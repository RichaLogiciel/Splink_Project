/**
 * AgreementController Unit Tests
 *
 * Tests controller logic in isolation
 */

import AgreementController from "../../controllers/AgreementController";
import ProgramAgreementService from "../../services/ProgramAgreementService";

jest.mock("../../services/ProgramAgreementService");
jest.mock("../../lib/logger");

describe("AgreementController", () => {
  let mockRequest: any;
  let mockResponse: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      query: {},
      user: { id: 1, role: "MANUFACTURER" }
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe("getAgreementsByManufacturer", () => {
    it("should call service with parsed manufacturer IDs", async () => {
      // Arrange
      mockRequest.query.manufacturerId = "1,2,3";
      const mockServiceResult = {
        agreements: [],
        count: 0
      };

      (
        ProgramAgreementService.getByManufacturerIds as jest.Mock
      ).mockResolvedValue(mockServiceResult);

      // Act
      await AgreementController.getAgreementsByManufacturer(
        mockRequest,
        mockResponse
      );

      // Assert
      expect(ProgramAgreementService.getByManufacturerIds).toHaveBeenCalledWith(
        [1, 2, 3],
        {
          role: "MANUFACTURER",
          parentEntityId: undefined,
          associatedUserId: undefined
        },
        "Current" // Default timeline
      );
    });

    it("should return 200 with service result", async () => {
      // Arrange
      mockRequest.query.manufacturerId = "1";
      const mockServiceResult = {
        agreements: [
          {
            agreementId: 1,
            agreementName: "Test Agreement",
            programId: 10
          }
        ],
        count: 1
      };

      (
        ProgramAgreementService.getByManufacturerIds as jest.Mock
      ).mockResolvedValue(mockServiceResult);

      // Act
      await AgreementController.getAgreementsByManufacturer(
        mockRequest,
        mockResponse
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: "success",
        data: mockServiceResult
      });
    });

    it("should handle service errors gracefully", async () => {
      // Arrange
      mockRequest.query.manufacturerId = "1";

      (
        ProgramAgreementService.getByManufacturerIds as jest.Mock
      ).mockRejectedValue(new Error("Database connection failed"));

      // Act
      await AgreementController.getAgreementsByManufacturer(
        mockRequest,
        mockResponse
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

    it("should reject negative manufacturer IDs", async () => {
      // Arrange
      mockRequest.query.manufacturerId = "-1";

      // Act
      await AgreementController.getAgreementsByManufacturer(
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

    it("should reject zero manufacturer IDs", async () => {
      // Arrange
      mockRequest.query.manufacturerId = "0";

      // Act
      await AgreementController.getAgreementsByManufacturer(
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

    it("should reject missing manufacturerId parameter", async () => {
      // Arrange
      mockRequest.query = {};

      // Act
      await AgreementController.getAgreementsByManufacturer(
        mockRequest,
        mockResponse
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "error",
          data: "manufacturerId is required"
        })
      );
    });

    it("should reject non-numeric manufacturerId", async () => {
      // Arrange
      mockRequest.query.manufacturerId = "abc";

      // Act
      await AgreementController.getAgreementsByManufacturer(
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

    it("should handle whitespace in comma-separated IDs", async () => {
      // Arrange
      mockRequest.query.manufacturerId = " 1 , 2 , 3 ";
      const mockServiceResult = {
        agreements: [],
        count: 0
      };

      (
        ProgramAgreementService.getByManufacturerIds as jest.Mock
      ).mockResolvedValue(mockServiceResult);

      // Act
      await AgreementController.getAgreementsByManufacturer(
        mockRequest,
        mockResponse
      );

      // Assert
      expect(ProgramAgreementService.getByManufacturerIds).toHaveBeenCalledWith(
        [1, 2, 3],
        {
          role: "MANUFACTURER",
          parentEntityId: undefined,
          associatedUserId: undefined
        },
        "Current" // Default timeline
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it("should reject empty string manufacturerId", async () => {
      // Arrange
      mockRequest.query.manufacturerId = "";

      // Act
      await AgreementController.getAgreementsByManufacturer(
        mockRequest,
        mockResponse
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "error",
          data: "manufacturerId is required"
        })
      );
    });
  });
});

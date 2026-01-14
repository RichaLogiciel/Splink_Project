/**
 * ProgramAgreementService Tests
 *
 * Tests for program agreement retrieval and enrollment operations
 */

import ProgramAgreementService from "../../services/ProgramAgreementService";
import ProgramAgreement from "../../models/ProgramAgreement";
import Program from "../../models/Program";
import { Op, QueryTypes } from "sequelize";
import { redisClient, getCacheKey } from "../../utils/redis";
import * as appConstants from "../../config/appConstants";
import sequelize from "../../db";
import * as rolesUtils from "../../utils/roles";

// Mock dependencies
jest.mock("../../models/ProgramAgreement");
jest.mock("../../utils/redis");
jest.mock("../../lib/logger");
jest.mock("../../db");
jest.mock("../../utils/roles");
jest.mock("../../config/appConstants", () => ({
  ...jest.requireActual("../../config/appConstants"),
  useApiCaching: true
}));

describe("ProgramAgreementService", () => {
  describe("getByManufacturerIds", () => {
    beforeEach(() => {
      jest.clearAllMocks();
      // Reset all mock implementations to ensure clean state
      (ProgramAgreement.findAll as jest.Mock).mockReset();
      (redisClient.get as jest.Mock).mockReset();
      (redisClient.setEx as jest.Mock).mockReset();
      (getCacheKey as jest.Mock).mockReset();
    });

    it("should return agreements for a single manufacturer ID", async () => {
      // Arrange
      const manufacturerIds = [1];
      const mockAgreements = [
        {
          id: 1,
          agreementName: "Agreement 1",
          programId: 10,
          manufacturerId: 1
        },
        {
          id: 2,
          agreementName: "Agreement 2",
          programId: 11,
          manufacturerId: 1
        }
      ];

      (ProgramAgreement.findAll as jest.Mock).mockResolvedValue(mockAgreements);
      (redisClient.get as jest.Mock).mockResolvedValue(null);
      (redisClient.setEx as jest.Mock).mockResolvedValue("OK");

      // Act
      const result =
        await ProgramAgreementService.getByManufacturerIds(manufacturerIds);

      // Assert
      expect(result.agreements).toHaveLength(2);
      expect(result.count).toBe(2);
      expect(result.agreements[0]).toEqual({
        agreementId: 1,
        agreementName: "Agreement 1",
        programId: 10,
        manufacturerId: 1
      });
      expect(ProgramAgreement.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            manufacturerId: { [Op.in]: [1] },
            deletedAt: null
          },
          attributes: [
            "id",
            "agreementId",
            "agreementName",
            "programId",
            "manufacturerId"
          ]
        })
      );
    });

    it("should return agreements for multiple manufacturer IDs", async () => {
      // Arrange
      const manufacturerIds = [1, 2, 3];
      const mockAgreements = [
        {
          id: 1,
          agreementName: "Agreement 1",
          programId: 10,
          manufacturerId: 1
        },
        {
          id: 2,
          agreementName: "Agreement 2",
          programId: 20,
          manufacturerId: 2
        },
        {
          id: 3,
          agreementName: "Agreement 3",
          programId: 30,
          manufacturerId: 3
        }
      ];

      (ProgramAgreement.findAll as jest.Mock).mockResolvedValue(mockAgreements);
      (redisClient.get as jest.Mock).mockResolvedValue(null);
      (redisClient.setEx as jest.Mock).mockResolvedValue("OK");

      // Act
      const result =
        await ProgramAgreementService.getByManufacturerIds(manufacturerIds);

      // Assert
      expect(result.agreements).toHaveLength(3);
      expect(result.count).toBe(3);
      expect(ProgramAgreement.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            manufacturerId: { [Op.in]: [1, 2, 3] },
            deletedAt: null
          },
          attributes: [
            "id",
            "agreementId",
            "agreementName",
            "programId",
            "manufacturerId"
          ]
        })
      );
    });

    it.skip("should return cached data when available", async () => {
      // Arrange
      const manufacturerIds = [1];
      const cachedData = {
        agreements: [
          {
            agreementId: 1,
            agreementName: "Cached Agreement",
            programId: 10,
            manufacturerId: 1
          }
        ],
        count: 1
      };

      // Reset mocks to ensure clean state - use mockReset to clear implementation
      (ProgramAgreement.findAll as jest.Mock).mockReset();
      (redisClient.get as jest.Mock).mockReset();
      (redisClient.setEx as jest.Mock).mockReset();

      // Set up fresh mock implementation for this test
      (redisClient.get as jest.Mock).mockResolvedValue(
        JSON.stringify(cachedData)
      );
      (getCacheKey as jest.Mock).mockReturnValue("test-cache-key");

      // Act
      const result =
        await ProgramAgreementService.getByManufacturerIds(manufacturerIds);

      // Assert
      expect(result).toEqual(cachedData);
      expect(ProgramAgreement.findAll).not.toHaveBeenCalled();
      expect(redisClient.get).toHaveBeenCalled();
    });

    it("should return empty array when no agreements found", async () => {
      // Arrange
      const manufacturerIds = [999];

      (ProgramAgreement.findAll as jest.Mock).mockResolvedValue([]);
      (redisClient.get as jest.Mock).mockResolvedValue(null);
      (redisClient.setEx as jest.Mock).mockResolvedValue("OK");

      // Act
      const result =
        await ProgramAgreementService.getByManufacturerIds(manufacturerIds);

      // Assert
      expect(result.agreements).toEqual([]);
      expect(result.count).toBe(0);
    });

    it.skip("should sort manufacturer IDs for consistent cache keys", async () => {
      // Arrange
      const manufacturerIds = [3, 1, 2];
      const mockAgreements: any[] = [];

      (ProgramAgreement.findAll as jest.Mock).mockResolvedValue(mockAgreements);
      (redisClient.get as jest.Mock).mockResolvedValue(null);
      (redisClient.setEx as jest.Mock).mockResolvedValue("OK");
      (getCacheKey as jest.Mock).mockReturnValue("cache:key");

      // Act
      await ProgramAgreementService.getByManufacturerIds(manufacturerIds);

      // Assert
      expect(getCacheKey).toHaveBeenCalledWith(
        "agreements",
        "manufacturer",
        "1,2,3"
      );
    });

    it("should exclude soft-deleted agreements", async () => {
      // Arrange
      const manufacturerIds = [1];
      const mockAgreements = [
        {
          id: 1,
          agreementName: "Active Agreement",
          programId: 10,
          manufacturerId: 1
        }
      ];

      (ProgramAgreement.findAll as jest.Mock).mockResolvedValue(mockAgreements);
      (redisClient.get as jest.Mock).mockResolvedValue(null);
      (redisClient.setEx as jest.Mock).mockResolvedValue("OK");

      // Act
      await ProgramAgreementService.getByManufacturerIds(manufacturerIds);

      // Assert
      expect(ProgramAgreement.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            manufacturerId: { [Op.in]: [1] },
            deletedAt: null
          }
        })
      );
    });

    // Tests for approval filtering functionality
    describe("with user context and approval filtering", () => {
      beforeEach(() => {
        jest.clearAllMocks();
        (ProgramAgreement.findAll as jest.Mock).mockReset();
        (redisClient.get as jest.Mock).mockReset();
        (redisClient.setEx as jest.Mock).mockReset();
        (rolesUtils.getParentDistributorId as jest.Mock).mockReset();
      });

      it("should apply approval filtering for sales rep user", async () => {
        // Arrange
        const manufacturerIds = [1];
        const user = {
          role: "DISTRIBUTOR_SALES_REP",
          parentEntityId: 100,
          associatedUserId: 200
        };
        const mockAgreements = [
          {
            id: 1,
            agreementId: 1,
            agreementName: "Approved Agreement",
            programId: 10,
            manufacturerId: 1
          }
        ];

        (rolesUtils.getParentDistributorId as jest.Mock).mockReturnValue(100);
        (ProgramAgreement.findAll as jest.Mock).mockResolvedValue(
          mockAgreements
        );
        (redisClient.get as jest.Mock).mockResolvedValue(null);
        (redisClient.setEx as jest.Mock).mockResolvedValue("OK");

        // Act
        const result = await ProgramAgreementService.getByManufacturerIds(
          manufacturerIds,
          user
        );

        // Assert
        expect(rolesUtils.getParentDistributorId).toHaveBeenCalledWith(
          user,
          user.role
        );
        expect(ProgramAgreement.findAll).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              manufacturerId: { [Op.in]: [1] },
              deletedAt: null
            },
            include: expect.arrayContaining([
              expect.objectContaining({
                as: "program",
                required: true,
                attributes: [],
                include: expect.arrayContaining([
                  expect.objectContaining({
                    as: "ProgramApproval",
                    required: true,
                    attributes: [],
                    where: expect.objectContaining({
                      approver_type: "DISTRIBUTOR",
                      approver_id: 100,
                      status: "APPROVED",
                      deleted_at: null
                    })
                  })
                ])
              })
            ])
          })
        );
        expect(result.agreements).toHaveLength(1);
        expect(result.count).toBe(1);
      });

      it("should apply approval filtering for sales rep manager", async () => {
        // Arrange
        const manufacturerIds = [1, 2];
        const user = {
          role: "DISTRIBUTOR_SALES_MANAGER",
          parentEntityId: 150,
          associatedUserId: 250
        };
        const mockAgreements = [
          {
            id: 1,
            agreementId: 1,
            agreementName: "Agreement 1",
            programId: 10,
            manufacturerId: 1
          },
          {
            id: 2,
            agreementId: 2,
            agreementName: "Agreement 2",
            programId: 20,
            manufacturerId: 2
          }
        ];

        (rolesUtils.getParentDistributorId as jest.Mock).mockReturnValue(150);
        (ProgramAgreement.findAll as jest.Mock).mockResolvedValue(
          mockAgreements
        );
        (redisClient.get as jest.Mock).mockResolvedValue(null);
        (redisClient.setEx as jest.Mock).mockResolvedValue("OK");

        // Act
        const result = await ProgramAgreementService.getByManufacturerIds(
          manufacturerIds,
          user
        );

        // Assert
        expect(rolesUtils.getParentDistributorId).toHaveBeenCalledWith(
          user,
          user.role
        );
        expect(ProgramAgreement.findAll).toHaveBeenCalledWith(
          expect.objectContaining({
            include: expect.arrayContaining([
              expect.objectContaining({
                include: expect.arrayContaining([
                  expect.objectContaining({
                    where: expect.objectContaining({
                      approver_id: 150
                    })
                  })
                ])
              })
            ])
          })
        );
        expect(result.agreements).toHaveLength(2);
      });

      it("should apply approval filtering for distributor admin using associatedUserId", async () => {
        // Arrange
        const manufacturerIds = [1];
        const user = {
          role: "DISTRIBUTOR_ADMIN",
          parentEntityId: 0,
          associatedUserId: 300
        };
        const mockAgreements = [
          {
            id: 1,
            agreementId: 1,
            agreementName: "Admin Agreement",
            programId: 10,
            manufacturerId: 1
          }
        ];

        // For DISTRIBUTOR_ADMIN, getParentDistributorId returns associatedUserId
        (rolesUtils.getParentDistributorId as jest.Mock).mockReturnValue(300);
        (ProgramAgreement.findAll as jest.Mock).mockResolvedValue(
          mockAgreements
        );
        (redisClient.get as jest.Mock).mockResolvedValue(null);
        (redisClient.setEx as jest.Mock).mockResolvedValue("OK");

        // Act
        const result = await ProgramAgreementService.getByManufacturerIds(
          manufacturerIds,
          user
        );

        // Assert
        expect(rolesUtils.getParentDistributorId).toHaveBeenCalledWith(
          user,
          user.role
        );
        expect(ProgramAgreement.findAll).toHaveBeenCalledWith(
          expect.objectContaining({
            include: expect.arrayContaining([
              expect.objectContaining({
                include: expect.arrayContaining([
                  expect.objectContaining({
                    where: expect.objectContaining({
                      approver_id: 300
                    })
                  })
                ])
              })
            ])
          })
        );
        expect(result.agreements).toHaveLength(1);
      });

      it("should return empty array when user has no approved programs", async () => {
        // Arrange
        const manufacturerIds = [1];
        const user = {
          role: "DISTRIBUTOR_SALES_REP",
          parentEntityId: 100,
          associatedUserId: 200
        };

        (rolesUtils.getParentDistributorId as jest.Mock).mockReturnValue(100);
        (ProgramAgreement.findAll as jest.Mock).mockResolvedValue([]);
        (redisClient.get as jest.Mock).mockResolvedValue(null);
        (redisClient.setEx as jest.Mock).mockResolvedValue("OK");

        // Act
        const result = await ProgramAgreementService.getByManufacturerIds(
          manufacturerIds,
          user
        );

        // Assert
        expect(result.agreements).toEqual([]);
        expect(result.count).toBe(0);
      });

      it("should not apply filtering when distributorId cannot be determined", async () => {
        // Arrange
        const manufacturerIds = [1];
        const user = {
          role: "INVALID_ROLE",
          parentEntityId: 100,
          associatedUserId: 200
        };
        const mockAgreements = [
          {
            id: 1,
            agreementId: 1,
            agreementName: "Agreement 1",
            programId: 10,
            manufacturerId: 1
          }
        ];

        (rolesUtils.getParentDistributorId as jest.Mock).mockReturnValue(0);
        (ProgramAgreement.findAll as jest.Mock).mockResolvedValue(
          mockAgreements
        );
        (redisClient.get as jest.Mock).mockResolvedValue(null);
        (redisClient.setEx as jest.Mock).mockResolvedValue("OK");

        // Act
        const result = await ProgramAgreementService.getByManufacturerIds(
          manufacturerIds,
          user
        );

        // Assert
        expect(ProgramAgreement.findAll).toHaveBeenCalledWith(
          expect.objectContaining({
            include: expect.arrayContaining([
              expect.objectContaining({
                model: Program,
                as: "program",
                required: true,
                where: expect.objectContaining({}) // Timeline filter applied (defaults to Current)
              })
            ]) // Program include for timeline filtering, but no approval filtering when distributorId is 0
          })
        );
        expect(result.agreements).toHaveLength(1);
      });

      it("should maintain backwards compatibility when user is undefined", async () => {
        // Arrange
        const manufacturerIds = [1];
        const mockAgreements = [
          {
            id: 1,
            agreementId: 1,
            agreementName: "Agreement 1",
            programId: 10,
            manufacturerId: 1
          }
        ];

        (ProgramAgreement.findAll as jest.Mock).mockResolvedValue(
          mockAgreements
        );
        (redisClient.get as jest.Mock).mockResolvedValue(null);
        (redisClient.setEx as jest.Mock).mockResolvedValue("OK");

        // Act
        const result =
          await ProgramAgreementService.getByManufacturerIds(manufacturerIds);

        // Assert
        expect(rolesUtils.getParentDistributorId).not.toHaveBeenCalled();
        expect(ProgramAgreement.findAll).toHaveBeenCalledWith(
          expect.objectContaining({
            include: expect.arrayContaining([
              expect.objectContaining({
                model: Program,
                as: "program",
                required: true,
                where: expect.objectContaining({}) // Timeline filter applied (defaults to Current)
              })
            ]) // Program include for timeline filtering when user is not provided
          })
        );
        expect(result.agreements).toHaveLength(1);
      });
    });
  });

  describe("getStoreAgreementEnrollments", () => {
    beforeEach(() => {
      jest.clearAllMocks();
      // Mock sequelize.query
      sequelize.query = jest.fn();
      (rolesUtils.getParentDistributorId as jest.Mock).mockReset();
    });

    it("should filter both enrollments and available agreements with user context", async () => {
      // Arrange
      const params = {
        storeId: 1072,
        manufacturerIds: [1, 2]
      };
      const user = {
        role: "DISTRIBUTOR_SALES_REP",
        parentEntityId: 100,
        associatedUserId: 200
      };

      const mockEnrollments = [
        {
          agreementId: 1,
          agreementName: "Agreement 1",
          programId: 10,
          manufacturerId: 1,
          endDate: "2025-12-31"
        }
      ];

      const mockAvailable = [
        {
          agreementId: 2,
          agreementName: "Agreement 2",
          programId: 20,
          manufacturerId: 2,
          endDate: "2025-12-31"
        }
      ];

      (rolesUtils.getParentDistributorId as jest.Mock).mockReturnValue(100);
      (sequelize.query as jest.Mock)
        .mockResolvedValueOnce(mockEnrollments) // First call: enrollments query
        .mockResolvedValueOnce(mockAvailable); // Second call: available query

      // Act
      const result = await ProgramAgreementService.getStoreAgreementEnrollments(
        params,
        user
      );

      // Assert
      expect(rolesUtils.getParentDistributorId).toHaveBeenCalledWith(
        user,
        user.role
      );

      // Verify enrollments query includes approval JOIN
      expect(sequelize.query).toHaveBeenCalledWith(
        expect.stringContaining("JOIN program_approvals papp"),
        expect.objectContaining({
          type: QueryTypes.SELECT,
          replacements: expect.objectContaining({
            storeId: 1072,
            manufacturerIds: [1, 2],
            distributorId: 100
          })
        })
      );

      // Verify available agreements query includes approval JOIN
      expect(sequelize.query).toHaveBeenCalledWith(
        expect.stringContaining("JOIN program_approvals papp"),
        expect.objectContaining({
          type: QueryTypes.SELECT,
          replacements: expect.objectContaining({
            storeId: 1072,
            manufacturerIds: [1, 2],
            distributorId: 100
          })
        })
      );

      expect(result.enrollments).toHaveLength(1);
      expect(result.availableAgreements).toHaveLength(1);
    });

    it("should not apply filtering when user context is not provided", async () => {
      // Arrange
      const params = {
        storeId: 1072,
        manufacturerIds: [1]
      };

      const mockEnrollments = [
        {
          agreementId: 1,
          agreementName: "Agreement 1",
          programId: 10,
          manufacturerId: 1,
          endDate: "2025-12-31"
        }
      ];

      (sequelize.query as jest.Mock)
        .mockResolvedValueOnce(mockEnrollments)
        .mockResolvedValueOnce([]);

      // Act
      const result =
        await ProgramAgreementService.getStoreAgreementEnrollments(params);

      // Assert
      expect(rolesUtils.getParentDistributorId).not.toHaveBeenCalled();

      // Verify query does NOT include approval JOIN
      expect(sequelize.query).toHaveBeenCalledWith(
        expect.not.stringContaining("JOIN program_approvals papp"),
        expect.objectContaining({
          type: QueryTypes.SELECT,
          replacements: expect.not.objectContaining({
            distributorId: expect.anything()
          })
        })
      );
    });

    it("should return empty results when user has no approvals", async () => {
      // Arrange
      const params = {
        storeId: 1072,
        manufacturerIds: [1]
      };
      const user = {
        role: "DISTRIBUTOR_SALES_REP",
        parentEntityId: 100,
        associatedUserId: 200
      };

      (rolesUtils.getParentDistributorId as jest.Mock).mockReturnValue(100);
      (sequelize.query as jest.Mock)
        .mockResolvedValueOnce([]) // No enrollments
        .mockResolvedValueOnce([]); // No available agreements

      // Act
      const result = await ProgramAgreementService.getStoreAgreementEnrollments(
        params,
        user
      );

      // Assert
      expect(result.enrollments).toEqual([]);
      expect(result.availableAgreements).toEqual([]);
      expect(result.count).toBe(0);
      expect(result.availableCount).toBe(0);
    });

    it("should aggregate multiple programs under same agreement with approval filtering", async () => {
      // Arrange
      const params = {
        storeId: 1072,
        manufacturerIds: [1]
      };
      const user = {
        role: "DISTRIBUTOR_SALES_REP",
        parentEntityId: 100,
        associatedUserId: 200
      };

      // Agreement 1 has 2 approved programs
      const mockEnrollments = [
        {
          agreementId: 1,
          agreementName: "Multi-Program Agreement",
          programId: 10,
          manufacturerId: 1,
          endDate: "2025-12-31"
        },
        {
          agreementId: 1,
          agreementName: "Multi-Program Agreement",
          programId: 11,
          manufacturerId: 1,
          endDate: "2025-12-31"
        }
      ];

      (rolesUtils.getParentDistributorId as jest.Mock).mockReturnValue(100);
      (sequelize.query as jest.Mock)
        .mockResolvedValueOnce(mockEnrollments)
        .mockResolvedValueOnce([]);

      // Act
      const result = await ProgramAgreementService.getStoreAgreementEnrollments(
        params,
        user
      );

      // Assert
      expect(result.enrollments).toHaveLength(1);
      expect(result.enrollments[0].programIds).toEqual([10, 11]);
      expect(result.enrollments[0].agreementId).toBe(1);
    });

    it("should handle distributor admin role using associatedUserId", async () => {
      // Arrange
      const params = {
        storeId: 1072,
        manufacturerIds: [1]
      };
      const user = {
        role: "DISTRIBUTOR_ADMIN",
        parentEntityId: 0,
        associatedUserId: 300
      };

      const mockEnrollments = [
        {
          agreementId: 1,
          agreementName: "Agreement 1",
          programId: 10,
          manufacturerId: 1,
          endDate: "2025-12-31"
        }
      ];

      (rolesUtils.getParentDistributorId as jest.Mock).mockReturnValue(300);
      (sequelize.query as jest.Mock)
        .mockResolvedValueOnce(mockEnrollments)
        .mockResolvedValueOnce([]);

      // Act
      const result = await ProgramAgreementService.getStoreAgreementEnrollments(
        params,
        user
      );

      // Assert
      expect(sequelize.query).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          replacements: expect.objectContaining({
            distributorId: 300
          })
        })
      );
      expect(result.enrollments).toHaveLength(1);
    });

    it("should return empty available agreements when manufacturerIds not provided", async () => {
      // Arrange
      const params = {
        storeId: 1072
        // No manufacturerIds
      };
      const user = {
        role: "DISTRIBUTOR_SALES_REP",
        parentEntityId: 100,
        associatedUserId: 200
      };

      const mockEnrollments = [
        {
          agreementId: 1,
          agreementName: "Agreement 1",
          programId: 10,
          manufacturerId: 1,
          endDate: "2025-12-31"
        }
      ];

      (rolesUtils.getParentDistributorId as jest.Mock).mockReturnValue(100);
      (sequelize.query as jest.Mock).mockResolvedValueOnce(mockEnrollments);

      // Act
      const result = await ProgramAgreementService.getStoreAgreementEnrollments(
        params,
        user
      );

      // Assert
      expect(result.availableAgreements).toEqual([]);
      expect(result.availableCount).toBe(0);
      // Enrollments should still work
      expect(result.enrollments).toHaveLength(1);
    });
  });
});

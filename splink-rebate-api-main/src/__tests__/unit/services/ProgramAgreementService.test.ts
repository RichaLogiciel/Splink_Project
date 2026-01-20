import ProgramAgreementService from "../../../services/ProgramAgreementService";
import { ApiError } from "../../../lib/errors/APIError";
import ProgramAgreement from "../../../models/ProgramAgreement";
import Store from "../../../models/Store";
import { enqueueJob } from "../../../utils/sqsClient";

// Mock dependencies
jest.mock("../../../models/ProgramAgreement");
jest.mock("../../../models/Store");
jest.mock("../../../utils/sqsClient");
jest.mock("newrelic", () => ({
  startSegment: jest.fn((name, record, callback) => callback())
}));

describe("ProgramAgreementService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("enrollStoresByAgreement", () => {
    describe("validation", () => {
      it("should throw error when no agreements found", async () => {
        (ProgramAgreement.findAll as jest.Mock).mockResolvedValue([]);

        await expect(
          ProgramAgreementService.enrollStoresByAgreement({
            action: "enroll",
            agreementIds: [999],
            storeIds: [1, 2],
            userId: 123
          })
        ).rejects.toThrow(ApiError);

        await expect(
          ProgramAgreementService.enrollStoresByAgreement({
            action: "enroll",
            agreementIds: [999],
            storeIds: [1, 2],
            userId: 123
          })
        ).rejects.toThrow("No agreements found for IDs: 999");
      });

      it("should throw error when some agreement IDs are missing", async () => {
        (ProgramAgreement.findAll as jest.Mock).mockResolvedValue([
          { agreementId: 1, programId: 101 },
          { agreementId: 2, programId: 102 }
        ]);

        await expect(
          ProgramAgreementService.enrollStoresByAgreement({
            action: "enroll",
            agreementIds: [1, 2, 3],
            storeIds: [10, 20],
            userId: 123
          })
        ).rejects.toThrow(ApiError);

        await expect(
          ProgramAgreementService.enrollStoresByAgreement({
            action: "enroll",
            agreementIds: [1, 2, 3],
            storeIds: [10, 20],
            userId: 123
          })
        ).rejects.toThrow("Agreement IDs not found: 3");
      });

      it("should validate agreements correctly when they have programs", async () => {
        // Test that valid agreements with programs pass validation
        (ProgramAgreement.findAll as jest.Mock).mockResolvedValue([
          { agreementId: 1, programId: 101 },
          { agreementId: 2, programId: 102 }
        ]);

        (Store.count as jest.Mock).mockResolvedValue(2);
        (enqueueJob as jest.Mock).mockResolvedValue("job-id-test");

        const result = await ProgramAgreementService.enrollStoresByAgreement({
          action: "enroll",
          agreementIds: [1, 2],
          storeIds: [10, 20],
          userId: 123
        });

        // Should succeed with the programs found
        expect(result.success).toBe(true);
        expect(result.data.programCount).toBe(2);
      });

      it("should throw error when some stores not found", async () => {
        (ProgramAgreement.findAll as jest.Mock).mockResolvedValue([
          { agreementId: 1, programId: 101 },
          { agreementId: 2, programId: 102 }
        ]);

        // Mock Store.count to return fewer stores than requested
        (Store.count as jest.Mock).mockResolvedValue(2);

        await expect(
          ProgramAgreementService.enrollStoresByAgreement({
            action: "enroll",
            agreementIds: [1, 2],
            storeIds: [10, 20, 30],
            userId: 123
          })
        ).rejects.toThrow(ApiError);

        await expect(
          ProgramAgreementService.enrollStoresByAgreement({
            action: "enroll",
            agreementIds: [1, 2],
            storeIds: [10, 20, 30],
            userId: 123
          })
        ).rejects.toThrow("Some store IDs not found. Expected 3, found 2");
      });
    });

    describe("successful enrollment", () => {
      it("should successfully enqueue job for enrollment", async () => {
        (ProgramAgreement.findAll as jest.Mock).mockResolvedValue([
          { agreementId: 1, programId: 101 },
          { agreementId: 2, programId: 102 },
          { agreementId: 3, programId: 103 }
        ]);

        (Store.count as jest.Mock).mockResolvedValue(5);

        (enqueueJob as jest.Mock).mockResolvedValue("job-id-123");

        const result = await ProgramAgreementService.enrollStoresByAgreement({
          action: "enroll",
          agreementIds: [1, 2, 3],
          storeIds: [10, 20, 30, 40, 50],
          userId: 123,
          reason: "Testing enrollment"
        });

        expect(result.success).toBe(true);
        expect(result.message).toBe(
          "Enrollment job queued for 5 stores across 3 agreements"
        );
        expect(result.data.jobId).toBe("job-id-123");
        expect(result.data.agreementIds).toEqual([1, 2, 3]);
        expect(result.data.storeIds).toEqual([10, 20, 30, 40, 50]);
        expect(result.data.action).toBe("enroll");
        expect(result.data.programCount).toBe(3);
        expect(result.data.expectedEnrollments).toBe(15); // 5 stores * 3 programs

        expect(enqueueJob).toHaveBeenCalledWith({
          jobType: "AGREEMENT_STORE_ENROLLMENT_CHANGED",
          payload: expect.objectContaining({
            action: "enroll",
            agreementIds: [1, 2, 3],
            storeIds: [10, 20, 30, 40, 50],
            programIds: [101, 102, 103],
            userId: 123,
            reason: "Testing enrollment"
          }),
          messageGroupId: expect.stringMatching(
            /^agreement-enrollment-[a-f0-9]{32}$/
          )
        });
      });

      it("should successfully enqueue job for unenrollment", async () => {
        (ProgramAgreement.findAll as jest.Mock).mockResolvedValue([
          { agreementId: 5, programId: 201 },
          { agreementId: 6, programId: 202 }
        ]);

        (Store.count as jest.Mock).mockResolvedValue(3);

        (enqueueJob as jest.Mock).mockResolvedValue("job-id-456");

        const result = await ProgramAgreementService.enrollStoresByAgreement({
          action: "unenroll",
          agreementIds: [5, 6],
          storeIds: [100, 200, 300],
          userId: 456
        });

        expect(result.success).toBe(true);
        expect(result.data.action).toBe("unenroll");
        expect(result.data.programCount).toBe(2);
        expect(result.data.expectedEnrollments).toBe(6); // 3 stores * 2 programs

        expect(enqueueJob).toHaveBeenCalledWith({
          jobType: "AGREEMENT_STORE_ENROLLMENT_CHANGED",
          payload: expect.objectContaining({
            action: "unenroll",
            agreementIds: [5, 6],
            storeIds: [100, 200, 300],
            programIds: [201, 202],
            userId: 456,
            reason: "Agreement-based unenroll"
          }),
          messageGroupId: expect.stringMatching(
            /^agreement-enrollment-[a-f0-9]{32}$/
          )
        });
      });

      it("should handle duplicate program IDs in agreements", async () => {
        (ProgramAgreement.findAll as jest.Mock).mockResolvedValue([
          { agreementId: 1, programId: 101 },
          { agreementId: 2, programId: 101 }, // Same program ID
          { agreementId: 3, programId: 102 }
        ]);

        (Store.count as jest.Mock).mockResolvedValue(2);

        (enqueueJob as jest.Mock).mockResolvedValue("job-id-789");

        const result = await ProgramAgreementService.enrollStoresByAgreement({
          action: "enroll",
          agreementIds: [1, 2, 3],
          storeIds: [10, 20],
          userId: 123
        });

        expect(result.data.programCount).toBe(2); // Should deduplicate to 2 unique programs
        expect(result.data.expectedEnrollments).toBe(4); // 2 stores * 2 programs

        expect(enqueueJob).toHaveBeenCalledWith({
          jobType: "AGREEMENT_STORE_ENROLLMENT_CHANGED",
          payload: expect.objectContaining({
            programIds: [101, 102] // Deduplicated
          }),
          messageGroupId: expect.stringMatching(
            /^agreement-enrollment-[a-f0-9]{32}$/
          )
        });
      });
    });

    describe("error handling", () => {
      it("should throw error when enqueue fails", async () => {
        (ProgramAgreement.findAll as jest.Mock).mockResolvedValue([
          { agreementId: 1, programId: 101 }
        ]);

        (Store.count as jest.Mock).mockResolvedValue(1);

        (enqueueJob as jest.Mock).mockRejectedValue(
          new Error("SQS service unavailable")
        );

        await expect(
          ProgramAgreementService.enrollStoresByAgreement({
            action: "enroll",
            agreementIds: [1],
            storeIds: [10],
            userId: 123
          })
        ).rejects.toThrow(ApiError);

        await expect(
          ProgramAgreementService.enrollStoresByAgreement({
            action: "enroll",
            agreementIds: [1],
            storeIds: [10],
            userId: 123
          })
        ).rejects.toThrow("Failed to queue enrollment job");
      });
    });
  });
});

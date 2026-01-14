import { Router } from "express";
import EnrollmentRequestController from "../controllers/EnrollmentRequestController";
import StoreEnrollmentStatusController from "../controllers/StoreEnrollmentStatusController";
import { authenticate } from "../middleware/authentication";
import asyncHandler from "../middleware/asyncHandler";

const router = Router();

/**
 * @swagger
 * /api/v1/enrollment-requests/{requestId}:
 *   get:
 *     summary: Get enrollment request status
 *     description: Retrieve the status and lifecycle details of an enrollment request
 *     tags: [Enrollment Requests]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique identifier of the enrollment request
 *     responses:
 *       200:
 *         description: Enrollment request details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     requestId:
 *                       type: string
 *                     sqsMessageId:
 *                       type: string
 *                       nullable: true
 *                     action:
 *                       type: string
 *                       enum: [enroll, unenroll]
 *                     status:
 *                       type: string
 *                     agreementIds:
 *                       type: array
 *                       items:
 *                         type: integer
 *                     storeIds:
 *                       type: array
 *                       items:
 *                         type: integer
 *                     programIds:
 *                       type: array
 *                       items:
 *                         type: integer
 *                       nullable: true
 *                     userId:
 *                       type: integer
 *                     reason:
 *                       type: string
 *                       nullable: true
 *                     timestamps:
 *                       type: object
 *                     results:
 *                       type: object
 *                     error:
 *                       type: object
 *                       nullable: true
 *       403:
 *         description: User not authorized to view this request
 *       404:
 *         description: Enrollment request not found
 *       500:
 *         description: Internal server error
 */
router.get(
  "/:requestId",
  authenticate(),
  asyncHandler(EnrollmentRequestController.getEnrollmentRequestStatus)
);

/**
 * @swagger
 * /api/v1/enrollment-requests/{requestId}/store-statuses:
 *   get:
 *     summary: Get store enrollment statuses for a request
 *     description: Retrieve per-store, per-agreement enrollment statuses for a given enrollment request.
 *     tags: [Enrollment Requests]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique identifier of the enrollment request
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *         description: Optional limit (applies to some implementations)
 *     responses:
 *       200:
 *         description: Store enrollment statuses retrieved successfully
 *       403:
 *         description: User not authorized to view this request
 *       404:
 *         description: Enrollment request not found
 *       500:
 *         description: Internal server error
 */
router.get(
  "/:requestId/store-statuses",
  authenticate(),
  asyncHandler(StoreEnrollmentStatusController.getByRequestId)
);

export default router;

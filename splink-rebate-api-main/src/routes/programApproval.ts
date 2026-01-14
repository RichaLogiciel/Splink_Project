import { Router } from "express";
import ProgramApprovalController from "../controllers/ProgramApproval/ProgramApprovalController";
import asyncHandler from "../middleware/asyncHandler";

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Program Approval
 *     description: API endpoints related to program approvals by distributors.
 *
 * /program-approvals:
 *   get:
 *     summary: Get all programs pending approval for a distributor
 *     tags: [Program Approval]
 *     description: Retrieves a paginated list of programs that are pending approval by the distributor.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: A paginated list of programs pending approval.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     programs:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           manufacturerId:
 *                             type: integer
 *                           name:
 *                             type: string
 *                           externalProgramId:
 *                             type: string
 *                             nullable: true
 *                           participantType:
 *                             type: string
 *                           programHeader:
 *                             type: string
 *                           programType:
 *                             type: string
 *                           paymentTerm:
 *                             type: string
 *                           startDate:
 *                             type: string
 *                             format: date-time
 *                           endDate:
 *                             type: string
 *                             format: date-time
 *                           approvalStatus:
 *                             type: string
 *                           targetAudience:
 *                             type: string
 *                           visibilityScope:
 *                             type: string
 *                           creatorType:
 *                             type: string
 *                           creatorId:
 *                             type: integer
 *                           description:
 *                             type: string
 *                             nullable: true
 *                           ProgramCreator:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                               logo:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               authorized:
 *                                 type: boolean
 *                               organizationName:
 *                                 type: string
 *                           ProgramApproval:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: integer
 *                                 program_id:
 *                                   type: integer
 *                                 program_detail_id:
 *                                   type: integer
 *                                 approver_type:
 *                                   type: string
 *                                 approver_id:
 *                                   type: integer
 *                                 status:
 *                                   type: string
 *                           ProgramDetails:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: integer
 *                                 programId:
 *                                   type: integer
 *                                 tier:
 *                                   type: integer
 *                                 minQty:
 *                                   type: string
 *                                 maxQty:
 *                                   type: string
 *                                 rebateAmount:
 *                                   type: string
 *                                 rebateType:
 *                                   type: string
 *                                 description:
 *                                   type: string
 *                                 overview:
 *                                   type: string
 *                     limit:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     totalCount:
 *                       type: integer
 *       400:
 *         description: Bad request.
 *       500:
 *         description: Internal server error.
 */
router.get(
  "/",
  asyncHandler(ProgramApprovalController.getPendingApprovalPrograms)
);

/**
 * @swagger
 * /program-approvals/{programId}:
 *   get:
 *     summary: Get program details for approval
 *     tags: [Program Approval]
 *     description: Retrieves detailed information about a specific program for approval.
 *     parameters:
 *       - in: path
 *         name: programId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the program to retrieve details for.
 *     responses:
 *       200:
 *         description: Program details for approval.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   description: The status of the response.
 *                 data:
 *                   $ref: '#/components/schemas/Program'
 *       400:
 *         description: Bad request.
 *       404:
 *         description: Program not found.
 *       500:
 *         description: Internal server error.
 */
router.get(
  "/:programId",
  asyncHandler(ProgramApprovalController.getProgramDetailsForApproval)
);

/**
 * @swagger
 * /program-approvals/approve:
 *   post:
 *     summary: Approve a program or enroll a store in a program
 *     tags: [Program Approval]
 *     description: |
 *       For distributors: Approves a program from a manufacturer.
 *       For stores: Enrolls the store in the specified program.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - programId
 *             properties:
 *               programId:
 *                 type: integer
 *                 description: The ID of the program to approve or enroll in.
 *               programDetailId:
 *                 type: integer
 *                 description: The ID of the program detail to approve (required for distributor approval, not used for store enrollment).
 *               notes:
 *                 type: string
 *                 description: Optional notes for the approval or enrollment.
 *     responses:
 *       200:
 *         description: Program approved or store enrolled successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   description: The status of the response.
 *                 data:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                     message:
 *                       type: string
 *       400:
 *         description: Bad request.
 *       404:
 *         description: Program not found.
 *       500:
 *         description: Internal server error.
 */
router.post("/approve", asyncHandler(ProgramApprovalController.approveProgram));

/**
 * @swagger
 * /program-approvals/opt-out:
 *   post:
 *     summary: Opt out of a program
 *     tags: [Program Approval]
 *     description: Allows a store to opt out of a program they previously enrolled in.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - programId
 *             properties:
 *               programId:
 *                 type: integer
 *                 description: The ID of the program to opt out from.
 *               notes:
 *                 type: string
 *                 description: Optional notes for opting out.
 *     responses:
 *       200:
 *         description: Successfully opted out of the program.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   description: The status of the response.
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                     effectiveDate:
 *                       type: string
 *                       format: date-time
 *                     notes:
 *                       type: string
 *       400:
 *         description: Bad request.
 *       404:
 *         description: Not enrolled in program.
 *       500:
 *         description: Internal server error.
 */
router.post("/opt-out", asyncHandler(ProgramApprovalController.optOutProgram));

/**
 * @swagger
 * /program-approvals/reject:
 *   post:
 *     summary: Reject a program
 *     tags: [Program Approval]
 *     description: Rejects a program for a distributor.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - programId
 *             properties:
 *               programId:
 *                 type: integer
 *                 description: The ID of the program to reject.
 *               notes:
 *                 type: string
 *                 description: Optional notes for the rejection.
 *     responses:
 *       200:
 *         description: Program rejected successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   description: The status of the response.
 *                 data:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                     message:
 *                       type: string
 *       400:
 *         description: Bad request.
 *       404:
 *         description: Program not found.
 *       500:
 *         description: Internal server error.
 */
router.post("/reject", asyncHandler(ProgramApprovalController.rejectProgram));

export default router;

import { Router } from "express";
import AgreementController from "../controllers/AgreementController";
import asyncHandler from "../middleware/asyncHandler";

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Agreements
 *     description: API endpoints for program agreements
 *
 * /agreements:
 *   get:
 *     summary: Get agreements by manufacturer ID
 *     description: Retrieves all program agreements for specified manufacturer(s). Supports comma-separated manufacturer IDs.
 *     tags: [Agreements]
 *     parameters:
 *       - name: manufacturerId
 *         in: query
 *         required: true
 *         description: Single manufacturer ID or comma-separated list of manufacturer IDs (e.g., "1" or "1,2,3")
 *         schema:
 *           type: string
 *         example: "1,2,3"
 *       - name: timeline
 *         in: query
 *         required: false
 *         description: Filter agreements by program timeline. "Current" returns active programs (start_date < now() AND end_date > now()), "Historical" returns expired programs (end_date < now()). Defaults to "Current" if not provided. Case-insensitive.
 *         schema:
 *           type: string
 *           enum: [Current, Historical]
 *         example: "Current"
 *     responses:
 *       200:
 *         description: Successfully retrieved agreements
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: object
 *                   properties:
 *                     agreements:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           agreementId:
 *                             type: integer
 *                             description: Unique identifier for the agreement
 *                             example: 1
 *                           agreementName:
 *                             type: string
 *                             description: Name of the agreement
 *                             example: "Q1 2024 Rebate Agreement"
 *                           programId:
 *                             type: integer
 *                             description: Associated program ID
 *                             example: 42
 *                           manufacturerId:
 *                             type: integer
 *                             description: Manufacturer ID associated with the program
 *                             example: 5
 *                     count:
 *                       type: integer
 *                       description: Total number of agreements returned
 *                       example: 5
 *       400:
 *         description: Bad request - missing or invalid manufacturerId
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 data:
 *                   type: string
 *                   example: "manufacturerId is required"
 *       401:
 *         description: Unauthorized - missing or invalid authentication
 *       500:
 *         description: Internal server error
 *     security:
 *       - bearerAuth: []
 */
router.get("/", asyncHandler(AgreementController.getAgreementsByManufacturer));

export default router;

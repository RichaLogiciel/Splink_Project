import { Router } from "express";
import UserController from "../controllers/UserController";
import asyncHandler from "../middleware/asyncHandler";
import { authenticate } from "../middleware/authentication";
const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Users
 *     description: API endpoints related to user accounts.
 *
 * /user/listing:
 *   get:
 *     summary: Retrieve user listings related to a specific parent entity ID with pagination.
 *     description: This endpoint fetches the user listings related to a specific parent entity ID based on the provided `parentEntityId` with pagination.
 *     tags: [Users]
 *     parameters:
 *       - name: parentEntityId
 *         in: query
 *         required: true
 *         description: The unique ID of the parent entity.
 *         schema:
 *           type: integer
 *       - name: currentPage
 *         in: query
 *         required: false
 *         description: The current page number.
 *         schema:
 *           type: integer
 *       - name: pageLimit
 *         in: query
 *         required: false
 *         description: The number of items per page.
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Successfully retrieved user listings.
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
 *                     users:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             description: Unique identifier of the user.
 *                             example: 2
 *                           email:
 *                             type: string
 *                             description: User's email address.
 *                           firstName:
 *                             type: string
 *                             description: User's first name.
 *                           lastName:
 *                             type: string
 *                             description: User's last name.
 *                           phone:
 *                             type: string
 *                             nullable: true
 *                             description: User's primary phone number.
 *                           status:
 *                             type: string
 *                             nullable: true
 *                             description: Status of the user.
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             description: Timestamp of when the user was created.
 *                           UserRole:
 *                             type: object
 *                             properties:
 *                               role:
 *                                 type: string
 *                                 description: Role of the user.
 *                     currentPage:
 *                       type: integer
 *                       description: The current page number.
 *                       example: 1
 *                     totalPages:
 *                       type: integer
 *                       description: The total number of pages.
 *                       example: 5
 *                     totalRes:
 *                       type: integer
 *                       description: The total number of results.
 *                       example: 42
 *       400:
 *         description: Invalid request. The 'parentEntityId' is required.
 *       404:
 *         description: No users found for the provided parent entity ID.
 *       500:
 *         description: Internal server error.
 *     security:
 *       - bearerAuth: []
 */
router.get("/listing", asyncHandler(UserController.getUsers));

/**
 * @swagger
 * tags:
 *   - name: Users
 *     description: API endpoints related to user accounts.
 *
 * /user/profile-details?userID={userID}:
 *   get:
 *     summary: Retrieve user account details.
 *     description: This endpoint fetches the account details of a specific user based on the provided `userID`.
 *     tags: [Users]
 *     parameters:
 *       - name: userID
 *         in: query
 *         required: true
 *         description: The unique ID of the user.
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Successfully retrieved user account details.
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
 *                     status:
 *                       type: integer
 *                       description: HTTP status code.
 *                       example: 200
 *                     data:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           description: Unique identifier of the user.
 *                           example: 1
 *                         email:
 *                           type: string
 *                           description: User's email address.
 *                           example: "john@example.com"
 *                         passwordHash:
 *                           type: string
 *                           description: User's hashed password.
 *                           example: "password123"
 *                         firstName:
 *                           type: string
 *                           description: User's first name.
 *                           example: "John"
 *                         lastName:
 *                           type: string
 *                           description: User's last name.
 *                           example: "Doe"
 *                         city:
 *                           type: string
 *                           description: User's city.
 *                           example: ""
 *                         state:
 *                           type: string
 *                           description: User's state.
 *                           example: ""
 *                         phone:
 *                           type: string
 *                           description: User's primary phone number.
 *                           example: ""
 *                         secondaryPhone:
 *                           type: string
 *                           description: User's secondary phone number.
 *                           example: ""
 *                         isActive:
 *                           type: boolean
 *                           description: Indicates whether the user is active.
 *                           example: false
 *                         status:
 *                           type: string
 *                           nullable: true
 *                           description: Status of the user.
 *                           example: null
 *                         lastLogin:
 *                           type: string
 *                           nullable: true
 *                           format: date-time
 *                           description: Timestamp of the user's last login.
 *                           example: null
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                           description: Timestamp of when the user was created.
 *                           example: "2024-10-23T10:43:09.175Z"
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *                           description: Timestamp of the last update to the user record.
 *                           example: "2024-10-23T12:02:59.924Z"
 *                         deletedAt:
 *                           type: string
 *                           nullable: true
 *                           format: date-time
 *                           description: Timestamp of when the user was deleted, if applicable.
 *                           example: null
 *                         created_at:
 *                           type: string
 *                           format: date-time
 *                           description: Legacy timestamp of when the user was created.
 *                           example: "2024-10-23T10:43:09.175Z"
 *                         updated_at:
 *                           type: string
 *                           format: date-time
 *                           description: Legacy timestamp of the last update.
 *                           example: "2024-10-23T12:22:38.359Z"
 *                         deleted_at:
 *                           type: string
 *                           nullable: true
 *                           format: date-time
 *                           description: Legacy timestamp of deletion.
 *                           example: null
 *       400:
 *         description: Invalid request. The 'userID' query parameter is required.
 *       500:
 *         description: Internal server error. Please try again later.
 *
 *     security:
 *       - bearerAuth: []
 */

router.get("/profile-details", asyncHandler(UserController.getProfileDetails));

/**
 * @swagger
 * tags:
 *   - name: Users
 *     description: API endpoints related to user accounts.
 *
 * /user/update-profile-details:
 *   put:
 *     summary: Update user account information.
 *     description: This endpoint allows users to update their account details by sending the relevant fields.
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userID
 *             properties:
 *               userID:
 *                 type: integer
 *                 description: The unique ID of the user whose data is being updated.
 *                 example: 1
 *               firstName:
 *                 type: string
 *                 description: Updated first name of the user.
 *                 example: "John"
 *               lastName:
 *                 type: string
 *                 description: Updated last name of the user.
 *                 example: "Doe"
 *               phone:
 *                 type: string
 *                 description: Updated primary phone number of the user.
 *                 example: "9087654321"
 *               secondaryPhone:
 *                 type: string
 *                 description: Updated secondary phone number of the user.
 *                 example: "1234567890"
 *     responses:
 *       200:
 *         description: Successfully updated user account information.
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
 *                     id:
 *                       type: integer
 *                       description: Unique identifier of the user.
 *                       example: 1
 *                     email:
 *                       type: string
 *                       description: User's email address.
 *                       example: "john@example.com"
 *                     firstName:
 *                       type: string
 *                       description: User's updated first name.
 *                       example: "John"
 *                     lastName:
 *                       type: string
 *                       description: User's updated last name.
 *                       example: "Doe"
 *                     phone:
 *                       type: string
 *                       description: User's updated primary phone number.
 *                       example: "9087654321"
 *                     secondaryPhone:
 *                       type: string
 *                       description: User's updated secondary phone number.
 *                       example: "1234567890"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       description: Timestamp of the last update.
 *                       example: "2024-10-23T12:22:38.359Z"
 *       400:
 *         description: Invalid request. The 'userID' field is required.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Internal server error. Please try again later.
 *
 *     security:
 *       - bearerAuth: []
 */

router.put(
  "/update-profile-details",
  asyncHandler(UserController.updateProfileDetails)
);

router.put("/update-password", asyncHandler(UserController.updateUserPassword));

router.put(
  "/ordering-feature-preference",
  authenticate(),
  asyncHandler(UserController.updateOrderingFeaturePreference)
);

router.post("/logout", asyncHandler(UserController.logout));

export default router;

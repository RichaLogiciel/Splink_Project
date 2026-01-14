import { Request, RequestHandler, Response, Router } from "express";
import AuthController, {
  loginRateLimiter
} from "../controllers/auth/AuthController";
import ProgramController from "../controllers/ProgramController";
import asyncHandler from "../middleware/asyncHandler";
import { authenticate } from "../middleware/authentication";
import { authorizeRoute } from "../middleware/authorize";

const router: Router = Router();

/**
 * @swagger
 * tags:
 *   - name: Authentication
 *     description: User authentication and authorization endpoints
 *
 * /auth/login:
 *   post:
 *     summary: Authenticate user and get tokens
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *               password:
 *                 type: string
 *                 format: password
 *                 description: User's password
 *           example:
 *             email: "distributor@example.com"
 *             password: "password123"
 *     responses:
 *       200:
 *         description: Successfully authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   description: JWT access token
 *                 refreshToken:
 *                   type: string
 *                   description: JWT refresh token
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: number
 *                     email:
 *                       type: string
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *                     role:
 *                       type: string
 *                     parentEntityId:
 *                       type: number
 *                     parentEntityType:
 *                       type: string
 *       400:
 *         description: Email and password are required
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Internal server error
 *
 * /auth/refresh-token:
 *   post:
 *     summary: Get new access token using refresh token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Valid refresh token received from login
 *           example:
 *             refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: Successfully refreshed access token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   description: New JWT access token
 *       400:
 *         description: Refresh token is required
 *       401:
 *         description: Invalid refresh token
 *       500:
 *         description: Internal server error
 *
 * /auth/logout:
 *   post:
 *     summary: Logout user and invalidate refresh token
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: number
 *                 description: ID of the user to logout
 *           example:
 *             userId: 1
 *     responses:
 *       200:
 *         description: Successfully logged out
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Successfully logged out"
 *       400:
 *         description: User ID is required
 *       401:
 *         description: Invalid or missing access token
 *       500:
 *         description: Internal server error
 *
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */
router.post("/login", loginRateLimiter, (async (
  req: Request,
  res: Response
) => {
  await AuthController.login(req, res);
}) as RequestHandler);

router.post("/loginas/:userID", authenticate(), authorizeRoute(), (async (
  req: Request,
  res: Response
) => {
  await AuthController.loginWithID(req, res);
}) as RequestHandler);

router.post("/refresh-token", (async (req: Request, res: Response) => {
  await AuthController.refreshToken(req, res);
}) as RequestHandler);

router.get("/invitation", (async (req: Request, res: Response) => {
  await AuthController.getInvitation(req, res);
}) as RequestHandler);

router.post("/invite-users", authenticate(), authorizeRoute(), (async (
  req: Request,
  res: Response
) => {
  await AuthController.inviteUsers(req, res);
}) as RequestHandler);

router.post("/cancel-user-invite", authenticate(), authorizeRoute(), (async (
  req: Request,
  res: Response
) => {
  await AuthController.cancelUserInvitation(req, res);
}) as RequestHandler);

router.post("/signup", (async (req: Request, res: Response) => {
  await AuthController.signup(req, res);
}) as RequestHandler);

router.post("/invite-existing-user", authenticate(), authorizeRoute(), (async (
  req: Request,
  res: Response
) => {
  await AuthController.inviteExistingUser(req, res);
}) as RequestHandler);

router.get("/invite-existing-user", (async (req: Request, res: Response) => {
  await AuthController.getInvitedExistingUser(req, res);
}) as RequestHandler);

/**
 * @swagger
 * tags:
 *   - name: Authentication
 *     description: User authentication and authorization endpoints
 *
 * /auth/forget-password:
 *   post:
 *     summary: Send a reset password email to the user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *           example:
 *             email: "user@logiciel.io"
 *     responses:
 *       200:
 *         description: Reset password email sent successfully
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
 *                     message:
 *                       type: string
 *                       example: "Reset password email sent"
 *       404:
 *         description: No matching user found
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
 *                   example: "No matching user in our records."
 *       500:
 *         description: Internal server error
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
 *                   example: "Internal server error"
 */
router.post("/forget-password", (async (req: Request, res: Response) => {
  await AuthController.sendForgetPasswordEmail(req, res);
}) as RequestHandler);

/**
 * @swagger
 * tags:
 *   - name: Authentication
 *     description: User authentication and authorization endpoints
 *
 * /auth/validate-password-reset-token/{token}:
 *   get:
 *     summary: Validate the reset password token
 *     tags: [Authentication]
 *     parameters:
 *       - in: path
 *         name: token
 *         schema:
 *           type: string
 *         required: true
 *         description: The reset password token to validate
 *     responses:
 *       200:
 *         description: Token is valid
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
 *                     message:
 *                       type: string
 *                       example: "Token is valid"
 *       400:
 *         description: Invalid request or missing parameters
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
 *                   example: "Token is required"
 *       401:
 *         description: Invalid or expired reset token
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
 *                   example: "Invalid or expired reset token"
 *       500:
 *         description: Internal server error
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
 *                   example: "Internal server error"
 */
router.get("/validate-password-reset-token", (async (
  req: Request,
  res: Response
) => {
  await AuthController.validatePasswordResetToken(req, res);
}) as RequestHandler);

/**
 * @swagger
 * tags:
 *   - name: Authentication
 *     description: User authentication and authorization endpoints
 *
 * /auth/reset-password:
 *   post:
 *     summary: Reset the user's password using a reset token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *                 description: The reset password token sent to the user's email
 *               newPassword:
 *                 type: string
 *                 description: The new password to set for the user
 *           example:
 *             token: "exampleToken12345"
 *             newPassword: "NewPassw0rd!"
 *     responses:
 *       200:
 *         description: Password reset successful
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
 *                     message:
 *                       type: string
 *                       example: "Password reset successful"
 *       400:
 *         description: Invalid request or missing parameters
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
 *                   example: "Token and new password are required"
 *       401:
 *         description: Invalid or expired reset token
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
 *                   example: "Invalid or expired reset token"
 *       500:
 *         description: Internal server error
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
 *                   example: "Internal server error"
 */
router.post("/reset-password", (async (req: Request, res: Response) => {
  await AuthController.resetPassword(req, res);
}) as RequestHandler);

router.post("/replace-email", (async (req: Request, res: Response) => {
  await AuthController.replaceEmailInvite(req, res);
}) as RequestHandler);

router.get(
  "/programs/get-manufacturer-ids",
  asyncHandler(ProgramController.getAllManufacturerIds)
);

export default router;

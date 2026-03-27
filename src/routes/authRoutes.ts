import express from "express";
import authController from "../controllers/authController";

const router = express.Router();

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: User login
 *     description: Authenticate user with username and password
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: User successfully authenticated. Access and Refresh tokens are set in cookies.
 *         headers:
 *           Set-Cookie:
 *             description: Set-Cookie header for accessToken and refreshToken
 *             schema:
 *               type: string
 *               example: accessToken=abc; Path=/; HttpOnly
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post("/login", authController.login);

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Create a new user account with username and password
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User successfully registered. Access and Refresh tokens are set in cookies.
 *         headers:
 *           Set-Cookie:
 *             description: Set-Cookie header for accessToken and refreshToken
 *             schema:
 *               type: string
 *               example: accessToken=abc; Path=/; HttpOnly
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         $ref: '#/components/responses/ConflictError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post("/register", authController.register);

/**
 * @swagger
 * /auth/google:
 *   post:
 *     summary: Google Authentication
 *     description: Login or register using a Google credential token
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - credential
 *             properties:
 *               credential:
 *                 type: string
 *                 description: The Google JWT credential token
 *     responses:
 *       200:
 *         description: User successfully authenticated. Access and Refresh tokens are set in cookies.
 *         headers:
 *           Set-Cookie:
 *             description: Set-Cookie header for accessToken and refreshToken
 *             schema:
 *               type: string
 *               example: accessToken=abc; Path=/; HttpOnly
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post("/google", authController.googleLogin);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: User logout
 *     description: Invalidate refresh token
 *     tags: [Authentication]
 *     security:
 *       - refreshTokenAuth: []
 *     responses:
 *       200:
 *         description: User successfully logged out
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post("/logout", authController.logout);

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     description: Generate new access and refresh tokens using a valid refresh token from cookie
 *     tags: [Authentication]
 *     security:
 *       - refreshTokenAuth: []
 *     responses:
 *       200:
 *         description: Tokens successfully refreshed. Access and Refresh tokens are updated in cookies.
 *         headers:
 *           Set-Cookie:
 *             description: Set-Cookie header for accessToken and refreshToken
 *             schema:
 *               type: string
 *               example: accessToken=abc; Path=/; HttpOnly
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post("/refresh-token", authController.refreshToken);

export default router;

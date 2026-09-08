import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { registerSchema, loginSchema, refreshSchema } from './auth.schema';
import * as authController from './auth.controller';
import {
  authDashboardAggregateLimiter,
  authDashboardClientLimiter,
  authLimiter,
} from '../../middleware/rateLimiter';

const router = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     description: Creates a customer or vendor account. `storeName` is required when `role` is `VENDOR`.
 *     security: []
 *     parameters:
 *       - in: header
 *         name: X-Auth-Mode
 *         required: false
 *         schema:
 *           type: string
 *           enum: [cookie]
 *         description: Set to `cookie` to return tokens only as HttpOnly cookies.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: Jane Smith
 *               email:
 *                 type: string
 *                 format: email
 *                 example: jane@example.com
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 100
 *                 example: secret123
 *               role:
 *                 type: string
 *                 enum: [CUSTOMER, VENDOR]
 *                 default: CUSTOMER
 *               storeName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 description: Required when role is VENDOR
 *                 example: Jane's Boutique
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccess'
 *             example:
 *               success: true
 *               message: User registered successfully
 *               data:
 *                 userId: "d290f1ee-6c54-4b01-90e6-d701748f0851"
 *                 email: "jane@example.com"
 *                 role: CUSTOMER
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       409:
 *         description: Email or normalized vendor store name already in use
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.post(
  '/register',
  authDashboardClientLimiter,
  authDashboardAggregateLimiter,
  authLimiter,
  validate(registerSchema),
  authController.register
);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with bearer tokens or secure web cookies
 *     security: []
 *     parameters:
 *       - in: header
 *         name: X-Auth-Mode
 *         required: false
 *         schema:
 *           type: string
 *           enum: [cookie]
 *         description: Set to `cookie` for a browser session. Tokens are then returned only as HttpOnly cookies.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: jane@example.com
 *               password:
 *                 type: string
 *                 example: secret123
 *     responses:
 *       200:
 *         description: Login successful. Bearer clients receive tokens in data; cookie clients receive Set-Cookie headers and user data only.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Login successful
 *               data:
 *                 user:
 *                   id: "d290f1ee-6c54-4b01-90e6-d701748f0851"
 *                   email: "jane@example.com"
 *                   role: CUSTOMER
 *                 tokens:
 *                   accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                   refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.post(
  '/login',
  authDashboardClientLimiter,
  authDashboardAggregateLimiter,
  authLimiter,
  validate(loginSchema),
  authController.login
);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Rotate the access and refresh tokens
 *     description: Cookie clients send the HttpOnly refresh cookie. Bearer clients send refreshToken in JSON. Consumption and encrypted grace-result publication are one atomic operation. Overlapping requests receive the same replacement pair only when they present the same browser CSRF secret or opaque X-Refresh-Rotation-Key idempotency proof.
 *     security: []
 *     parameters:
 *       - in: header
 *         name: X-Refresh-Rotation-Key
 *         required: false
 *         schema:
 *           type: string
 *         description: Opaque client-session proof that binds bounded idempotent replay. Browser cookie clients use their CSRF secret automatically.
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: Rotated token pair. Bearer clients receive tokens in data; cookie clients receive updated Set-Cookie headers and null data.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Token refreshed
 *               data:
 *                 accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       400:
 *         description: Missing or invalid refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       401:
 *         description: Refresh token expired or blacklisted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.post('/refresh', validate(refreshSchema), authController.refresh);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout, revoke the refresh token, and clear web cookies
 *     description: Cookie clients send the HttpOnly refresh cookie. Bearer clients may pass refreshToken in JSON. Both auth cookies are always cleared.
 *     security: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Logged out successfully
 *               data: null
 */
router.post('/logout', authController.logout);

/**
 * @openapi
 * /auth/profile:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user profile
 *     description: Returns the profile of the authenticated user. Accepts a Bearer access token or the HttpOnly access cookie.
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Profile fetched
 *               data:
 *                 userId: "d290f1ee-6c54-4b01-90e6-d701748f0851"
 *                 name: Jane Smith
 *                 email: "jane@example.com"
 *                 role: CUSTOMER
 *       401:
 *         description: Missing or invalid access token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.get('/profile', authenticate, authController.getProfile);

export default router;

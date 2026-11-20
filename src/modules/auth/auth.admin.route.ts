import { Router } from 'express';
import { validate } from '../../middlewares/validate.js';
import { authController } from './auth.controller.js';
import { loginSchema } from './auth.validation.js';

const router = Router();

/**
 * @openapi
 * /admin/auth/login:
 *   post:
 *     tags: [Admin · Auth]
 *     summary: Admin / doctor login (email + password)
 *     description: |
 *       Admin-only login endpoint. Patient accounts attempting to sign in here
 *       will be rejected with 403 and redirected to `/auth/login`. Returns the
 *       same `LoginResponse` shape as the patient endpoint — the only
 *       difference is the role-gate and the activity-log `via` tag.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Admin login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Invalid email or password
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Account disabled, or patient account trying to use the admin login
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationErrorResponse' }
 */
router.post('/login', validate(loginSchema), authController.adminLogin);

export default router;

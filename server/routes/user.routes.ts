import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { getStats, updateProfile, getUsage } from '../controllers/user.controller.js';

const router = Router();

/**
 * @swagger
 * /api/user/stats:
 *   get:
 *     summary: Get user statistics for dashboard
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     canvasCount:
 *                       type: integer
 *                     widgetCount:
 *                       type: integer
 *                     totalViews:
 *                       type: integer
 *                     totalAiGenerations:
 *                       type: integer
 *                     storageUsed:
 *                       type: integer
 *                     storageLimit:
 *                       type: integer
 *       401:
 *         description: Not authenticated
 */
router.get('/stats', authenticate, getStats);

/**
 * @swagger
 * /api/user/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *               avatarUrl:
 *                 type: string
 *                 format: uri
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 */
router.put('/profile', authenticate, updateProfile);

/**
 * @swagger
 * /api/user/usage:
 *   get:
 *     summary: Get detailed usage information
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Usage details with tier limits
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     tier:
 *                       type: string
 *                       enum: [free, pro, creator]
 *                     usage:
 *                       type: object
 *                     limits:
 *                       type: object
 *                     period:
 *                       type: object
 *       401:
 *         description: Not authenticated
 */
router.get('/usage', authenticate, getUsage);

export default router;

import { Router } from 'express';
import * as uploadController from '../controllers/upload.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { uploadLimiter } from '../middleware/rateLimit.middleware.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validate.middleware.js';
import {
  signedUrlRequestSchema,
  completeUploadSchema,
  assetQuerySchema,
  assetIdParamSchema,
} from '../schemas/upload.schema.js';

const router = Router();

/**
 * @route POST /api/upload/signed-url
 * @desc Generate a signed URL for upload
 * @access Private
 */
router.post(
  '/signed-url',
  authenticate,
  uploadLimiter,
  validateBody(signedUrlRequestSchema),
  uploadController.generateSignedUrl
);

/**
 * @route POST /api/upload/complete
 * @desc Complete an upload and create asset record
 * @access Private
 */
router.post(
  '/complete',
  authenticate,
  validateBody(completeUploadSchema),
  uploadController.completeUpload
);

/**
 * @route GET /api/upload/assets
 * @desc List user's assets
 * @access Private
 */
router.get(
  '/assets',
  authenticate,
  validateQuery(assetQuerySchema),
  uploadController.listAssets
);

/**
 * @route GET /api/upload/assets/:id
 * @desc Get asset by ID
 * @access Private
 */
router.get(
  '/assets/:id',
  authenticate,
  validateParams(assetIdParamSchema),
  uploadController.getAsset
);

/**
 * @route DELETE /api/upload/assets/:id
 * @desc Delete an asset
 * @access Private
 */
router.delete(
  '/assets/:id',
  authenticate,
  validateParams(assetIdParamSchema),
  uploadController.deleteAsset
);

/**
 * @route GET /api/upload/assets/:id/download
 * @desc Get signed download URL
 * @access Private
 */
router.get(
  '/assets/:id/download',
  authenticate,
  validateParams(assetIdParamSchema),
  uploadController.getDownloadUrl
);

export default router;

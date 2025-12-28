import { Request, Response } from 'express';
import { storageService } from '../services/storage.service.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import type {
  SignedUrlRequest,
  CompleteUploadInput,
  AssetQuery,
} from '../schemas/upload.schema.js';

/**
 * Generate a signed upload URL
 * POST /api/upload/signed-url
 */
export const generateSignedUrl = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const input: SignedUrlRequest = req.body;

  const result = await storageService.generateSignedUploadUrl(userId, input);

  res.json({
    success: true,
    ...result,
  });
});

/**
 * Complete an upload
 * POST /api/upload/complete
 */
export const completeUpload = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const input: CompleteUploadInput = req.body;

  const asset = await storageService.completeUpload(
    userId,
    input.assetId,
    input.key,
    input.name,
    input.metadata
  );

  res.json({
    success: true,
    asset,
  });
});

/**
 * List user's assets
 * GET /api/upload/assets
 */
export const listAssets = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const query = req.query as unknown as AssetQuery;

  const result = await storageService.listAssets(userId, query);

  res.json({
    success: true,
    ...result,
  });
});

/**
 * Get asset by ID
 * GET /api/upload/assets/:id
 */
export const getAsset = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;

  const asset = await storageService.getAsset(id, userId);

  res.json({
    success: true,
    asset,
  });
});

/**
 * Delete an asset
 * DELETE /api/upload/assets/:id
 */
export const deleteAsset = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;

  await storageService.deleteAsset(id, userId);

  res.json({
    success: true,
    message: 'Asset deleted',
  });
});

/**
 * Get signed download URL
 * GET /api/upload/assets/:id/download
 */
export const getDownloadUrl = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;

  const url = await storageService.generateSignedDownloadUrl(id, userId);

  res.json({
    success: true,
    downloadUrl: url,
  });
});

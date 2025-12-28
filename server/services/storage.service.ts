import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { storageConfig, AssetType, isMimeTypeAllowed, getMaxFileSize } from '../config/storage.js';
import { db } from '../db/client.js';
import { idGenerators } from '../utils/id.js';
import { NotFoundError, UploadError, AuthorizationError } from '../utils/AppErrors.js';
import { log } from '../utils/logger.js';
import type { AssetQuery, AssetResponse, SignedUrlRequest } from '../schemas/upload.schema.js';

// JSON type alias for Prisma JSON fields
type JsonValue = unknown;

/**
 * Storage service - handles S3/R2 operations
 */
export class StorageService {
  private client: S3Client;

  constructor() {
    this.client = new S3Client({
      endpoint: storageConfig.endpoint,
      region: storageConfig.region,
      credentials: storageConfig.credentials,
    });
  }

  /**
   * Generate a presigned URL for upload
   */
  async generateSignedUploadUrl(
    userId: string,
    request: SignedUrlRequest
  ): Promise<{
    uploadUrl: string;
    assetId: string;
    key: string;
    expiresAt: string;
  }> {
    // Validate MIME type
    if (!isMimeTypeAllowed(request.contentType, request.assetType)) {
      throw new UploadError(`Content type ${request.contentType} not allowed for ${request.assetType}`);
    }

    // Validate file size if provided
    if (request.size) {
      const maxSize = getMaxFileSize(request.assetType);
      if (request.size > maxSize) {
        throw new UploadError(`File size exceeds maximum of ${maxSize / 1024 / 1024}MB`);
      }
    }

    // Generate asset ID and storage key
    const assetId = idGenerators.asset();
    const bucket = this.getBucketForAssetType(request.assetType);
    const key = this.generateKey(userId, assetId, request.filename, request.canvasId);

    // Generate presigned URL
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: request.contentType,
    });

    const expiresIn = storageConfig.upload.signedUrlExpiry;
    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn });
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    log.storage('generateSignedUrl', bucket, key);

    return {
      uploadUrl,
      assetId,
      key,
      expiresAt,
    };
  }

  /**
   * Complete an upload and create asset record
   */
  async completeUpload(
    userId: string,
    assetId: string,
    key: string,
    name?: string,
    metadata?: Record<string, unknown>
  ): Promise<AssetResponse> {
    // Verify the file exists in storage
    const bucket = this.getBucketFromKey(key);
    const exists = await this.objectExists(bucket, key);

    if (!exists) {
      throw new UploadError('File not found in storage');
    }

    // Get object metadata
    const objectMeta = await this.getObjectMetadata(bucket, key);

    // Parse asset type and canvas ID from key
    const { assetType, canvasId } = this.parseKey(key);

    // Create asset record
    const asset = await db.asset.create({
      data: {
        id: assetId,
        userId,
        canvasId,
        name: name || key.split('/').pop() || 'Unnamed asset',
        mimeType: objectMeta.contentType,
        size: objectMeta.contentLength,
        storagePath: key,
        publicUrl: this.getPublicUrl(bucket, key),
        assetType,
        metadata: metadata as JsonValue,
      },
    });

    log.storage('completeUpload', bucket, key);

    return this.formatAsset(asset);
  }

  /**
   * List user's assets
   */
  async listAssets(
    userId: string,
    query: AssetQuery
  ): Promise<{
    assets: AssetResponse[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const where: { userId: string; assetType?: string; canvasId?: string; name?: Record<string, unknown> } = { userId };

    if (query.assetType) {
      where.assetType = query.assetType;
    }

    if (query.canvasId) {
      where.canvasId = query.canvasId;
    }

    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    const orderBy: Record<string, 'asc' | 'desc'> = {
      [query.sortBy]: query.sortOrder,
    };

    const [assets, total] = await Promise.all([
      db.asset.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      db.asset.count({ where }),
    ]);

    return {
      assets: assets.map((a: Parameters<StorageService['formatAsset']>[0]) => this.formatAsset(a)),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  /**
   * Get asset by ID
   */
  async getAsset(assetId: string, userId: string): Promise<AssetResponse> {
    const asset = await db.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      throw new NotFoundError('Asset', assetId);
    }

    if (asset.userId !== userId) {
      throw new AuthorizationError('Not authorized to access this asset');
    }

    return this.formatAsset(asset);
  }

  /**
   * Delete an asset
   */
  async deleteAsset(assetId: string, userId: string): Promise<void> {
    const asset = await db.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      throw new NotFoundError('Asset', assetId);
    }

    if (asset.userId !== userId) {
      throw new AuthorizationError('Not authorized to delete this asset');
    }

    // Delete from storage
    const bucket = this.getBucketFromKey(asset.storagePath);
    await this.deleteObject(bucket, asset.storagePath);

    // Delete from database
    await db.asset.delete({
      where: { id: assetId },
    });

    log.storage('deleteAsset', bucket, asset.storagePath);
  }

  /**
   * Generate a presigned URL for download
   */
  async generateSignedDownloadUrl(assetId: string, userId: string): Promise<string> {
    const asset = await db.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      throw new NotFoundError('Asset', assetId);
    }

    if (asset.userId !== userId) {
      throw new AuthorizationError('Not authorized to access this asset');
    }

    const bucket = this.getBucketFromKey(asset.storagePath);
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: asset.storagePath,
    });

    const url = await getSignedUrl(this.client, command, {
      expiresIn: storageConfig.upload.signedUrlExpiry,
    });

    return url;
  }

  /**
   * Check if an object exists in storage
   */
  private async objectExists(bucket: string, key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get object metadata
   */
  private async getObjectMetadata(
    bucket: string,
    key: string
  ): Promise<{ contentType: string; contentLength: number }> {
    const response = await this.client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return {
      contentType: response.ContentType || 'application/octet-stream',
      contentLength: response.ContentLength || 0,
    };
  }

  /**
   * Delete an object from storage
   */
  private async deleteObject(bucket: string, key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  }

  /**
   * Get bucket name for asset type
   */
  private getBucketForAssetType(assetType: AssetType): string {
    switch (assetType) {
      case 'widgetBundle':
        return storageConfig.buckets.userWidgets;
      default:
        return storageConfig.buckets.assets;
    }
  }

  /**
   * Get bucket name from key (assumes key starts with bucket name or follows pattern)
   */
  private getBucketFromKey(key: string): string {
    // For simplicity, use assets bucket unless key indicates widget bundle
    if (key.includes('/widgets/') || key.endsWith('.zip')) {
      return storageConfig.buckets.userWidgets;
    }
    return storageConfig.buckets.assets;
  }

  /**
   * Generate storage key
   */
  private generateKey(
    userId: string,
    assetId: string,
    filename: string,
    canvasId?: string
  ): string {
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    if (canvasId) {
      return storageConfig.paths.canvasAsset(canvasId, assetId, sanitizedFilename);
    }
    return storageConfig.paths.userAsset(userId, assetId, sanitizedFilename);
  }

  /**
   * Parse key to extract asset type and canvas ID
   */
  private parseKey(key: string): { assetType: string; canvasId: string | null } {
    // Key format: userId/assets/assetId/filename or canvasId/assets/assetId/filename
    const parts = key.split('/');
    const canvasId = parts.length >= 4 && parts[1] === 'assets' ? parts[0] : null;
    const assetType = key.endsWith('.zip') ? 'widgetBundle' : 'image';
    return { assetType, canvasId };
  }

  /**
   * Get public URL for an asset
   */
  private getPublicUrl(bucket: string, key: string): string {
    // This would depend on your R2/S3 configuration
    // For R2 with a custom domain, it might be: https://assets.yourdomain.com/${key}
    // For now, return null as public URLs may require additional configuration
    return `${storageConfig.endpoint}/${bucket}/${key}`;
  }

  /**
   * Format asset for response
   */
  private formatAsset(asset: {
    id: string;
    userId: string;
    canvasId: string | null;
    name: string;
    mimeType: string;
    size: number;
    storagePath: string;
    publicUrl: string | null;
    assetType: string;
    metadata: JsonValue;
    createdAt: Date;
  }): AssetResponse {
    return {
      id: asset.id,
      userId: asset.userId,
      canvasId: asset.canvasId,
      name: asset.name,
      mimeType: asset.mimeType,
      size: asset.size,
      storagePath: asset.storagePath,
      publicUrl: asset.publicUrl,
      assetType: asset.assetType,
      metadata: asset.metadata,
      createdAt: asset.createdAt.toISOString(),
    };
  }
}

// Export singleton instance
export const storageService = new StorageService();

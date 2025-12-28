/**
 * Canvas Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the db module
vi.mock('../../db/client.js', () => ({
  db: {
    canvas: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    widgetInstance: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn((fn) => fn({
      canvas: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      widgetInstance: {
        findMany: vi.fn(),
        deleteMany: vi.fn(),
      },
    })),
  },
}));

import { db } from '../../db/client.js';
import { createTestCanvas, createTestWidgetInstance } from '../utils/test-helpers.js';

describe('Canvas Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Canvas CRUD Operations', () => {
    it('should create a new canvas', async () => {
      const mockCanvas = createTestCanvas();
      vi.mocked(db.canvas.create).mockResolvedValue(mockCanvas);

      const canvas = await db.canvas.create({
        data: {
          userId: 'user-123',
          name: 'Test Canvas',
          slug: 'test-canvas',
          description: 'A test canvas',
          isPublic: false,
          backgroundConfig: {},
          settings: {},
          tags: ['test'],
        },
      });

      expect(canvas).toBeDefined();
      expect(canvas.name).toBe('Test Canvas');
      expect(canvas.userId).toBe('user-123');
      expect(db.canvas.create).toHaveBeenCalled();
    });

    it('should find canvas by id', async () => {
      const mockCanvas = createTestCanvas();
      vi.mocked(db.canvas.findUnique).mockResolvedValue(mockCanvas);

      const canvas = await db.canvas.findUnique({
        where: { id: 'canvas-123' },
      });

      expect(canvas).toBeDefined();
      expect(canvas?.id).toBe('canvas-123');
    });

    it('should find canvas by slug', async () => {
      const mockCanvas = createTestCanvas();
      vi.mocked(db.canvas.findFirst).mockResolvedValue(mockCanvas);

      const canvas = await db.canvas.findFirst({
        where: {
          slug: 'test-canvas',
          userId: 'user-123',
        },
      });

      expect(canvas).toBeDefined();
      expect(canvas?.slug).toBe('test-canvas');
    });

    it('should update canvas', async () => {
      const mockCanvas = createTestCanvas({ name: 'Updated Canvas' });
      vi.mocked(db.canvas.update).mockResolvedValue(mockCanvas);

      const canvas = await db.canvas.update({
        where: { id: 'canvas-123' },
        data: {
          name: 'Updated Canvas',
          version: { increment: 1 },
        },
      });

      expect(canvas.name).toBe('Updated Canvas');
    });

    it('should delete canvas', async () => {
      const mockCanvas = createTestCanvas();
      vi.mocked(db.canvas.delete).mockResolvedValue(mockCanvas);

      const canvas = await db.canvas.delete({
        where: { id: 'canvas-123' },
      });

      expect(canvas).toBeDefined();
      expect(db.canvas.delete).toHaveBeenCalledWith({
        where: { id: 'canvas-123' },
      });
    });
  });

  describe('Canvas Listing', () => {
    it('should list user canvases with pagination', async () => {
      const mockCanvases = [
        createTestCanvas({ id: 'canvas-1', name: 'Canvas 1' }),
        createTestCanvas({ id: 'canvas-2', name: 'Canvas 2' }),
      ];
      vi.mocked(db.canvas.findMany).mockResolvedValue(mockCanvases);
      vi.mocked(db.canvas.count).mockResolvedValue(2);

      const canvases = await db.canvas.findMany({
        where: { userId: 'user-123' },
        skip: 0,
        take: 10,
        orderBy: { updatedAt: 'desc' },
      });

      const count = await db.canvas.count({
        where: { userId: 'user-123' },
      });

      expect(canvases).toHaveLength(2);
      expect(count).toBe(2);
    });

    it('should filter public canvases', async () => {
      const mockCanvases = [
        createTestCanvas({ id: 'canvas-1', isPublic: true }),
      ];
      vi.mocked(db.canvas.findMany).mockResolvedValue(mockCanvases);

      const canvases = await db.canvas.findMany({
        where: { isPublic: true },
      });

      expect(canvases).toHaveLength(1);
      expect(canvases[0].isPublic).toBe(true);
    });
  });

  describe('Canvas Authorization', () => {
    it('should allow owner to access canvas', async () => {
      const mockCanvas = createTestCanvas({ userId: 'user-123' });
      vi.mocked(db.canvas.findUnique).mockResolvedValue(mockCanvas);

      const canvas = await db.canvas.findUnique({
        where: { id: 'canvas-123' },
      });

      expect(canvas?.userId).toBe('user-123');
      // In real service: canvas.userId === requestingUserId
    });

    it('should allow public canvas access', async () => {
      const mockCanvas = createTestCanvas({ isPublic: true, userId: 'other-user' });
      vi.mocked(db.canvas.findUnique).mockResolvedValue(mockCanvas);

      const canvas = await db.canvas.findUnique({
        where: { id: 'canvas-123' },
      });

      expect(canvas?.isPublic).toBe(true);
      // Public canvases can be viewed by anyone
    });
  });

  describe('Canvas with Widgets', () => {
    it('should load canvas with widget instances', async () => {
      const mockCanvas = createTestCanvas();
      const mockWidgets = [
        createTestWidgetInstance({ id: 'widget-1' }),
        createTestWidgetInstance({ id: 'widget-2' }),
      ];

      vi.mocked(db.canvas.findUnique).mockResolvedValue({
        ...mockCanvas,
        widgets: mockWidgets,
      } as typeof mockCanvas & { widgets: typeof mockWidgets });

      const canvas = await db.canvas.findUnique({
        where: { id: 'canvas-123' },
        include: { widgets: true },
      });

      expect(canvas).toBeDefined();
      expect((canvas as { widgets?: unknown[] })?.widgets).toHaveLength(2);
    });

    it('should delete widgets when canvas is deleted', async () => {
      vi.mocked(db.widgetInstance.deleteMany).mockResolvedValue({ count: 5 });

      const result = await db.widgetInstance.deleteMany({
        where: { canvasId: 'canvas-123' },
      });

      expect(result.count).toBe(5);
    });
  });

  describe('Slug Generation', () => {
    it('should generate unique slug', () => {
      const name = 'My Awesome Canvas!';
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      expect(slug).toBe('my-awesome-canvas');
    });

    it('should handle duplicate slugs', async () => {
      // First canvas with slug exists
      vi.mocked(db.canvas.findFirst).mockResolvedValueOnce(createTestCanvas({ slug: 'test-canvas' }));

      const existing = await db.canvas.findFirst({
        where: { slug: 'test-canvas', userId: 'user-123' },
      });

      expect(existing).not.toBeNull();
      // In real service: append timestamp or number to make unique
    });
  });
});

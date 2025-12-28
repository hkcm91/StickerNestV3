/**
 * StickerNest v2 - Commerce Forms Controller
 * Handles form submissions and lead management
 */

import type { Request, Response, NextFunction } from 'express';
import { db } from '../../db/client.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../utils/error-types.js';
import type { SubmitFormInput, UpdateSubmissionInput } from '../../schemas/commerce.schema.js';

/**
 * Submit a form (public endpoint)
 */
export async function submitForm(req: Request, res: Response, next: NextFunction) {
  try {
    const input: SubmitFormInput = req.body;

    const canvas = await db.canvas.findUnique({
      where: { id: input.canvasId },
      select: { id: true, userId: true, name: true },
    });

    if (!canvas) {
      throw new AppError('Canvas not found', 404);
    }

    const submission = await db.formSubmission.create({
      data: {
        canvasId: input.canvasId,
        creatorId: canvas.userId,
        widgetId: input.widgetId,
        formType: input.formType || 'generic',
        formData: input.formData,
        utmSource: input.utm_source,
        utmMedium: input.utm_medium,
        utmCampaign: input.utm_campaign,
        status: 'new',
      },
    });

    logger.info({ submissionId: submission.id, canvasId: input.canvasId, formType: input.formType }, 'Form submitted');

    res.status(201).json({
      success: true,
      submission: {
        id: submission.id,
        createdAt: submission.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * List form submissions for creator
 */
export async function listSubmissions(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { canvasId, formType, status, limit = 50, offset = 0 } = req.query;

    const where: any = { creatorId: userId };
    if (canvasId) where.canvasId = canvasId;
    if (formType) where.formType = formType;
    if (status) where.status = status;

    const [submissions, total] = await Promise.all([
      db.formSubmission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
        include: {
          canvas: { select: { name: true, slug: true } },
        },
      }),
      db.formSubmission.count({ where }),
    ]);

    res.json({ submissions, total });
  } catch (error) {
    next(error);
  }
}

/**
 * Get single submission
 */
export async function getSubmission(req: Request, res: Response, next: NextFunction) {
  try {
    const { submissionId } = req.params;
    const userId = req.user!.id;

    const submission = await db.formSubmission.findUnique({
      where: { id: submissionId },
      include: {
        canvas: { select: { name: true, slug: true } },
      },
    });

    if (!submission || submission.creatorId !== userId) {
      throw new AppError('Submission not found', 404);
    }

    res.json({ submission });
  } catch (error) {
    next(error);
  }
}

/**
 * Update submission status/notes
 */
export async function updateSubmission(req: Request, res: Response, next: NextFunction) {
  try {
    const { submissionId } = req.params;
    const userId = req.user!.id;
    const input: UpdateSubmissionInput = req.body;

    const submission = await db.formSubmission.findUnique({
      where: { id: submissionId },
      select: { creatorId: true },
    });

    if (!submission || submission.creatorId !== userId) {
      throw new AppError('Submission not found', 404);
    }

    const updated = await db.formSubmission.update({
      where: { id: submissionId },
      data: {
        ...(input.status !== undefined && { status: input.status }),
        ...(input.notes !== undefined && { notes: input.notes }),
      },
      include: {
        canvas: { select: { name: true, slug: true } },
      },
    });

    res.json({ submission: updated });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a submission
 */
export async function deleteSubmission(req: Request, res: Response, next: NextFunction) {
  try {
    const { submissionId } = req.params;
    const userId = req.user!.id;

    const submission = await db.formSubmission.findUnique({
      where: { id: submissionId },
      select: { creatorId: true },
    });

    if (!submission || submission.creatorId !== userId) {
      throw new AppError('Submission not found', 404);
    }

    await db.formSubmission.delete({
      where: { id: submissionId },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

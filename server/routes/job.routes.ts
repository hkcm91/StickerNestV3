/**
 * Job Routes
 * Routes for job submission and management
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  submitImageJob,
  submitVideoJob,
  submitWidgetJob,
  submitLoraJob,
  getJobStatus,
  getUserJobs,
  cancelJob,
  getQueueStats,
} from '../controllers/job.controller.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route POST /api/jobs/image
 * @desc Submit an image generation job
 * @access Private
 */
router.post('/image', submitImageJob);

/**
 * @route POST /api/jobs/video
 * @desc Submit a video generation job
 * @access Private
 */
router.post('/video', submitVideoJob);

/**
 * @route POST /api/jobs/widget
 * @desc Submit a widget generation job
 * @access Private
 */
router.post('/widget', submitWidgetJob);

/**
 * @route POST /api/jobs/lora
 * @desc Submit a LoRA training job
 * @access Private
 */
router.post('/lora', submitLoraJob);

/**
 * @route GET /api/jobs
 * @desc Get user's jobs
 * @query queue - Optional queue name to filter
 * @query status - Optional status to filter (pending, active, completed, failed)
 * @query limit - Maximum number of jobs to return (default 20)
 * @access Private
 */
router.get('/', getUserJobs);

/**
 * @route GET /api/jobs/stats
 * @desc Get queue statistics
 * @access Private
 */
router.get('/stats', getQueueStats);

/**
 * @route GET /api/jobs/:jobId
 * @desc Get job status
 * @query queue - Required queue name
 * @access Private
 */
router.get('/:jobId', getJobStatus);

/**
 * @route DELETE /api/jobs/:jobId
 * @desc Cancel a pending job
 * @query queue - Required queue name
 * @access Private
 */
router.delete('/:jobId', cancelJob);

export default router;

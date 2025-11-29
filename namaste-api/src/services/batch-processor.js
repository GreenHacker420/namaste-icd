/**
 * Batch Processing Service
 * 
 * Async job queue for batch mapping operations
 * Uses in-memory queue (replace with Bull/Redis in production)
 */

import { getPrisma } from '../db/client.js';
import { mapNamasteToTm2 } from '../workflows/mapping-graph.js';
import { logger } from '../config/logger.js';
import { recordMappingMetrics } from '../middleware/metrics.js';
import { EventEmitter } from 'events';

// Job status enum
const JobStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

// In-memory job queue
const jobs = new Map();
const jobQueue = [];
let isProcessing = false;
const maxConcurrent = 3;
let activeJobs = 0;

// Event emitter for job updates
export const jobEvents = new EventEmitter();

/**
 * Generate unique job ID
 */
const generateJobId = () => `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

/**
 * Create a new batch mapping job
 */
export const createBatchJob = async (codes, options = {}) => {
  const jobId = generateJobId();
  const {
    priority = 'normal',
    userId,
    callbackUrl,
    saveResults = true,
  } = options;

  const job = {
    id: jobId,
    status: JobStatus.PENDING,
    priority,
    userId,
    callbackUrl,
    saveResults,
    codes: codes.map((c, i) => ({
      index: i,
      code: c.code,
      system: c.system,
      status: 'pending',
      result: null,
      error: null,
    })),
    progress: {
      total: codes.length,
      completed: 0,
      successful: 0,
      failed: 0,
      percentage: 0,
    },
    createdAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
    error: null,
  };

  jobs.set(jobId, job);
  jobQueue.push(jobId);

  logger.info({ jobId, codeCount: codes.length }, 'Batch job created');

  // Start processing if not already running
  processQueue();

  return {
    jobId,
    status: job.status,
    progress: job.progress,
    estimatedTime: estimateProcessingTime(codes.length),
  };
};

/**
 * Estimate processing time based on code count
 */
const estimateProcessingTime = (codeCount) => {
  // Assume ~20 seconds per mapping on average
  const seconds = codeCount * 20 / maxConcurrent;
  if (seconds < 60) return `${Math.ceil(seconds)} seconds`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)} minutes`;
  return `${(seconds / 3600).toFixed(1)} hours`;
};

/**
 * Process the job queue
 */
const processQueue = async () => {
  if (isProcessing) return;
  isProcessing = true;

  while (jobQueue.length > 0 && activeJobs < maxConcurrent) {
    const jobId = jobQueue.shift();
    const job = jobs.get(jobId);

    if (!job || job.status === JobStatus.CANCELLED) continue;

    activeJobs++;
    processJob(job).finally(() => {
      activeJobs--;
      if (jobQueue.length > 0) {
        processQueue();
      }
    });
  }

  isProcessing = false;
};

/**
 * Process a single job
 */
const processJob = async (job) => {
  job.status = JobStatus.PROCESSING;
  job.startedAt = new Date().toISOString();
  jobEvents.emit('jobStarted', { jobId: job.id });

  logger.info({ jobId: job.id }, 'Processing batch job');

  const prisma = getPrisma();

  for (let i = 0; i < job.codes.length; i++) {
    const codeItem = job.codes[i];

    // Check if job was cancelled
    if (job.status === JobStatus.CANCELLED) {
      logger.info({ jobId: job.id }, 'Job cancelled');
      break;
    }

    codeItem.status = 'processing';

    try {
      // Fetch the NAMASTE code
      const namasteCode = await prisma.namasteCode.findFirst({
        where: {
          code: codeItem.code,
          system: codeItem.system.toUpperCase(),
        },
      });

      if (!namasteCode) {
        throw new Error(`Code ${codeItem.code} not found in ${codeItem.system}`);
      }

      // Run mapping
      const result = await mapNamasteToTm2(namasteCode);
      
      codeItem.status = 'completed';
      codeItem.result = {
        success: result.success,
        tm2Code: result.tm2Code,
        tm2Title: result.tm2Title,
        equivalence: result.equivalence,
        confidence: result.confidence,
        reasoning: result.reasoning,
      };

      job.progress.successful++;
      recordMappingMetrics(result);

      // Save mapping to database if requested
      if (job.saveResults && result.success && result.tm2Code) {
        const tm2Code = await prisma.tm2Code.findFirst({
          where: { code: result.tm2Code },
        });

        if (tm2Code) {
          await prisma.mapping.upsert({
            where: {
              namasteCodeId_tm2CodeId: {
                namasteCodeId: namasteCode.id,
                tm2CodeId: tm2Code.id,
              },
            },
            update: {
              equivalence: result.equivalence,
              confidence: result.confidence,
              mappingSource: 'AI_VALIDATED',
              reasoning: result.reasoning,
            },
            create: {
              namasteCodeId: namasteCode.id,
              tm2CodeId: tm2Code.id,
              equivalence: result.equivalence,
              confidence: result.confidence,
              mappingSource: 'AI_VALIDATED',
              reasoning: result.reasoning,
            },
          });
        }
      }

    } catch (error) {
      codeItem.status = 'failed';
      codeItem.error = error.message;
      job.progress.failed++;
      logger.error({ jobId: job.id, code: codeItem.code, error: error.message }, 'Code mapping failed');
    }

    job.progress.completed++;
    job.progress.percentage = Math.round((job.progress.completed / job.progress.total) * 100);

    // Emit progress update
    jobEvents.emit('jobProgress', {
      jobId: job.id,
      progress: job.progress,
    });

    // Small delay between mappings to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Mark job as completed
  job.status = job.progress.failed === job.progress.total ? JobStatus.FAILED : JobStatus.COMPLETED;
  job.completedAt = new Date().toISOString();

  logger.info({
    jobId: job.id,
    status: job.status,
    progress: job.progress,
  }, 'Batch job completed');

  jobEvents.emit('jobCompleted', {
    jobId: job.id,
    status: job.status,
    progress: job.progress,
  });

  // Send callback if configured
  if (job.callbackUrl) {
    sendCallback(job);
  }
};

/**
 * Send webhook callback
 */
const sendCallback = async (job) => {
  try {
    await fetch(job.callbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        completedAt: job.completedAt,
      }),
    });
    logger.info({ jobId: job.id, url: job.callbackUrl }, 'Callback sent');
  } catch (error) {
    logger.error({ jobId: job.id, error: error.message }, 'Callback failed');
  }
};

/**
 * Get job status
 */
export const getJobStatus = (jobId) => {
  const job = jobs.get(jobId);
  if (!job) return null;

  return {
    id: job.id,
    status: job.status,
    progress: job.progress,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    error: job.error,
  };
};

/**
 * Get job results
 */
export const getJobResults = (jobId) => {
  const job = jobs.get(jobId);
  if (!job) return null;

  return {
    id: job.id,
    status: job.status,
    progress: job.progress,
    results: job.codes.map(c => ({
      code: c.code,
      system: c.system,
      status: c.status,
      result: c.result,
      error: c.error,
    })),
    createdAt: job.createdAt,
    completedAt: job.completedAt,
  };
};

/**
 * Cancel a job
 */
export const cancelJob = (jobId) => {
  const job = jobs.get(jobId);
  if (!job) return false;

  if (job.status === JobStatus.PENDING || job.status === JobStatus.PROCESSING) {
    job.status = JobStatus.CANCELLED;
    job.completedAt = new Date().toISOString();
    logger.info({ jobId }, 'Job cancelled');
    return true;
  }

  return false;
};

/**
 * List all jobs
 */
export const listJobs = (options = {}) => {
  const { status, userId, limit = 20, offset = 0 } = options;

  let jobList = Array.from(jobs.values());

  if (status) {
    jobList = jobList.filter(j => j.status === status);
  }

  if (userId) {
    jobList = jobList.filter(j => j.userId === userId);
  }

  // Sort by creation time (newest first)
  jobList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return {
    jobs: jobList.slice(offset, offset + limit).map(j => ({
      id: j.id,
      status: j.status,
      progress: j.progress,
      createdAt: j.createdAt,
      completedAt: j.completedAt,
    })),
    total: jobList.length,
    limit,
    offset,
  };
};

/**
 * Clean up old completed jobs
 */
export const cleanupOldJobs = (maxAgeMs = 86400000) => { // 24 hours
  const cutoff = Date.now() - maxAgeMs;
  let cleaned = 0;

  for (const [jobId, job] of jobs.entries()) {
    if (job.completedAt && new Date(job.completedAt).getTime() < cutoff) {
      jobs.delete(jobId);
      cleaned++;
    }
  }

  logger.info({ cleaned }, 'Old jobs cleaned up');
  return cleaned;
};

// Clean up old jobs every hour
setInterval(() => cleanupOldJobs(), 3600000);

/**
 * Get queue statistics
 */
export const getQueueStats = () => ({
  queueLength: jobQueue.length,
  activeJobs,
  maxConcurrent,
  totalJobs: jobs.size,
  byStatus: {
    pending: Array.from(jobs.values()).filter(j => j.status === JobStatus.PENDING).length,
    processing: Array.from(jobs.values()).filter(j => j.status === JobStatus.PROCESSING).length,
    completed: Array.from(jobs.values()).filter(j => j.status === JobStatus.COMPLETED).length,
    failed: Array.from(jobs.values()).filter(j => j.status === JobStatus.FAILED).length,
    cancelled: Array.from(jobs.values()).filter(j => j.status === JobStatus.CANCELLED).length,
  },
});

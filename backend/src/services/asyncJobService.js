import AsyncJob from '../models/asyncJobSchema.js';

const processors = new Map();
let schedulerHandle = null;
let schedulerRunning = false;

export const registerJobProcessor = (jobType, processor) => {
  if (typeof processor === 'function') {
    processors.set(jobType, processor);
  }
};

export const enqueueJob = async ({ queue, type, payload = {}, runAt = new Date(), maxAttempts = 3 }) => {
  const job = await AsyncJob.create({
    queue,
    type,
    payload,
    runAt,
    maxAttempts,
    status: 'queued',
  });
  return job;
};

const processNextJob = async () => {
  if (schedulerRunning) return;
  schedulerRunning = true;

  try {
    const now = new Date();
    const job = await AsyncJob.findOneAndUpdate(
      {
        status: 'queued',
        runAt: { $lte: now },
      },
      { status: 'running', $inc: { attempts: 1 } },
      { sort: { runAt: 1 }, new: true }
    );

    if (!job) return;

    const processor = processors.get(job.type);
    if (!processor) {
      job.status = 'failed';
      job.lastError = `No processor registered for job type: ${job.type}`;
      await job.save();
      return;
    }

    try {
      const result = await processor(job.payload, job);
      job.status = 'completed';
      job.result = result || {};
      job.lastError = '';
      await job.save();
    } catch (error) {
      const exceeded = job.attempts >= job.maxAttempts;
      job.status = exceeded ? 'failed' : 'queued';
      job.lastError = error.message;
      if (!exceeded) {
        job.runAt = new Date(Date.now() + 60 * 1000);
      }
      await job.save();
    }
  } finally {
    schedulerRunning = false;
  }
};

export const startAsyncJobScheduler = () => {
  if (schedulerHandle) return;
  schedulerHandle = setInterval(() => {
    processNextJob().catch((error) => {
      console.error('Async job scheduler error:', error.message);
    });
  }, 5000);
};

export const stopAsyncJobScheduler = () => {
  if (schedulerHandle) {
    clearInterval(schedulerHandle);
    schedulerHandle = null;
  }
};

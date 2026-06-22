import cron from 'node-cron';
import { expireStaleFloatingCredits } from './holidayCreditService.js';
import { getIstDayKey } from '../utils/timezoneUtils.js';

/**
 * Tracks the most recent IST calendar date for which the lazy daily
 * guard has fired `expireStaleFloatingCredits`. Module-level state so that all
 * incoming requests share the same gate within a single process boot.
 */
let lastRunDate = null;

/**
 * Register the daily scheduled job that expires stale floating holiday
 * credits (whose assigned holiday dates have passed).
 *
 * Cron expression `5 0 * * *` fires at 00:05 IST every day. The
 * timezone is pinned to `Asia/Kolkata` so the schedule is stable regardless of
 * the host's local timezone. Errors thrown by `expireStaleFloatingCredits` are
 * caught and logged so a single failed run does not crash the cron worker.
 *
 * @returns {void}
 */
export function registerScheduledJobs() {
  cron.schedule(
    '5 0 * * *',
    () => {
      expireStaleFloatingCredits().catch((err) => {
        console.error('[scheduledJobs] expireStaleFloatingCredits cron failed:', err);
      });
    },
    { timezone: 'Asia/Kolkata' }
  );
  console.log('[scheduledJobs] registered daily expiry cron (00:05 IST daily)');
}

/**
 * Express middleware that lazily fires `expireStaleFloatingCredits` the first
 * time a request is observed on a new IST date.
 *
 * Behaviour:
 *   - Computes the current IST date key on every request.
 *   - When `lastRunDate !== todayKey`, sets `lastRunDate = todayKey`
 *     FIRST (to prevent a thundering herd of concurrent requests all firing
 *     the expiry), then dispatches `expireStaleFloatingCredits` fire-and-forget.
 *   - `next()` is always invoked immediately. The expiry job MUST NOT block
 *     the request — it runs asynchronously off the request lifecycle.
 *
 * @param {import('express').Request} _req
 * @param {import('express').Response} _res
 * @param {import('express').NextFunction} next
 * @returns {void}
 */
export function yearBoundaryGuard(_req, _res, next) {
  const todayKey = getIstDayKey(new Date());
  if (lastRunDate !== todayKey) {
    // Set the gate FIRST so concurrent requests within the same boot do not
    // each dispatch their own expiry job.
    lastRunDate = todayKey;
    expireStaleFloatingCredits().catch((err) => {
      console.error('[scheduledJobs] expireStaleFloatingCredits guard failed:', err);
    });
  }
  next();
}

export default {
  registerScheduledJobs,
  yearBoundaryGuard,
};

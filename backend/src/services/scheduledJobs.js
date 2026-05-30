import cron from 'node-cron';
import { expireStaleFloatingCredits } from './holidayCreditService.js';
import { toIstDate } from '../utils/timezoneUtils.js';

/**
 * Tracks the most recent IST calendar year for which the lazy year-boundary
 * guard has fired `expireStaleFloatingCredits`. Module-level state so that all
 * incoming requests share the same gate within a single process boot.
 */
let lastRunYear = null;

/**
 * Register the year-end scheduled job that expires stale floating holiday
 * credits.
 *
 * Cron expression `5 0 1 1 *` fires at 00:05 IST on January 1 every year. The
 * timezone is pinned to `Asia/Kolkata` so the schedule is stable regardless of
 * the host's local timezone. Errors thrown by `expireStaleFloatingCredits` are
 * caught and logged so a single failed run does not crash the cron worker — the
 * `yearBoundaryGuard` middleware will pick up the slack on the next request.
 *
 * Idempotency comes from the underlying service: it only matches `available`
 * credits where `year < currentIstYear`, so re-runs are safe.
 *
 * @returns {void}
 */
export function registerScheduledJobs() {
  cron.schedule(
    '5 0 1 1 *',
    () => {
      expireStaleFloatingCredits().catch((err) => {
        console.error('[scheduledJobs] expireStaleFloatingCredits cron failed:', err);
      });
    },
    { timezone: 'Asia/Kolkata' }
  );
  console.log('[scheduledJobs] registered year-boundary expiry cron (00:05 IST on Jan 1)');
}

/**
 * Express middleware that lazily fires `expireStaleFloatingCredits` the first
 * time a request is observed in a new IST calendar year.
 *
 * Behaviour:
 *   - Computes the current IST year on every request.
 *   - When `lastRunYear !== currentYear`, sets `lastRunYear = currentYear`
 *     FIRST (to prevent a thundering herd of concurrent requests all firing
 *     the expiry), then dispatches `expireStaleFloatingCredits` fire-and-forget.
 *   - `next()` is always invoked immediately. The expiry job MUST NOT block
 *     the request — it runs asynchronously off the request lifecycle.
 *
 * Combined with `registerScheduledJobs`, this makes the expiry process
 * resilient: cron handles the scheduled run, and the guard handles any
 * scenario where the cron worker missed the boundary (server down, job
 * failure, etc.).
 *
 * @param {import('express').Request} _req
 * @param {import('express').Response} _res
 * @param {import('express').NextFunction} next
 * @returns {void}
 */
export function yearBoundaryGuard(_req, _res, next) {
  const currentYear = toIstDate(new Date()).getUTCFullYear();
  if (lastRunYear !== currentYear) {
    // Set the gate FIRST so concurrent requests within the same boot do not
    // each dispatch their own expiry job.
    lastRunYear = currentYear;
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

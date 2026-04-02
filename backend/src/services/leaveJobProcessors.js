import { registerJobProcessor } from './asyncJobService.js';
import { runLeaveAccrual, runYearEndCarryForward } from './leavePolicyService.js';

export const registerLeaveProcessors = () => {
  registerJobProcessor('leave:accrual-run', async (payload) => {
    const run = await runLeaveAccrual({
      month: payload.month,
      year: payload.year,
      initiatedBy: payload.initiatedBy || null,
    });

    return {
      runId: run._id,
      month: run.month,
      year: run.year,
      status: run.status,
      employeesProcessed: run.summary?.employeesProcessed || 0,
      balancesUpdated: run.summary?.balancesUpdated || 0,
    };
  });

  registerJobProcessor('leave:year-end-carry-forward', async (payload) => {
    const run = await runYearEndCarryForward({
      sourceYear: payload.sourceYear,
      initiatedBy: payload.initiatedBy || null,
    });

    return {
      runId: run._id,
      sourceYear: run.sourceYear,
      targetYear: run.targetYear,
      status: run.status,
      balancesProcessed: run.summary?.balancesProcessed || 0,
      carriedForwardDays: run.summary?.carriedForwardDays || 0,
      lapsedDays: run.summary?.lapsedDays || 0,
    };
  });
};

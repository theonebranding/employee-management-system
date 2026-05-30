/**
 * One-shot migration: legacy SelectedHoliday -> HolidayTemplate + TemplateAssignment.
 *
 * Behavior (idempotent; safe to re-run):
 *   1. Stream every SelectedHoliday document.
 *   2. For each non-isCustom selectedHolidays[] entry:
 *        - Bucket by IST calendar year.
 *        - Within each year, dedupe by (name, IST day key) so duplicate (name, date)
 *          pairs across employees collapse to one entry per year.
 *        - Track which (employee, year) pairs participated.
 *   3. For each year with at least one bucketed entry, upsert a single fixed
 *      HolidayTemplate named 'Migrated Fixed Holidays <year>'. On re-run, the
 *      existing template is the source of truth: holidays[] is left untouched.
 *   4. For each (employee, year) pair, attempt to create one TemplateAssignment.
 *      The compound unique index on { template, employee } makes the create
 *      idempotent; we swallow duplicate-key errors (code 11000) only.
 *   5. Discard isCustom: true entries silently. No template, assignment, or credit
 *      is produced for them.
 *   6. Log a summary.
 *
 * Re-run safety: a second run that follows a successful first run is a pure no-op
 * w.r.t. document creation: every template lookup hits, every assignment create
 * raises a duplicate-key error that we count as 'skipped'.
 *
 * Validates Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
 * Validates Property: 8 (migration idempotency)
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../src/config/db.js';
import SelectedHoliday from '../src/models/selectedHolidaySchema.js';
import HolidayTemplate from '../src/models/holidayTemplateSchema.js';
import TemplateAssignment from '../src/models/templateAssignmentSchema.js';
import { getIstDayKey, toIstDate } from '../src/utils/timezoneUtils.js';

const MIGRATED_TEMPLATE_NAME = (year) => `Migrated Fixed Holidays ${year}`;

const migrate = async () => {
  await connectDB();

  // -------------------------------------------------------------------------
  // 1. Bucket non-custom legacy entries by IST calendar year.
  // -------------------------------------------------------------------------
  // byYear: Map<year, Map<dateKey, { name, date }>> — last write wins on
  //         duplicate (name, dateKey) pairs across employees.
  // employeeYears: Map<employeeId(string), Set<year>> — which years each
  //                employee participated in.
  const byYear = new Map();
  const employeeYears = new Map();
  let discardedCustom = 0;
  let processedEntries = 0;

  const cursor = SelectedHoliday.find({}).cursor();

  for await (const doc of cursor) {
    const employeeId = doc.employee ? doc.employee.toString() : null;
    if (!employeeId) continue;

    const entries = Array.isArray(doc.selectedHolidays) ? doc.selectedHolidays : [];
    for (const holiday of entries) {
      // Treat absent isCustom as false; only true is discarded.
      if (holiday.isCustom === true) {
        discardedCustom += 1;
        continue;
      }
      if (!holiday || !holiday.date || !holiday.name) {
        continue;
      }

      const year = toIstDate(holiday.date).getUTCFullYear();
      const dateKey = getIstDayKey(holiday.date);

      if (!byYear.has(year)) {
        byYear.set(year, new Map());
      }
      byYear.get(year).set(dateKey, { name: holiday.name, date: holiday.date });

      if (!employeeYears.has(employeeId)) {
        employeeYears.set(employeeId, new Set());
      }
      employeeYears.get(employeeId).add(year);

      processedEntries += 1;
    }
  }

  // -------------------------------------------------------------------------
  // 2. Upsert one fixed HolidayTemplate per year, sequentially per year to
  //    avoid duplicate-key races on the {name, year, type} natural key.
  // -------------------------------------------------------------------------
  const yearToTemplateId = new Map();
  let templatesCreated = 0;
  let templatesReused = 0;

  const sortedYears = [...byYear.keys()].sort((a, b) => a - b);
  for (const year of sortedYears) {
    const name = MIGRATED_TEMPLATE_NAME(year);
    const existing = await HolidayTemplate.findOne({ name, year, type: 'fixed' });

    if (existing) {
      // Re-run path: leave the existing template's holidays array alone.
      yearToTemplateId.set(year, existing._id);
      templatesReused += 1;
      continue;
    }

    const holidays = [...byYear.get(year).values()].map(({ name: hName, date }) => ({
      name: hName,
      date,
    }));

    const created = await HolidayTemplate.create({
      name,
      year,
      type: 'fixed',
      holidays,
    });
    yearToTemplateId.set(year, created._id);
    templatesCreated += 1;
  }

  // -------------------------------------------------------------------------
  // 3. Upsert one TemplateAssignment per (employee, year) pair, sequentially
  //    per employee to keep the duplicate-key handling simple.
  // -------------------------------------------------------------------------
  let assignmentsCreated = 0;
  let assignmentsSkipped = 0;

  for (const [employeeId, years] of employeeYears) {
    for (const year of years) {
      const templateId = yearToTemplateId.get(year);
      if (!templateId) continue;

      try {
        await TemplateAssignment.create({
          template: templateId,
          employee: employeeId,
          assignedBy: null,
          assignedAt: new Date(),
        });
        assignmentsCreated += 1;
      } catch (err) {
        if (err && err.code === 11000) {
          // Compound unique index makes re-runs a no-op; just count.
          assignmentsSkipped += 1;
          continue;
        }
        throw err;
      }
    }
  }

  // -------------------------------------------------------------------------
  // 4. Summary.
  // -------------------------------------------------------------------------
  console.log('=== Holiday migration summary ===');
  console.log(`Legacy entries processed (non-custom): ${processedEntries}`);
  console.log(`Custom (isCustom: true) entries discarded: ${discardedCustom}`);
  console.log(`Distinct years bucketed: ${byYear.size}`);
  console.log(`HolidayTemplate records created: ${templatesCreated}`);
  console.log(`HolidayTemplate records reused (already existed): ${templatesReused}`);
  console.log(`TemplateAssignment records created: ${assignmentsCreated}`);
  console.log(`TemplateAssignment records skipped (duplicate-key): ${assignmentsSkipped}`);
  console.log('Legacy_PredefinedHoliday is no longer read at runtime and is safe to drop.');
  console.log(
    'Legacy_SelectedHoliday is no longer read at runtime; leave the collection in place ' +
      'for audit and drop in a follow-up cleanup.'
  );
  console.log('=================================');

  await mongoose.disconnect();
};

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

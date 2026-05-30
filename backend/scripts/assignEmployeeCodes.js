import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Employee from '../src/models/employeeSchema.js';
import EmployeeSequence from '../src/models/employeeSequenceSchema.js';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL || process.env.MONGO_URL;
console.log('MONGO_URL:', MONGO_URL);
const YEAR_SUFFIX = '25';

async function connect() {
  await mongoose.connect(MONGO_URL);
}

function getInitials(name = '') {
  const normalized = name.trim().replace(/\s+/g, ' ');
  return normalized
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase())
    .join('')
    .slice(0, 3);
}

async function assignCodes({ dryRun = false } = {}) {
  const filter = {
    $or: [{ employeeCode: { $exists: false } }, { employeeCode: null }, { employeeCode: '' }],
  };
  console.log('Using MONGO_URL:', MONGO_URL);
  console.log('Connected DB:', mongoose.connection.db.databaseName);

  const missingCount = await Employee.countDocuments(filter);
  console.log('Missing by filter:', missingCount);

  const cursor = Employee.find(filter).cursor();
  let count = 0;

  for await (const emp of cursor) {
    const seqDoc = await EmployeeSequence.findOneAndUpdate(
      { name: 'employee_code' },
      { $inc: { sequence: 1 } },
      { new: true, upsert: true }
    );
    const initials = getInitials(emp.name || '');
    const sequenceNumber = String(seqDoc.sequence).padStart(3, '0');
    const code = `${initials}${YEAR_SUFFIX}${sequenceNumber}`;

    if (dryRun) {
      console.log(`[DRY RUN] Would assign ${code} to ${emp._id} (${emp.email || emp.name})`);
    } else {
      emp.employeeCode = code;
      await emp.save();
      console.log(`Assigned ${code} to ${emp._id} (${emp.email || emp.name})`);
    }
    count++;
  }

  console.log(`Processed ${count} employees.`);
}

async function main() {
  try {
    await connect();
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    await assignCodes({ dryRun });
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

main();

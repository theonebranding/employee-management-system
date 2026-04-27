import mongoose from 'mongoose';

const employeeMasterOptionsSchema = new mongoose.Schema(
  {
    departments: {
      type: [String],
      default: [
        'Engineering',
        'Human Resources',
        'Finance',
        'Sales',
        'Marketing',
        'Operations',
        'Support',
      ],
    },
    designations: {
      type: [String],
      default: [
        'Intern',
        'Associate',
        'Software Engineer',
        'Senior Software Engineer',
        'Team Lead',
        'Manager',
        'Senior Manager',
      ],
    },
  },
  { timestamps: true }
);

const EmployeeMasterOptions = mongoose.model('EmployeeMasterOptions', employeeMasterOptionsSchema);
export default EmployeeMasterOptions;

import Employee from '../models/employeeSchema.js';
import EmployeeSequence from '../models/employeeSequenceSchema.js';
import bcrypt from 'bcrypt';
import { forfeitEmployeeCredits } from '../services/holidayCreditService.js';
// import { sendInvitationRequestEmail } from '../services/emailService.js';

// Statuses that represent an employee leaving the company. When an employee
// transitions into one of these states (or is hard-deleted), all of their
// `available` floating holiday credits must be forfeited (Requirement 12).
const TERMINATED_STATUSES = ['terminated', 'inactive'];
const isTerminatedStatus = status => TERMINATED_STATUSES.includes(status);

// Wrap forfeitEmployeeCredits so a forfeit failure never rolls back the
// underlying employee mutation. The service is idempotent (safe to call again
// later), so logging-and-continuing is the correct behaviour here.
const safeForfeitEmployeeCredits = async employeeId => {
  try {
    await forfeitEmployeeCredits(employeeId);
  } catch (err) {
    console.error(
      'Failed to forfeit holiday credits for employee',
      employeeId?.toString?.() ?? employeeId,
      err
    );
  }
};

const PHONE_REGEX = /^[0-9]{10,15}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AADHAR_REGEX = /^[0-9]{12}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const PIN_REGEX = /^[0-9]{6}$/;
const ACCOUNT_REGEX = /^[0-9]{8,20}$/;
const NAME_REGEX = /^[A-Za-z][A-Za-z\s.'-]{1,99}$/;
const ALLOWED_ONBOARDING_STATUS = ['draft', 'onboarding_complete', 'payroll_ready', 'active'];
const ALLOWED_EMPLOYMENT_TYPES = ['Full Time', 'Part Time', 'Contract', 'Intern'];

const normalizeText = value => (value === undefined || value === null ? value : String(value).trim());

const validateEmployeeFields = (payload, { isUpdate = false } = {}) => {
  const errors = [];
  const normalized = { ...payload };
  const has = field => payload[field] !== undefined;

  if (!isUpdate || has('name')) {
    const value = normalizeText(payload.name);
    if (!value) errors.push('Name is required');
    else if (!NAME_REGEX.test(value)) errors.push('Name format is invalid');
    normalized.name = value;
  }

  if (!isUpdate || has('email')) {
    const value = normalizeText(payload.email)?.toLowerCase();
    if (!value) errors.push('Email is required');
    else if (!EMAIL_REGEX.test(value)) errors.push('Email format is invalid');
    normalized.email = value;
  }

  if (!isUpdate || has('phoneNumber')) {
    const value = normalizeText(payload.phoneNumber);
    if (!value) errors.push('Phone number is required');
    else if (!PHONE_REGEX.test(value)) errors.push('Phone number must be 10-15 digits');
    normalized.phoneNumber = value;
  }

  if (has('emergencyContactPhone')) {
    const value = normalizeText(payload.emergencyContactPhone);
    if (value && !PHONE_REGEX.test(value)) {
      errors.push('Emergency contact phone must be 10-15 digits');
    }
    normalized.emergencyContactPhone = value || '';
  }

  if (has('aadharNumber')) {
    const value = normalizeText(payload.aadharNumber);
    if (value && !AADHAR_REGEX.test(value)) errors.push('Aadhar must be 12 digits');
    normalized.aadharNumber = value || '';
  }

  if (has('panNumber')) {
    const value = normalizeText(payload.panNumber)?.toUpperCase();
    if (value && !PAN_REGEX.test(value)) errors.push('PAN format is invalid');
    normalized.panNumber = value || '';
  }

  if (has('ifscCode')) {
    const value = normalizeText(payload.ifscCode)?.toUpperCase();
    if (value && !IFSC_REGEX.test(value)) errors.push('IFSC format is invalid');
    normalized.ifscCode = value || '';
  }

  if (has('pinCode')) {
    const value = normalizeText(payload.pinCode);
    if (value && !PIN_REGEX.test(value)) errors.push('Pin code must be 6 digits');
    normalized.pinCode = value || '';
  }

  if (has('bankAccountNumber')) {
    const value = normalizeText(payload.bankAccountNumber);
    if (value && !ACCOUNT_REGEX.test(value)) errors.push('Bank account number must be 8-20 digits');
    normalized.bankAccountNumber = value || '';
  }

  if (has('dateofBirth')) {
    const raw = normalizeText(payload.dateofBirth);
    if (raw) {
      const dob = new Date(raw);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      if (Number.isNaN(dob.getTime()) || dob >= now) {
        errors.push('Date of birth must be a valid past date');
      } else {
        normalized.dateofBirth = dob;
      }
    } else {
      normalized.dateofBirth = undefined;
    }
  }

  if (has('joinedDate')) {
    const raw = normalizeText(payload.joinedDate);
    if (raw) {
      const joined = new Date(raw);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      if (Number.isNaN(joined.getTime()) || joined > now) {
        errors.push('Joining date must be valid and cannot be in future');
      } else {
        normalized.joinedDate = joined;
      }
    } else {
      normalized.joinedDate = undefined;
    }
  }

  if (has('employmentType')) {
    const value = normalizeText(payload.employmentType);
    if (value && !ALLOWED_EMPLOYMENT_TYPES.includes(value)) {
      errors.push('Employment type is invalid');
    }
    normalized.employmentType = value || '';
  }

  if (has('onboardingStatus')) {
    const value = normalizeText(payload.onboardingStatus);
    if (value && !ALLOWED_ONBOARDING_STATUS.includes(value)) {
      errors.push('Onboarding status is invalid');
    }
    normalized.onboardingStatus = value || 'draft';
  }

  [
    'department',
    'designation',
    'workLocation',
    'bankName',
    'branchName',
    'address',
    'state',
    'city',
    'district',
    'emergencyContactName',
  ].forEach(field => {
    if (has(field)) normalized[field] = normalizeText(payload[field]) || '';
  });

  return { errors, normalized };
};

export const addEmployee = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phoneNumber,
      department,
      designation,
      employmentType,
      workLocation,
      joinedDate,
      dateofBirth,
      aadharNumber,
      panNumber,
      bankName,
      branchName,
      bankAccountNumber,
      ifscCode,
      address,
      state,
      city,
      district,
      pinCode,
      emergencyContactName,
      emergencyContactPhone,
      onboardingStatus,
    } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }
    const { errors, normalized } = validateEmployeeFields(
      {
        name,
        email,
        phoneNumber,
        department,
        designation,
        employmentType,
        workLocation,
        joinedDate,
        dateofBirth,
        aadharNumber,
        panNumber,
        bankName,
        branchName,
        bankAccountNumber,
        ifscCode,
        address,
        state,
        city,
        district,
        pinCode,
        emergencyContactName,
        emergencyContactPhone,
        onboardingStatus,
      },
      { isUpdate: false }
    );
    if (errors.length) {
      return res.status(400).json({ message: errors[0], errors });
    }

    // Check if the employee already exists (by email or phone)
    const duplicateChecks = [{ email: normalized.email }, { phoneNumber: normalized.phoneNumber }];
    if (normalized.panNumber) duplicateChecks.push({ panNumber: normalized.panNumber });
    if (normalized.aadharNumber) duplicateChecks.push({ aadharNumber: normalized.aadharNumber });
    if (normalized.bankAccountNumber) duplicateChecks.push({ bankAccountNumber: normalized.bankAccountNumber });

    const employeeExists = await Employee.findOne({
      $or: duplicateChecks,
    });

    if (employeeExists) {
      return res
        .status(400)
        .json({ message: 'Employee with this email or phone number already exists' });
    }

    // Hash the password using bcrypt with salt 10
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const normalizedName = normalized.name.trim().replace(/\s+/g, ' ');
    const initials = normalizedName
      .split(' ')
      .filter(Boolean)
      .map(part => part[0].toUpperCase())
      .join('')
      .slice(0, 3);
    const yearSuffix = new Date().getFullYear().toString().slice(-2);
    const sequenceDoc = await EmployeeSequence.findOneAndUpdate(
      { name: 'employee_code' },
      { $inc: { sequence: 1 } },
      { new: true, upsert: true }
    );
    const sequenceNumber = String(sequenceDoc.sequence).padStart(3, '0');
    const employeeCode = `${initials}${yearSuffix}${sequenceNumber}`;

    // Create a new employee
    const employee = new Employee({
      name: normalizedName,
      employeeCode,
      email: normalized.email,
      password: hashedPassword, // Store the hashed password
      phoneNumber: normalized.phoneNumber,
      department: normalized.department,
      designation: normalized.designation,
      employmentType: normalized.employmentType,
      workLocation: normalized.workLocation,
      joinedDate: normalized.joinedDate,
      dateofBirth: normalized.dateofBirth,
      aadharNumber: normalized.aadharNumber,
      panNumber: normalized.panNumber,
      bankName: normalized.bankName,
      branchName: normalized.branchName,
      bankAccountNumber: normalized.bankAccountNumber,
      ifscCode: normalized.ifscCode,
      address: normalized.address,
      state: normalized.state,
      city: normalized.city,
      district: normalized.district,
      pinCode: normalized.pinCode,
      emergencyContactName: normalized.emergencyContactName,
      emergencyContactPhone: normalized.emergencyContactPhone,
      onboardingStatus: normalized.onboardingStatus || 'draft',
    });
    console.log('New Employee Data:', employee);

    // Send invitation email

    // await sendInvitationRequestEmail(email);
    // console.log('Invitation email sent to:', email);

    await employee.save();

    return res.status(201).json({ message: 'Employee added successfully', employee });
  } catch (error) {
    return res.status(500).json({ message: 'Error adding employee', error: error.message });
  }
};

export const updateEmployee = async (req, res) => {
  try {
    if (!req.user || !req.params.id) {
      return res.status(401).json({ message: 'Unauthorized: Invalid or missing token' });
    }

    const updateFields = req.body;
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    const restrictedFields = [
      'otp',
      'otpExpires',
      'role',
      '_id',
      'isVerified',
      'createdAt',
      'salary',
    ];
    const updates = Object.keys(updateFields).reduce((acc, field) => {
      if (!restrictedFields.includes(field)) {
        acc[field] = updateFields[field];
      }
      return acc;
    }, {});

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    const { errors, normalized } = validateEmployeeFields(updates, { isUpdate: true });
    if (errors.length) {
      return res.status(400).json({ message: errors[0], errors });
    }

    const duplicateChecks = [];
    if (normalized.email) duplicateChecks.push({ email: normalized.email });
    if (normalized.phoneNumber) duplicateChecks.push({ phoneNumber: normalized.phoneNumber });
    if (normalized.panNumber) duplicateChecks.push({ panNumber: normalized.panNumber });
    if (normalized.aadharNumber) duplicateChecks.push({ aadharNumber: normalized.aadharNumber });
    if (normalized.bankAccountNumber) duplicateChecks.push({ bankAccountNumber: normalized.bankAccountNumber });

    if (duplicateChecks.length) {
      const existingEmployee = await Employee.findOne({
        _id: { $ne: req.params.id },
        $or: duplicateChecks,
      }).select('_id');
      if (existingEmployee) {
        return res.status(400).json({ message: 'Another employee already uses one of these details' });
      }
    }

    // Capture previous onboardingStatus so we can detect a transition into
    // `terminated` / `inactive` and trigger the holiday-credit forfeit hook
    // exactly once per transition (Requirement 12.1).
    const previousEmployee = await Employee.findById(req.params.id).select('onboardingStatus');
    if (!previousEmployee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    const previousStatus = previousEmployee.onboardingStatus;

    const updatedEmployee = await Employee.findByIdAndUpdate(
      req.params.id, // Use the employee ID from params
      { $set: normalized },
      { new: true, runValidators: true }
    ).select('-isVerified -otp -otpExpires -createdAt -updatedAt -role -password');

    if (!updatedEmployee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Forfeit available holiday credits only on the boundary transition
    // (non-terminated -> terminated/inactive). Re-saving an already-terminated
    // employee must not re-fire the hook.
    if (
      isTerminatedStatus(updatedEmployee.onboardingStatus) &&
      !isTerminatedStatus(previousStatus)
    ) {
      await safeForfeitEmployeeCredits(updatedEmployee._id);
    }

    res.status(200).json({
      message: 'Employee data updated successfully',
      employee: updatedEmployee,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error updating employee data', error: err.message });
  }
};

// Delete an employee by ID

export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: 'Bad Request: No employee ID provided' });
    }

    // Find and delete the employee in one step
    const deletedEmployee = await Employee.findByIdAndDelete(id);

    if (!deletedEmployee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Hard-delete is the effective termination path in this system; forfeit
    // any remaining `available` holiday credits so they cannot be redeemed
    // post-departure (Requirement 12.1).
    await safeForfeitEmployeeCredits(deletedEmployee._id);

    return res.status(200).json({ message: 'Employee deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Error deleting employee', error: error.message });
  }
};

// Delete an employee by employeeCode
export const deleteEmployeeByCode = async (req, res) => {
  try {
    const { employeeCode } = req.params;

    if (!employeeCode) {
      return res.status(400).json({ message: 'Bad Request: No employee code provided' });
    }

    const normalizedCode = employeeCode.trim().toUpperCase();
    const deletedEmployee = await Employee.findOneAndDelete({ employeeCode: normalizedCode });

    if (!deletedEmployee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Same forfeit semantics as deleteEmployee: hard-delete acts as the
    // termination event, so any `available` floating credits are forfeited
    // (Requirement 12.1).
    await safeForfeitEmployeeCredits(deletedEmployee._id);

    return res.status(200).json({ message: 'Employee deleted successfully', employee: deletedEmployee });
  } catch (error) {
    return res.status(500).json({ message: 'Error deleting employee', error: error.message });
  }
};

// Get All Employees
export const getAllEmployees = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Fetch employees with pagination
    const employees = await Employee.find()
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .select('-password -role -otp -otpExpires -isVerified -updatedAt -__v -salary')
      .lean();

    // Get total count of employees for pagination meta
    const totalEmployees = await Employee.countDocuments();

    res.status(200).json({
      message: 'Employee list fetched successfully',
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalEmployees / limit),
        totalEmployees,
        limit,
      },
      employees,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching employee list', error: err.message });
  }
};

// Get my profile employee
export const getMyProfile = async (req, res) => {
  try {
    const { _id } = req.user;

    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Unauthorized: Invalid or missing token' });
    }

    const employee = await Employee.findById(_id).select(
      '-password -isVerified -otp -otpExpires -role -createdAt -updatedAt -__v -salary'
    );

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.status(200).json({ message: 'Employee profile fetched successfully', employee });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching employee profile', error: err.message });
  }
};

// Find employee by id, phoneNumber, name or email
export const getEmployee = async (req, res) => {
  try {
    const { id, email, phoneNumber, name } = req.query;

    // Validate query parameters
    if (!id && !email && !phoneNumber && !name) {
      return res.status(400).json({
        message: 'Please provide at least one of the following: id, email, phoneNumber, or name',
      });
    }

    // Construct a dynamic query object
    const query = {
      $or: [
        id ? { _id: id } : null,
        email ? { email } : null,
        phoneNumber ? { phoneNumber } : null,
        name ? { name: { $regex: name, $options: 'i' } } : null, // Partial case-insensitive match for name
      ].filter(Boolean), // Remove null values
    };

    // Find employee
    const employee = await Employee.findOne(query).select('-password -role -otp -otpExpires');

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.status(200).json({ message: 'Employee fetched successfully', employee });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching employee', error: err.message });
  }
};

// api to add predefined checkin time for employee
export const addPredefinedCheckInTime = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(401).json({ message: 'Unauthorized: INo employee id' });
    }

    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    employee.predefinedCheckInTime = req.body.predefinedCheckInTime;
    await employee.save();

    res.status(200).json({ message: 'Predefined check-in time added successfully', employee });
  } catch (err) {
    res.status(500).json({ message: 'Error adding predefined check-in time', error: err.message });
  }
};

export const addEmployeeDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, type = 'other', fileName = '', mimeType = '', fileData } = req.body;

    if (!id) {
      return res.status(400).json({ message: 'Employee id is required' });
    }

    if (!title || !fileData) {
      return res.status(400).json({ message: 'Document title and file data are required' });
    }

    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    employee.documents.push({
      title,
      type,
      fileName,
      mimeType,
      fileData,
      uploadedAt: new Date(),
    });

    await employee.save();

    return res.status(201).json({
      message: 'Document uploaded successfully',
      documents: employee.documents,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error uploading document', error: error.message });
  }
};

export const deleteEmployeeDocument = async (req, res) => {
  try {
    const { id, documentId } = req.params;

    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    employee.documents = employee.documents.filter(doc => doc._id.toString() !== documentId);
    await employee.save();

    return res.status(200).json({
      message: 'Document deleted successfully',
      documents: employee.documents,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error deleting document', error: error.message });
  }
};

import Employee from '../models/employeeSchema.js';
import bcrypt from 'bcrypt';
// import { sendInvitationRequestEmail } from '../services/emailService.js';

export const addEmployee = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phoneNumber,
      jobRole,
      department,
      team,
      location,
      costCenter,
      manager,
      roleTemplate,
    } = req.body;

    // Check if all required fields are provided
    if (!name || !email || !password || !phoneNumber || !jobRole) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Check if the employee already exists (by email or phone)
    const employeeExists = await Employee.findOne({
      $or: [{ email }, { phoneNumber }],
      isVerified: true,
    });

    if (employeeExists) {
      return res
        .status(400)
        .json({ message: 'Employee with this email or phone number already exists' });
    }

    // Hash the password using bcrypt with salt 10
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create a new employee
    const employee = new Employee({
      name,
      email,
      password: hashedPassword, // Store the hashed password
      phoneNumber,
      jobRole,
      department,
      team,
      location,
      costCenter,
      manager: manager || null,
      roleTemplate,
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
      'roleTemplate',
      'permissions',
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

    const updatedEmployee = await Employee.findByIdAndUpdate(
      req.params.id, // Use the employee ID from params
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-isVerified -otp -otpExpires -createdAt -updatedAt -role -password');

    if (!updatedEmployee) {
      return res.status(404).json({ message: 'Employee not found' });
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

    return res.status(200).json({ message: 'Employee deleted successfully' });
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
    const { department, team, location, costCenter, managerId } = req.query;

    const filters = {};
    if (department) filters.department = department;
    if (team) filters.team = team;
    if (location) filters.location = location;
    if (costCenter) filters.costCenter = costCenter;
    if (managerId) filters.manager = managerId;

    // Fetch employees with pagination
    const employees = await Employee.find(filters)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate('manager', 'name email jobRole department team')
      .select('-password -role -otp -otpExpires -isVerified -createdAt -updatedAt -__v -salary')
      .lean();

    // Get total count of employees for pagination meta
    const totalEmployees = await Employee.countDocuments(filters);

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
    const { id, email, phoneNumber, name, department, team, location, costCenter } = req.query;

    // Validate query parameters
    if (!id && !email && !phoneNumber && !name && !department && !team && !location && !costCenter) {
      return res.status(400).json({
        message:
          'Please provide at least one of the following: id, email, phoneNumber, name, department, team, location, or costCenter',
      });
    }

    // Construct a dynamic query object
    const orFilters = [
      id ? { _id: id } : null,
      email ? { email } : null,
      phoneNumber ? { phoneNumber } : null,
      name ? { name: { $regex: name, $options: 'i' } } : null,
    ].filter(Boolean);

    const query = {};
    if (orFilters.length > 0) {
      query.$or = orFilters;
    }
    if (department) query.department = department;
    if (team) query.team = team;
    if (location) query.location = location;
    if (costCenter) query.costCenter = costCenter;

    // Find employee
    const employee = await Employee.findOne(query)
      .populate('manager', 'name email jobRole')
      .select('-password -role -otp -otpExpires');

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

    employee.documents = employee.documents.filter((doc) => doc._id.toString() !== documentId);
    await employee.save();

    return res.status(200).json({
      message: 'Document deleted successfully',
      documents: employee.documents,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error deleting document', error: error.message });
  }
};

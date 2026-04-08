import Role from '../models/roleSchema.js';

// Get all roles
export const getAllRoles = async (req, res) => {
  try {
    const roles = await Role.find();
    res.status(200).json({ message: 'Roles fetched successfully', roles });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching roles', error: error.message });
  }
};

// Create new role
export const createRole = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Role name is required' });
    }

    const existingRole = await Role.findOne({ name });
    if (existingRole) {
      return res.status(409).json({ message: 'Role already exists' });
    }

    const role = new Role({
      name,
      description,
      permissions: permissions || [],
    });

    await role.save();
    res.status(201).json({ message: 'Role created successfully', role });
  } catch (error) {
    res.status(500).json({ message: 'Error creating role', error: error.message });
  }
};

// Get role by ID
export const getRoleById = async (req, res) => {
  try {
    const { roleId } = req.params;
    const role = await Role.findById(roleId);

    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    res.status(200).json({ message: 'Role fetched successfully', role });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching role', error: error.message });
  }
};

// Update role
export const updateRole = async (req, res) => {
  try {
    const { roleId } = req.params;
    const { name, description, permissions, active } = req.body;

    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    if (name && name !== role.name) {
      const existingRole = await Role.findOne({ name });
      if (existingRole) {
        return res.status(409).json({ message: 'Role name already exists' });
      }
      role.name = name;
    }

    if (description) role.description = description;
    if (permissions) role.permissions = permissions;
    if (active !== undefined) role.active = active;

    await role.save();
    res.status(200).json({ message: 'Role updated successfully', role });
  } catch (error) {
    res.status(500).json({ message: 'Error updating role', error: error.message });
  }
};

// Delete role
export const deleteRole = async (req, res) => {
  try {
    const { roleId } = req.params;

    const role = await Role.findByIdAndDelete(roleId);
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    res.status(200).json({ message: 'Role deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting role', error: error.message });
  }
};

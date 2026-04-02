import OrgUnit from '../models/orgUnitSchema.js';

export const createOrgUnit = async (req, res) => {
  try {
    const { type, code, name, description = '', parent = null, manager = null } = req.body;

    if (!type || !code || !name) {
      return res.status(400).json({ message: 'type, code and name are required' });
    }

    const orgUnit = await OrgUnit.create({
      type,
      code,
      name,
      description,
      parent,
      manager,
    });

    return res.status(201).json({ message: 'Org unit created successfully', orgUnit });
  } catch (error) {
    return res.status(500).json({ message: 'Error creating org unit', error: error.message });
  }
};

export const listOrgUnits = async (req, res) => {
  try {
    const { type, isActive } = req.query;
    const filters = {};
    if (type) filters.type = type;
    if (isActive !== undefined) filters.isActive = isActive === 'true';

    const orgUnits = await OrgUnit.find(filters)
      .sort({ type: 1, name: 1 })
      .populate('parent', 'type code name')
      .populate('manager', 'name email');

    return res.status(200).json({ message: 'Org units fetched successfully', orgUnits });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching org units', error: error.message });
  }
};

export const updateOrgUnit = async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body;

    const orgUnit = await OrgUnit.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    })
      .populate('parent', 'type code name')
      .populate('manager', 'name email');

    if (!orgUnit) {
      return res.status(404).json({ message: 'Org unit not found' });
    }

    return res.status(200).json({ message: 'Org unit updated successfully', orgUnit });
  } catch (error) {
    return res.status(500).json({ message: 'Error updating org unit', error: error.message });
  }
};

export const deleteOrgUnit = async (req, res) => {
  try {
    const { id } = req.params;
    const orgUnit = await OrgUnit.findByIdAndDelete(id);

    if (!orgUnit) {
      return res.status(404).json({ message: 'Org unit not found' });
    }

    return res.status(200).json({ message: 'Org unit deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Error deleting org unit', error: error.message });
  }
};

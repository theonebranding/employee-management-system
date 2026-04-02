import Workflow from '../models/workflowSchema.js';
import WorkflowInstance from '../models/workflowInstanceSchema.js';

export const listWorkflows = async (req, res) => {
  try {
    const workflows = await Workflow.find().sort({ module: 1, key: 1 });
    return res.status(200).json({ message: 'Workflows fetched successfully', workflows });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching workflows', error: error.message });
  }
};

export const listWorkflowInstances = async (req, res) => {
  try {
    const { status, entityType, requester } = req.query;
    const filters = {};

    if (status) filters.status = status;
    if (entityType) filters.entityType = entityType;
    if (requester) filters.requester = requester;

    const instances = await WorkflowInstance.find(filters)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('requester', 'name email roleTemplate');

    return res.status(200).json({ message: 'Workflow instances fetched successfully', instances });
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Error fetching workflow instances', error: error.message });
  }
};

export const getWorkflowInstanceTimeline = async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const instance = await WorkflowInstance.findOne({ entityType, entityId }).populate(
      'requester',
      'name email roleTemplate'
    );

    if (!instance) {
      return res.status(404).json({ message: 'Workflow instance not found' });
    }

    return res.status(200).json({ message: 'Workflow timeline fetched successfully', instance });
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Error fetching workflow timeline', error: error.message });
  }
};

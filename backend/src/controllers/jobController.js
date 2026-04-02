import AsyncJob from '../models/asyncJobSchema.js';

export const listAsyncJobs = async (req, res) => {
  try {
    const { queue, status, type } = req.query;
    const filters = {};
    if (queue) filters.queue = queue;
    if (status) filters.status = status;
    if (type) filters.type = type;

    const jobs = await AsyncJob.find(filters).sort({ createdAt: -1 }).limit(200);
    return res.status(200).json({ message: 'Async jobs fetched successfully', jobs });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching async jobs', error: error.message });
  }
};

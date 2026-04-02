const STORAGE_KEY = 'attendanceOfflineQueue';

const parseQueue = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveQueue = (items) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

export const getAttendanceOfflineQueue = () => parseQueue();

export const enqueueAttendanceAction = (action, payload) => {
  const queue = parseQueue();
  queue.push({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    action,
    payload,
    createdAt: new Date().toISOString(),
  });
  saveQueue(queue);
  return queue.length;
};

export const clearAttendanceQueue = () => {
  saveQueue([]);
};

export const flushAttendanceQueue = async ({ baseUrl, token, onItemProcessed }) => {
  const queue = parseQueue();
  if (!queue.length) return { processed: 0, failed: 0 };

  const remaining = [];
  let processed = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      const response = await fetch(`${baseUrl}/attendance/${item.action}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(item.payload || {}),
      });

      if (!response.ok) {
        failed += 1;
        remaining.push(item);
        continue;
      }

      processed += 1;
      if (typeof onItemProcessed === 'function') {
        await onItemProcessed(item);
      }
    } catch {
      failed += 1;
      remaining.push(item);
    }
  }

  saveQueue(remaining);
  return { processed, failed, remaining: remaining.length };
};

export const getStartOfUtcDay = (inputDate = new Date()) => {
  const date = new Date(inputDate);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

export const getUtcDayKey = (inputDate = new Date()) => {
  return getStartOfUtcDay(inputDate).toISOString().split('T')[0];
};

export const normalizeReportText = (value) => {
  if (typeof value !== 'string') {
    return 'N/A';
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : 'N/A';
};

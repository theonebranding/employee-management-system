const DD_MM_YYYY_REGEX = /^\d{2}-\d{2}-\d{4}$/;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const parseApiDate = (value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  if (ISO_DATE_REGEX.test(value)) {
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (DD_MM_YYYY_REGEX.test(value)) {
    const [day, month, year] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const fallback = new Date(value);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
};

export const toIsoDate = (date) => {
  const resolved = date instanceof Date ? date : parseApiDate(date);
  if (!resolved) return null;
  return resolved.toISOString().split('T')[0];
};

export const getMonthRange = ({ month, year }) => {
  const numericMonth = Number(month);
  const numericYear = Number(year);

  if (!numericMonth || !numericYear || numericMonth < 1 || numericMonth > 12) {
    return null;
  }

  return {
    start: new Date(Date.UTC(numericYear, numericMonth - 1, 1, 0, 0, 0, 0)),
    end: new Date(Date.UTC(numericYear, numericMonth, 0, 23, 59, 59, 999)),
  };
};

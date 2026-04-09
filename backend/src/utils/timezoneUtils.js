const IST_OFFSET_MINUTES = 330;
const IST_OFFSET_MS = IST_OFFSET_MINUTES * 60 * 1000;

export const toIstDate = (inputDate = new Date()) => {
  const date = new Date(inputDate);
  return new Date(date.getTime() + IST_OFFSET_MS);
};

export const getIstDayKey = (inputDate = new Date()) => {
  return toIstDate(inputDate).toISOString().split('T')[0];
};

export const getStartOfIstDay = (inputDate = new Date()) => {
  const ist = toIstDate(inputDate);
  const utcMidnight = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate());
  return new Date(utcMidnight - IST_OFFSET_MS);
};

export const getEndOfIstDay = (inputDate = new Date()) => {
  const start = getStartOfIstDay(inputDate);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
};

export const getIstMonthRange = (month, year) => {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0) - IST_OFFSET_MS);
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999) - IST_OFFSET_MS);
  return { start, end };
};

export const getIstDayStartFromParts = (year, month, day) => {
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - IST_OFFSET_MS);
};

export const getIstDayOfWeek = (inputDate = new Date()) => {
  return toIstDate(inputDate).getUTCDay();
};

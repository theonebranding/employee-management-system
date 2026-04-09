import {
  getIstDayKey as getIstDayKeyUtil,
  getStartOfIstDay as getStartOfIstDayUtil,
  getEndOfIstDay as getEndOfIstDayUtil,
} from './timezoneUtils.js';

export const getStartOfIstDay = (inputDate = new Date()) => getStartOfIstDayUtil(inputDate);

export const getIstDayKey = (inputDate = new Date()) => getIstDayKeyUtil(inputDate);

export const getEndOfIstDay = (inputDate = new Date()) => getEndOfIstDayUtil(inputDate);

export const normalizeReportText = (value) => {
  if (typeof value !== 'string') {
    return 'N/A';
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : 'N/A';
};

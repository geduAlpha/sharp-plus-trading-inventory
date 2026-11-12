/**
 * Date and Time Utilities for Sharp Plus Trading & Inventory
 * Ensures timezone-safe local date calculation, display, and filtering.
 */

/**
 * Returns YYYY-MM-DD for the given Date object in the user's LOCAL calendar.
 * Never uses toISOString() which shifts dates based on UTC midnight.
 */
export const getLocalDateString = (d = new Date()) => {
  if (!d) return '';
  const dateObj = d instanceof Date ? d : new Date(d);
  if (isNaN(dateObj.getTime())) return '';
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Returns YYYY-MM-01 (first day of the current month in local time)
 */
export const getStartOfMonthString = (d = new Date()) => {
  const dateObj = d instanceof Date ? d : new Date(d);
  if (isNaN(dateObj.getTime())) return '';
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
};

/**
 * Returns YYYY-MM-DD of the Monday of the current week in local time
 */
export const getStartOfWeekString = (d = new Date()) => {
  const dateObj = new Date(d);
  const day = dateObj.getDay();
  const diff = dateObj.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(dateObj.setDate(diff));
  return getLocalDateString(monday);
};

/**
 * Returns YYYY-MM-DD of yesterday in local time
 */
export const getYesterdayString = (d = new Date()) => {
  const dateObj = new Date(d);
  dateObj.setDate(dateObj.getDate() - 1);
  return getLocalDateString(dateObj);
};

/**
 * Formats date and exact time (h:m:s): YYYY-MM-DD HH:mm:ss
 */
export const formatDateTime = (dateVal) => {
  if (!dateVal) return '—';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '—';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
};

/**
 * Formats time only: HH:mm:ss
 */
export const formatTimeOnly = (dateVal) => {
  if (!dateVal) return '—';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '—';
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${min}:${ss}`;
};

/**
 * Strictly checks if a date value falls within local date boundaries fromStr to toStr.
 * fromStr and toStr are YYYY-MM-DD.
 */
export const isDateInRange = (dateVal, fromStr, toStr) => {
  if (!dateVal) return false;
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return false;

  if (fromStr) {
    const [fy, fm, fd] = fromStr.split('-').map(Number);
    const fromTime = new Date(fy, fm - 1, fd, 0, 0, 0, 0).getTime();
    if (d.getTime() < fromTime) return false;
  }

  if (toStr) {
    const [ty, tm, td] = toStr.split('-').map(Number);
    const toTime = new Date(ty, tm - 1, td, 23, 59, 59, 999).getTime();
    if (d.getTime() > toTime) return false;
  }

  return true;
};

/**
 * Check if a date value matches today in local time
 */
export const isToday = (dateVal) => {
  if (!dateVal) return false;
  return getLocalDateString(dateVal) === getLocalDateString(new Date());
};

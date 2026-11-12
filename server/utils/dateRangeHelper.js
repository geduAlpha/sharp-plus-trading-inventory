/**
 * Date and Time Range Helper for Unified Local / EAT Timezone Filtering
 * 
 * Ensures any transaction or task performed on a given day:
 * 1. Takes and stores the exact timestamp (date, hours, minutes, seconds) when performed.
 * 2. When filtered by date (e.g. today or a specific date/range), matches strictly within
 *    that day's full 24-hour boundaries (00:00:00.000 to 23:59:59.999) in the user's timezone.
 * 3. Shows ONLY on that day.
 */

// Default timezone offset: East Africa Time (UTC+3 / Addis Ababa) is -180 minutes.
const DEFAULT_TZ_OFFSET = -180;

/**
 * Extract client timezone offset from request (in minutes).
 * Browser new Date().getTimezoneOffset() returns -180 for UTC+3.
 */
const getClientTimezoneOffset = (req) => {
  if (!req) return DEFAULT_TZ_OFFSET;

  const headerVal = req.headers && (req.headers['x-timezone-offset'] || req.headers['timezone-offset']);
  if (headerVal !== undefined && headerVal !== null && headerVal !== '') {
    const num = Number(headerVal);
    if (!isNaN(num)) return num;
  }

  const queryVal = req.query && (req.query.tzOffset || req.query.timezoneOffset);
  if (queryVal !== undefined && queryVal !== null && queryVal !== '') {
    const num = Number(queryVal);
    if (!isNaN(num)) return num;
  }

  // Fallback to server local timezone offset, or default -180 (UTC+3)
  const serverOffset = new Date().getTimezoneOffset();
  return serverOffset !== 0 ? serverOffset : DEFAULT_TZ_OFFSET;
};

/**
 * Parses date input into a boundary Date object (start or end of day)
 * aligned with the client's timezone offset in minutes.
 * @param {string|Date} dateInput - 'YYYY-MM-DD' or ISO string or Date
 * @param {'start'|'end'} boundary - 'start' (00:00:00.000) or 'end' (23:59:59.999)
 * @param {number} tzOffsetMinutes - client offset in minutes (e.g. -180 for UTC+3)
 */
const parseDateBoundary = (dateInput, boundary = 'start', tzOffsetMinutes = DEFAULT_TZ_OFFSET) => {
  if (!dateInput) return null;

  let y, m, d;
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      [y, m, d] = trimmed.split('-').map(Number);
    } else {
      const dt = new Date(trimmed);
      if (isNaN(dt.getTime())) return null;
      const targetTime = new Date(dt.getTime() - (tzOffsetMinutes * 60 * 1000));
      y = targetTime.getUTCFullYear();
      m = targetTime.getUTCMonth() + 1;
      d = targetTime.getUTCDate();
    }
  } else if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
    const targetTime = new Date(dateInput.getTime() - (tzOffsetMinutes * 60 * 1000));
    y = targetTime.getUTCFullYear();
    m = targetTime.getUTCMonth() + 1;
    d = targetTime.getUTCDate();
  } else {
    return null;
  }

  const h = boundary === 'start' ? 0 : 23;
  const min = boundary === 'start' ? 0 : 59;
  const s = boundary === 'start' ? 0 : 59;
  const ms = boundary === 'start' ? 0 : 999;

  // Calculate UTC milliseconds: local time + offset
  const utcMs = Date.UTC(y, m - 1, d, h, min, s, ms) + (tzOffsetMinutes * 60 * 1000);
  return new Date(utcMs);
};

/**
 * Build day range for a single day: { start, end }
 */
const buildDayRange = (dateParam, req) => {
  const tzOffset = getClientTimezoneOffset(req);
  let target = dateParam;
  if (!target) {
    const now = new Date();
    const targetNow = new Date(now.getTime() - (tzOffset * 60 * 1000));
    const y = targetNow.getUTCFullYear();
    const m = String(targetNow.getUTCMonth() + 1).padStart(2, '0');
    const d = String(targetNow.getUTCDate()).padStart(2, '0');
    target = `${y}-${m}-${d}`;
  }
  const start = parseDateBoundary(target, 'start', tzOffset);
  const end = parseDateBoundary(target, 'end', tzOffset);
  const dateStr = typeof target === 'string' ? target.slice(0, 10) : formatLocalDate(start, tzOffset);
  return { start, end, tzOffset, dateStr };
};

/**
 * Build range filter for MongoDB queries: { $gte, $lte }
 */
const buildRangeFilter = (from, to, req) => {
  const tzOffset = getClientTimezoneOffset(req);
  const f = {};
  if (from) {
    const s = parseDateBoundary(from, 'start', tzOffset);
    if (s) f.$gte = s;
  }
  if (to) {
    const e = parseDateBoundary(to, 'end', tzOffset);
    if (e) f.$lte = e;
  }
  return Object.keys(f).length ? f : null;
};

/**
 * Resolve the execution timestamp for a transaction or task being created or updated.
 * Guarantees that the exact time (hours, minutes, seconds, milliseconds) is preserved.
 */
const resolveTransactionDate = (dateParam, req) => {
  const now = new Date();
  if (!dateParam) return now;

  if (typeof dateParam === 'string') {
    const trimmed = dateParam.trim();
    // If it includes time (e.g. ISO string with T or space with :), parse directly
    if (trimmed.includes('T') || (trimmed.includes(':') && trimmed.length > 10)) {
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) return parsed;
    }

    // If dateParam is YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const tzOffset = getClientTimezoneOffset(req);
      const [y, m, d] = trimmed.split('-').map(Number);

      // Check if this date represents "today" in target timezone
      const targetNow = new Date(now.getTime() - (tzOffset * 60 * 1000));
      const todayY = targetNow.getUTCFullYear();
      const todayM = targetNow.getUTCMonth() + 1;
      const todayD = targetNow.getUTCDate();

      if (y === todayY && m === todayM && d === todayD) {
        // Created or performed today -> use exact current timestamp!
        return now;
      }

      // If user selected a specific past or future business date,
      // preserve current time of day so it isn't reset to 00:00:00 UTC
      const targetH = targetNow.getUTCHours();
      const targetMin = targetNow.getUTCMinutes();
      const targetSec = targetNow.getUTCSeconds();
      const targetMs = targetNow.getUTCMilliseconds();

      const utcMs = Date.UTC(y, m - 1, d, targetH, targetMin, targetSec, targetMs) + (tzOffset * 60 * 1000);
      return new Date(utcMs);
    }
  }

  const fallback = new Date(dateParam);
  return isNaN(fallback.getTime()) ? now : fallback;
};

/**
 * Format a Date object into YYYY-MM-DD in the target timezone
 */
const formatLocalDate = (dateObj, tzOffsetMinutes = DEFAULT_TZ_OFFSET) => {
  if (!dateObj) return '';
  const dt = dateObj instanceof Date ? dateObj : new Date(dateObj);
  if (isNaN(dt.getTime())) return '';
  const targetTime = new Date(dt.getTime() - (tzOffsetMinutes * 60 * 1000));
  const y = targetTime.getUTCFullYear();
  const m = String(targetTime.getUTCMonth() + 1).padStart(2, '0');
  const d = String(targetTime.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

module.exports = {
  DEFAULT_TZ_OFFSET,
  getClientTimezoneOffset,
  parseDateBoundary,
  buildDayRange,
  buildRangeFilter,
  resolveTransactionDate,
  formatLocalDate,
};


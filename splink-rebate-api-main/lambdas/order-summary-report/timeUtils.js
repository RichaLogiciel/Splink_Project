/**
 * Utility functions for EST/EDT time detection and conversion
 */

/**
 * Get EST/EDT offset in hours (UTC-5 for EST, UTC-4 for EDT)
 * DST in US: 2nd Sunday in March to 1st Sunday in November
 * @param {Date} date - UTC date to check
 * @returns {number} Offset in hours (-5 for EST, -4 for EDT)
 */
function getEstOffset(date) {
  const month = date.getUTCMonth(); // 0-11
  const day = date.getUTCDate();
  const dayOfWeek = date.getUTCDay(); // 0 = Sunday

  // Check if in DST period (March 2nd Sunday to November 1st Sunday)
  if (month > 2 && month < 10) {
    return -4; // EDT (April through September)
  } else if (month === 2) {
    // March: check if after 2nd Sunday
    // Calculate 2nd Sunday: if 1st is Sunday (dayOfWeek=0), 2nd Sunday is day 8
    // Formula: (14 - dayOfWeek) % 7 gives days until next Sunday, then add 7 for 2nd Sunday
    const secondSunday = (14 - dayOfWeek) % 7 || 7;
    return day >= secondSunday ? -4 : -5; // EDT if on or after 2nd Sunday, else EST
  } else if (month === 10) {
    // November: check if before 1st Sunday
    // Formula: (7 - dayOfWeek) % 7 gives days until next Sunday
    const firstSunday = (7 - dayOfWeek) % 7 || 7;
    return day < firstSunday ? -4 : -5; // EDT if before 1st Sunday, else EST
  }
  return -5; // EST (December through February)
}

/**
 * Convert UTC time to EST/EDT time
 * @param {Date} utcDate - UTC date object
 * @returns {Object} Object with hours and minutes in EST/EDT
 */
function getEstTime(utcDate) {
  const offset = getEstOffset(utcDate);
  let estHours = utcDate.getUTCHours() + offset;
  // Handle day rollover
  if (estHours < 0) {
    estHours += 24;
  } else if (estHours >= 24) {
    estHours -= 24;
  }
  return {
    hours: estHours,
    minutes: utcDate.getUTCMinutes()
  };
}

/**
 * Get report run suffix based on EST/EDT time
 * Returns "1" for 11 AM run, "2" for 4 PM run
 * @returns {string} "1" or "2"
 */
function getReportRunSuffix() {
  const now = new Date();
  const estTime = getEstTime(now);
  const estHours = estTime.hours;

  // 11 AM run: 10:30 - 11:30 EST (approximately)
  // 4 PM run: 15:30 - 16:30 EST (approximately)
  if (estHours >= 10 && estHours < 12) {
    return "1"; // 11 AM run
  } else if (estHours >= 15 && estHours < 17) {
    return "2"; // 4 PM run
  }
  // Default to "1" if outside expected windows
  return "1";
}

module.exports = {
  getEstOffset,
  getEstTime,
  getReportRunSuffix
};

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

const shortMonths = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
];

export const getMonth = (month: number): string => {
  if (month >= 0 && month <= 11) {
    return months[month];
  }

  return "";
};

export const getShortMonth = (month: number): string => {
  if (month >= 0 && month <= 11) {
    return shortMonths[month];
  }

  return "";
};

export const getDateString = (date: string): string => {
  const dateObj = new Date(date);

  return `${getMonth(dateObj.getMonth())} ${dateObj.getDate()} ${dateObj.getFullYear()}`;
};

export const getNumericDateString = (date: string): string => {
  if (!date) return "";

  // Handle dd/MM/yyyy format explicitly (e.g. 31/12/2025)
  if (date.includes("/") && !date.includes("-")) {
    const parts = date.split("/");
    if (parts.length === 3) {
      const [day, month, year] = parts.map((p) => parseInt(p, 10));
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return `${month}/${day}/${year}`; // normalize to MM/DD/YYYY
      }
    }
  }

  // For ISO date strings (YYYY-MM-DD), parse as local date to avoid timezone issues
  // Handle both "2025-07-01" and "2025-07-01T00:00:00.000Z" formats
  if (date.includes("-")) {
    // Extract just the date part before any time/T separator
    const datePart = date.split("T")[0].split(" ")[0];
    const parts = datePart.split("-");

    if (parts.length === 3) {
      const [year, month, day] = parts.map((p) => parseInt(p, 10));
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return `${month}/${day}/${year}`;
      }
    }
  }

  // Fallback - should rarely hit this
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return "";

  const month = dateObj.getMonth() + 1;
  const day = dateObj.getDate();
  const year = dateObj.getFullYear();

  return `${month}/${day}/${year}`;
};

// Helper function to calculate difference between dates in days
export function calculateDateDifference(start: string, end: string): number {
  const startDateObj = new Date(start);
  const endDateObj = new Date(end);
  return Math.floor(
    (endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)
  );
}

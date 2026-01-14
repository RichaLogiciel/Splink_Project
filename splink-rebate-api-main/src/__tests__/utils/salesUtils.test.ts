/**
 * SalesUtils Date Functions Tests
 *
 * Tests for date utility functions in salesUtils
 * Focuses on date range generation, formatting, and calculations
 */

import {
  formatWeekLabel,
  formatDate,
  generateDateRange,
  getStartOfWeek,
  generateWeekRange,
  getStartDate,
  getMonthBasedStartDate,
  getMonthBasedEndDate,
  getMonthBasedDateRange,
  getPreviousSaturday
} from "../../utils/salesUtils";

describe("SalesUtils - Date Functions", () => {
  describe("formatWeekLabel", () => {
    it("should format week label within same month", () => {
      // Arrange
      const start = new Date(2025, 0, 5); // January 5
      const end = new Date(2025, 0, 11); // January 11

      // Act
      const result = formatWeekLabel(start, end);

      // Assert
      expect(result).toBe("Jan 05-11");
    });

    it("should format week label across different months", () => {
      // Arrange
      const start = new Date(2025, 0, 28); // January 28
      const end = new Date(2025, 1, 3); // February 3

      // Act
      const result = formatWeekLabel(start, end);

      // Assert
      expect(result).toBe("Jan 28-Feb 03");
    });

    it("should pad single-digit days with zero", () => {
      // Arrange
      const start = new Date(2025, 2, 1); // March 1
      const end = new Date(2025, 2, 7); // March 7

      // Act
      const result = formatWeekLabel(start, end);

      // Assert
      expect(result).toBe("Mar 01-07");
    });

    it("should not pad double-digit days", () => {
      // Arrange
      const start = new Date(2025, 2, 15); // March 15
      const end = new Date(2025, 2, 21); // March 21

      // Act
      const result = formatWeekLabel(start, end);

      // Assert
      expect(result).toBe("Mar 15-21");
    });
  });

  describe("formatDate", () => {
    it("should format date as 'Mon DD'", () => {
      // Arrange
      const date = new Date(2025, 0, 15); // January 15, 2025

      // Act
      const result = formatDate(date);

      // Assert
      expect(result).toMatch(/^[A-Z][a-z]{2}\s\d{2}$/);
    });

    it("should format date without comma", () => {
      // Arrange
      const date = new Date(2025, 5, 5); // June 5, 2025

      // Act
      const result = formatDate(date);

      // Assert
      expect(result).not.toContain(",");
    });
  });

  describe("generateDateRange", () => {
    it("should generate array of ISO date strings", () => {
      // Arrange
      const start = new Date("2025-01-01");
      const end = new Date("2025-01-05");

      // Act
      const result = generateDateRange(start, end);

      // Assert
      expect(result).toHaveLength(5);
      expect(result[0]).toBe("2025-01-01");
      expect(result[4]).toBe("2025-01-05");
    });

    it("should handle single day range", () => {
      // Arrange
      const start = new Date("2025-01-01");
      const end = new Date("2025-01-01");

      // Act
      const result = generateDateRange(start, end);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toBe("2025-01-01");
    });

    it("should generate consecutive dates", () => {
      // Arrange
      const start = new Date("2025-01-01");
      const end = new Date("2025-01-03");

      // Act
      const result = generateDateRange(start, end);

      // Assert
      expect(result).toEqual(["2025-01-01", "2025-01-02", "2025-01-03"]);
    });

    it("should handle month boundary", () => {
      // Arrange
      const start = new Date("2025-01-30");
      const end = new Date("2025-02-02");

      // Act
      const result = generateDateRange(start, end);

      // Assert
      expect(result).toHaveLength(4);
      expect(result[0]).toBe("2025-01-30");
      expect(result[3]).toBe("2025-02-02");
    });
  });

  describe("getStartOfWeek", () => {
    it("should return Monday for a Wednesday", () => {
      // Arrange - Wednesday, January 8, 2025
      const date = new Date(2025, 0, 8);

      // Act
      const result = getStartOfWeek(date);

      // Assert
      expect(result.getDay()).toBe(1); // Monday
      expect(result.getDate()).toBe(6); // January 6 is Monday
    });

    it("should return same day if already Monday", () => {
      // Arrange - Monday, January 6, 2025
      const date = new Date(2025, 0, 6);

      // Act
      const result = getStartOfWeek(date);

      // Assert
      expect(result.getDay()).toBe(1); // Monday
      expect(result.getDate()).toBe(6);
    });

    it("should handle Sunday correctly", () => {
      // Arrange - Sunday, January 12, 2025
      const date = new Date(2025, 0, 12);

      // Act
      const result = getStartOfWeek(date);

      // Assert
      expect(result.getDay()).toBe(1); // Monday
      expect(result.getDate()).toBe(6); // Goes back to previous Monday
    });

    it("should set time to 00:00:00", () => {
      // Arrange
      const date = new Date(2025, 0, 8, 15, 30, 45);

      // Act
      const result = getStartOfWeek(date);

      // Assert
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
    });
  });

  describe("generateWeekRange", () => {
    it("should generate week labels", () => {
      // Arrange
      const start = new Date("2025-01-01");
      const end = new Date("2025-01-21"); // 3 weeks

      // Act
      const result = generateWeekRange(start, end);

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0]).toBe("Week 1");
      expect(result[1]).toBe("Week 2");
      expect(result[2]).toBe("Week 3");
    });

    it("should handle single week", () => {
      // Arrange
      const start = new Date("2025-01-01");
      const end = new Date("2025-01-05");

      // Act
      const result = generateWeekRange(start, end);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toBe("Week 1");
    });

    it("should handle multiple months", () => {
      // Arrange
      const start = new Date("2025-01-01");
      const end = new Date("2025-02-14"); // ~6 weeks

      // Act
      const result = generateWeekRange(start, end);

      // Assert
      expect(result.length).toBeGreaterThan(5);
      expect(result[0]).toBe("Week 1");
    });
  });

  describe("getStartDate", () => {
    it("should go back 30 days for 1 month range", () => {
      // Arrange
      const endDate = new Date("2025-02-01");

      // Act
      const result = getStartDate(endDate, "1");

      // Assert
      const diffDays = Math.floor(
        (endDate.getTime() - result.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(diffDays).toBe(30);
    });

    it("should go back approximately 90 days for 3 month range", () => {
      // Arrange
      const endDate = new Date("2025-04-01");

      // Act
      const result = getStartDate(endDate, "3");

      // Assert
      const diffDays = Math.floor(
        (endDate.getTime() - result.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(diffDays).toBeGreaterThanOrEqual(89);
      expect(diffDays).toBeLessThanOrEqual(91);
    });

    it("should handle string month range", () => {
      // Arrange
      const endDate = new Date("2025-07-01");

      // Act
      const result = getStartDate(endDate, "6");

      // Assert
      const diffDays = Math.floor(
        (endDate.getTime() - result.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(diffDays).toBeGreaterThanOrEqual(179);
      expect(diffDays).toBeLessThanOrEqual(181);
    });
  });

  describe("getMonthBasedStartDate", () => {
    it("should return first day of same month for 1 month range", () => {
      // Arrange
      const endDate = new Date("2025-03-15");

      // Act
      const result = getMonthBasedStartDate(endDate, "1");

      // Assert
      expect(result.getUTCMonth()).toBe(2); // March (0-indexed)
      expect(result.getUTCDate()).toBe(1);
    });

    it("should go back 2 months for 3 month range", () => {
      // Arrange
      const endDate = new Date("2025-03-15");

      // Act
      const result = getMonthBasedStartDate(endDate, "3");

      // Assert
      expect(result.getUTCMonth()).toBe(0); // January
      expect(result.getUTCDate()).toBe(1);
    });

    it("should handle year boundary", () => {
      // Arrange
      const endDate = new Date("2025-02-15");

      // Act
      const result = getMonthBasedStartDate(endDate, "6");

      // Assert
      expect(result.getUTCFullYear()).toBe(2025);
      expect(result.getUTCMonth()).toBe(0); // January (doesn't go to previous year)
      expect(result.getUTCDate()).toBe(1);
    });

    it("should return January 1st when going back would cross year", () => {
      // Arrange
      const endDate = new Date("2025-01-15");

      // Act
      const result = getMonthBasedStartDate(endDate, "12");

      // Assert
      expect(result.getUTCMonth()).toBe(0); // January
      expect(result.getUTCDate()).toBe(1);
    });
  });

  describe("getMonthBasedEndDate", () => {
    it("should return last day of end month", () => {
      // Arrange
      const startDate = new Date(Date.UTC(2025, 0, 1)); // Jan 1, 2025 UTC

      // Act
      const result = getMonthBasedEndDate(startDate, "1");

      // Assert
      expect(result).toBeInstanceOf(Date);
      expect(result.getUTCDate()).toBeGreaterThanOrEqual(28); // Last day of month
      expect(result.getUTCHours()).toBe(23);
      expect(result.getUTCMinutes()).toBe(59);
    });

    it("should handle 3 month range", () => {
      // Arrange
      const startDate = new Date(Date.UTC(2025, 0, 1)); // Jan 1, 2025 UTC

      // Act
      const result = getMonthBasedEndDate(startDate, "3");

      // Assert
      expect(result).toBeInstanceOf(Date);
      // Should be approximately 3 months later
      expect(result.getTime()).toBeGreaterThan(startDate.getTime());
    });

    it("should handle year rollover", () => {
      // Arrange
      const startDate = new Date(Date.UTC(2025, 9, 1)); // Oct 1, 2025 UTC

      // Act
      const result = getMonthBasedEndDate(startDate, "6");

      // Assert
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBeGreaterThan(startDate.getTime());
      // Should be in the next year
      expect(result.getUTCFullYear()).toBeGreaterThanOrEqual(2026);
    });
  });

  describe("getPreviousSaturday", () => {
    it("should return same date if already Saturday", () => {
      // Arrange - Saturday, January 4, 2025
      const date = new Date(2025, 0, 4);

      // Act
      const result = getPreviousSaturday(date);

      // Assert
      expect(result.getDay()).toBe(6); // Saturday
      expect(result.getDate()).toBe(4);
    });

    it("should return previous Saturday for Sunday", () => {
      // Arrange - Sunday, January 5, 2025
      const date = new Date(2025, 0, 5);

      // Act
      const result = getPreviousSaturday(date);

      // Assert
      expect(result.getDay()).toBe(6); // Saturday
      expect(result.getDate()).toBe(4); // January 4
    });

    it("should return previous Saturday for Monday", () => {
      // Arrange - Monday, January 6, 2025
      const date = new Date(2025, 0, 6);

      // Act
      const result = getPreviousSaturday(date);

      // Assert
      expect(result.getDay()).toBe(6); // Saturday
      expect(result.getDate()).toBe(4);
    });

    it("should return previous Saturday for Friday", () => {
      // Arrange - Friday, January 10, 2025
      const date = new Date(2025, 0, 10);

      // Act
      const result = getPreviousSaturday(date);

      // Assert
      expect(result.getDay()).toBe(6); // Saturday
      expect(result.getDate()).toBe(4);
    });
  });

  describe("getMonthBasedDateRange", () => {
    it("should return correct start and end dates for 1 month", () => {
      // Arrange
      const endDate = new Date("2025-03-15");

      // Act
      const result = getMonthBasedDateRange(endDate, "1");

      // Assert
      expect(result.startDate.getUTCMonth()).toBe(2); // March
      expect(result.startDate.getUTCDate()).toBe(1);
      expect(result.endDate.getUTCMonth()).toBe(2); // March
      expect(result.endDate.getUTCDate()).toBe(31); // Last day of March
    });

    it("should end on last day of month containing endDate", () => {
      // Arrange
      const endDate = new Date("2025-02-10");

      // Act
      const result = getMonthBasedDateRange(endDate, "1");

      // Assert
      expect(result.endDate.getUTCMonth()).toBe(1); // February
      expect(result.endDate.getUTCDate()).toBe(28); // Last day of Feb 2025
    });

    it("should handle leap year", () => {
      // Arrange
      const endDate = new Date("2024-02-15");

      // Act
      const result = getMonthBasedDateRange(endDate, "1");

      // Assert
      expect(result.endDate.getUTCDate()).toBe(29); // Leap year
    });
  });
});

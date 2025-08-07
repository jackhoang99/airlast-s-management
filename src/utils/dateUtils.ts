/**
 * Centralized date and time formatting utilities
 * This ensures consistent date/time display throughout the app
 */

// Standard locale for the entire app
const APP_LOCALE = "en-US";

// Force Eastern Time for consistency across the app
const APP_TIMEZONE = "America/New_York";

// Log timezone for debugging
console.log("🕐 App timezone:", APP_TIMEZONE);
console.log(
  "🕐 User's local timezone:",
  Intl.DateTimeFormat().resolvedOptions().timeZone
);

/**
 * Format a date string to a readable date format
 * @param dateString - ISO date string or Date object
 * @param options - Formatting options
 */
export const formatDate = (
  dateString: string | Date | null | undefined,
  options: {
    includeYear?: boolean;
    includeWeekday?: boolean;
    format?: "short" | "long" | "numeric";
  } = {}
): string => {
  if (!dateString) return "Not scheduled";

  try {
    const date =
      typeof dateString === "string" ? new Date(dateString) : dateString;

    if (isNaN(date.getTime())) {
      console.warn("Invalid date:", dateString);
      return "Invalid date";
    }

    const formatOptions: Intl.DateTimeFormatOptions = {
      month: options.format === "long" ? "long" : "short",
      day: "numeric",
    };

    if (options.includeYear !== false) {
      formatOptions.year = "numeric";
    }

    if (options.includeWeekday) {
      formatOptions.weekday = "short";
    }

    return date.toLocaleDateString(APP_LOCALE, {
      ...formatOptions,
      timeZone: APP_TIMEZONE,
    });
  } catch (error) {
    console.error("Error formatting date:", dateString, error);
    return "Invalid date";
  }
};

/**
 * Format a time string to a readable time format
 * @param timeString - Time string in format "HH:MM:SS" or "HH:MM"
 * @param options - Formatting options
 */
export const formatTime = (
  timeString: string | null | undefined,
  options: {
    includeSeconds?: boolean;
    format?: "12hour" | "24hour";
  } = {}
): string => {
  if (!timeString) return "";

  try {
    let time: Date;

    // Check if it's a full timestamp (contains 'T' or is a full date)
    if (timeString.includes("T") || timeString.includes("-")) {
      // It's a full timestamp, parse it directly
      time = new Date(timeString);
    } else {
      // It's a time string like "14:30:00" or "14:30"
      time = new Date(`2000-01-01T${timeString}`);
    }

    if (isNaN(time.getTime())) {
      console.warn("Invalid time:", timeString);
      return "";
    }

    const formatOptions: Intl.DateTimeFormatOptions = {
      hour: "2-digit",
      minute: "2-digit",
    };

    if (options.includeSeconds) {
      formatOptions.second = "2-digit";
    }

    if (options.format !== "24hour") {
      formatOptions.hour12 = true;
    }

    return time.toLocaleTimeString(APP_LOCALE, {
      ...formatOptions,
      timeZone: APP_TIMEZONE,
    });
  } catch (error) {
    console.error("Error formatting time:", timeString, error);
    return "";
  }
};

/**
 * Format a date and time together
 * @param dateString - ISO date string or Date object
 * @param timeString - Time string (optional)
 * @param options - Formatting options
 */
export const formatDateTime = (
  dateString: string | Date | null | undefined,
  timeString?: string | null,
  options: {
    includeYear?: boolean;
    includeWeekday?: boolean;
    includeSeconds?: boolean;
    format?: "short" | "long";
  } = {}
): string => {
  if (!dateString) return "Not scheduled";

  try {
    const date =
      typeof dateString === "string" ? new Date(dateString) : dateString;

    if (isNaN(date.getTime())) {
      console.warn("Invalid date:", dateString);
      return "Invalid date";
    }

    const formatOptions: Intl.DateTimeFormatOptions = {
      month: options.format === "long" ? "long" : "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };

    if (options.includeYear !== false) {
      formatOptions.year = "numeric";
    }

    if (options.includeWeekday) {
      formatOptions.weekday = "short";
    }

    if (options.includeSeconds) {
      formatOptions.second = "2-digit";
    }

    // If timeString is provided, combine it with the date
    if (timeString) {
      const time = new Date(`2000-01-01T${timeString}`);
      if (!isNaN(time.getTime())) {
        date.setHours(time.getHours(), time.getMinutes(), time.getSeconds());
      }
    }

    return date.toLocaleString(APP_LOCALE, {
      ...formatOptions,
      timeZone: APP_TIMEZONE,
    });
  } catch (error) {
    console.error("Error formatting date/time:", dateString, error);
    return "Invalid date/time";
  }
};

/**
 * Format a date for display in job cards (compact format)
 */
export const formatJobDate = (
  dateString: string | Date | null | undefined
): string => {
  return formatDate(dateString, { includeYear: true });
};

/**
 * Format a time for display in job cards (12-hour format)
 */
export const formatJobTime = (
  timeString: string | null | undefined
): string => {
  return formatTime(timeString, { format: "12hour" });
};

/**
 * Format a date and time for job details (full format)
 */
export const formatJobDateTime = (
  dateString: string | Date | null | undefined,
  timeString?: string | null
): string => {
  return formatDateTime(dateString, timeString, {
    includeYear: true,
    includeWeekday: true,
  });
};

/**
 * Format a scheduled timestamp for job technicians
 */
export const formatScheduledAt = (
  scheduledAt: string | null | undefined
): string => {
  if (!scheduledAt) return "Not scheduled";
  return formatDateTime(scheduledAt, undefined, {
    includeYear: true,
    includeWeekday: true,
  });
};

/**
 * Extract date from scheduled_at timestamp
 */
export const getScheduledDate = (
  scheduledAt: string | null | undefined
): string => {
  if (!scheduledAt) return "";
  return formatDate(scheduledAt, { includeYear: true });
};

/**
 * Extract time from scheduled_at timestamp
 */
export const getScheduledTime = (
  scheduledAt: string | null | undefined
): string => {
  if (!scheduledAt) return "";
  return formatTime(scheduledAt, { format: "12hour" });
};

/**
 * Format a date for the schedule view (weekday + date)
 */
export const formatScheduleDate = (date: Date): string => {
  return date.toLocaleDateString(APP_LOCALE, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: APP_TIMEZONE,
  });
};

/**
 * Format a time for the schedule view (12-hour format)
 */
export const formatScheduleTime = (
  timeString: string | null | undefined
): string => {
  return formatTime(timeString, { format: "12hour" });
};

/**
 * Get the current timezone for debugging
 */
export const getCurrentTimezone = (): string => {
  return APP_TIMEZONE;
};

/**
 * Check if a date is in the past
 */
export const isDatePast = (dateString: string | Date): boolean => {
  const date =
    typeof dateString === "string" ? new Date(dateString) : dateString;
  return date < new Date();
};

/**
 * Check if a date is today
 */
export const isDateToday = (dateString: string | Date): boolean => {
  const date =
    typeof dateString === "string" ? new Date(dateString) : dateString;
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

/**
 * Convert a UTC date to Eastern Time
 * This is useful when the database stores UTC but you want to display in ET
 */
export const convertUTCToEastern = (utcDateString: string | Date): Date => {
  const date =
    typeof utcDateString === "string" ? new Date(utcDateString) : utcDateString;

  // Create a new date in Eastern Time
  const easternDate = new Date(
    date.toLocaleString("en-US", { timeZone: APP_TIMEZONE })
  );

  return easternDate;
};

/**
 * Get relative time (e.g., "2 hours ago", "yesterday")
 */
export const getRelativeTime = (dateString: string | Date): string => {
  const date =
    typeof dateString === "string" ? new Date(dateString) : dateString;
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInHours = diffInMs / (1000 * 60 * 60);
  const diffInDays = diffInHours / 24;

  if (diffInDays >= 1) {
    if (diffInDays < 2) return "yesterday";
    if (diffInDays < 7) return `${Math.floor(diffInDays)} days ago`;
    return formatDate(date, { includeYear: true });
  } else if (diffInHours >= 1) {
    return `${Math.floor(diffInHours)} hours ago`;
  } else {
    const diffInMinutes = diffInMs / (1000 * 60);
    if (diffInMinutes < 1) return "just now";
    return `${Math.floor(diffInMinutes)} minutes ago`;
  }
};

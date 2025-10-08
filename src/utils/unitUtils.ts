/**
 * Utility functions for handling unit display and formatting
 */

/**
 * Formats a unit number for display, converting "LOCATION" to "Location"
 */
export const formatUnitNumber = (unitNumber: string): string => {
  if (unitNumber === "LOCATION") {
    return "Location";
  }
  return unitNumber;
};

/**
 * Gets the display text for a unit, handling location-level units
 */
export const getUnitDisplayText = (
  unit: { unit_number: string } | null
): string => {
  if (!unit) return "Unknown Unit";
  return formatUnitNumber(unit.unit_number);
};

/**
 * Checks if a unit is a location-level unit
 */
export const isLocationUnit = (unitNumber: string): boolean => {
  return unitNumber === "LOCATION";
};
1
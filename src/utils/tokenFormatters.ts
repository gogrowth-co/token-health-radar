
/**
 * Utility functions for formatting token data
 */

/**
 * Formats a number value into a currency string with appropriate abbreviation
 * @param value - The number to format
 * @returns Formatted currency string
 */
export const formatCurrencyValue = (value: number | undefined): string => {
  if (value === undefined) return "N/A";
  
  if (value >= 1000000000) {
    return `$${(value / 1000000000).toFixed(2)}B`;
  } 
  else if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  else if (value >= 1000) {
    return `$${(value / 1000).toFixed(2)}K`;
  } 
  else {
    return `$${value.toFixed(2)}`;
  }
};

/**
 * Formats a number value with appropriate abbreviation (without $ sign)
 * @param value - The number to format
 * @returns Formatted number string
 */
export const formatNumberValue = (value: number | undefined): string => {
  if (value === undefined) return "N/A";
  
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(2)}B`;
  } 
  else if (value >= 1000000) {
    return `${(value / 1000000).toFixed(2)}M`;
  }
  else if (value >= 1000) {
    return `${(value / 1000).toFixed(2)}K`;
  } 
  else {
    return value.toFixed(2);
  }
};

/**
 * Formats a date string into a human-readable format
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
export const formatDateToHuman = (dateString: string | null | undefined): string => {
  if (!dateString) return "N/A";
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateString;
  }
};

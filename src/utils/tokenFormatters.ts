
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


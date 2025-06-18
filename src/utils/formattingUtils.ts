
// Utility functions for formatting numbers and currency

export const formatNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return "N/A";
  
  // For very large numbers
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(2)}B`;
  } 
  // For millions
  else if (value >= 1000000) {
    return `${(value / 1000000).toFixed(2)}M`;
  }
  // For thousands
  else if (value >= 1000) {
    return `${(value / 1000).toFixed(2)}K`;
  } 
  // For regular numbers
  else {
    return value.toFixed(2);
  }
};

export const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return "N/A";
  return `$${formatNumber(value)}`;
};

export const formatPercentage = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return "N/A";
  return `${value.toFixed(2)}%`;
};

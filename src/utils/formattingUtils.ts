
// Utility functions for formatting numbers and currency

export const formatNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return "N/A";
  
  // For trillions (including very large numbers that would be quadrillions+)
  if (value >= 1000000000000) {
    const trillions = value / 1000000000000;
    if (trillions >= 1000) {
      // For thousands of trillions, use comma formatting
      return `${Math.round(trillions).toLocaleString()}T`;
    }
    return trillions >= 100 ? `${Math.round(trillions)}T` : `${trillions.toFixed(1)}T`;
  }
  // For billions
  else if (value >= 1000000000) {
    const billions = value / 1000000000;
    return billions >= 100 ? `${Math.round(billions)}B` : `${billions.toFixed(1)}B`;
  } 
  // For millions
  else if (value >= 1000000) {
    const millions = value / 1000000;
    return millions >= 100 ? `${Math.round(millions)}M` : `${millions.toFixed(1)}M`;
  }
  // For thousands
  else if (value >= 1000) {
    const thousands = value / 1000;
    return thousands >= 100 ? `${Math.round(thousands)}K` : `${thousands.toFixed(1)}K`;
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

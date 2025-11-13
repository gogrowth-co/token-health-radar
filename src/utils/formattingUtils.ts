
// Utility functions for formatting numbers and currency

export const formatNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return "N/A";
  
  // For quadrillions (1000+ trillions)
  if (value >= 1000000000000000) {
    const quadrillions = value / 1000000000000000;
    return quadrillions >= 100 ? `${Math.round(quadrillions)}Q` : `${quadrillions.toFixed(1)}Q`;
  }
  // For trillions
  else if (value >= 1000000000000) {
    const trillions = value / 1000000000000;
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

export const formatTokensCompact = (value: number | string): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return 'N/A';
  const abs = Math.abs(num);

  // Use the same logic as formatNumber but append "Tokens" at the end
  if (abs >= 1_000_000_000_000_000) {
    const quadrillions = num / 1_000_000_000_000_000;
    return quadrillions >= 100 ? `${Math.round(quadrillions)}Q` : `${quadrillions.toFixed(1)}Q`;
  }
  if (abs >= 1_000_000_000_000) {
    const trillions = num / 1_000_000_000_000;
    return trillions >= 100 ? `${Math.round(trillions)}T` : `${trillions.toFixed(1)}T`;
  }
  if (abs >= 1_000_000_000) {
    const billions = num / 1_000_000_000;
    return billions >= 100 ? `${Math.round(billions)}B` : `${billions.toFixed(1)}B`;
  }
  if (abs >= 1_000_000) {
    const millions = num / 1_000_000;
    return millions >= 100 ? `${Math.round(millions)}M` : `${millions.toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    const thousands = num / 1_000;
    return thousands >= 100 ? `${Math.round(thousands)}K` : `${thousands.toFixed(1)}K`;
  }

  // For smaller numbers, show without decimals if it's a whole number
  return Number.isInteger(num) ? num.toString() : num.toFixed(1);
};

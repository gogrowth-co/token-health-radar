
/**
 * Utility functions for working with blockchain addresses
 */

/**
 * Extracts the first valid EVM address from token platforms
 * @param platforms - Object containing blockchain platforms and their addresses
 * @returns First valid EVM address or empty string
 */
export const getFirstValidEvmAddress = (platforms: Record<string, string> | undefined): string => {
  if (!platforms) return "";
  
  // Look through all platform values for a valid Ethereum-style address
  const evmAddressPattern = /^0x[a-fA-F0-9]{40}$/;
  
  for (const [_, address] of Object.entries(platforms)) {
    if (typeof address === 'string' && evmAddressPattern.test(address.toLowerCase())) {
      return address;
    }
  }
  
  return "";
};

/**
 * Shortens an Ethereum address for display
 * @param address - Full Ethereum address
 * @returns Shortened address (e.g., 0x1234...5678)
 */
export const shortenAddress = (address: string | undefined): string => {
  if (!address) return "";
  
  if (address.length < 10) return address;
  
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

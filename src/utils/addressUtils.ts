
/**
 * Utility functions for working with blockchain addresses
 */

/**
 * Extracts the first valid EVM address from token platforms
 * @param platforms - Object containing blockchain platforms and their addresses
 * @returns First valid EVM address or empty string
 */
export const getFirstValidEvmAddress = (platforms: Record<string, string> | undefined): string => {
  if (!platforms) {
    console.log("[ADDRESS-UTILS] No platforms data provided");
    return "";
  }
  
  console.log("[ADDRESS-UTILS] Checking platforms for EVM addresses:", platforms);
  
  // Look through all platform values for a valid Ethereum-style address
  const evmAddressPattern = /^0x[a-fA-F0-9]{40}$/;
  
  // Prioritize main EVM networks
  const priorityNetworks = ['ethereum', 'polygon-pos', 'binance-smart-chain', 'arbitrum-one', 'avalanche'];
  
  // First check priority networks
  for (const network of priorityNetworks) {
    if (platforms[network]) {
      const address = platforms[network];
      console.log(`[ADDRESS-UTILS] Checking ${network}: ${address}`);
      if (typeof address === 'string' && evmAddressPattern.test(address.toLowerCase())) {
        console.log(`[ADDRESS-UTILS] Found valid EVM address on ${network}: ${address}`);
        return address;
      }
    }
  }
  
  // Then check all other platforms
  for (const [network, address] of Object.entries(platforms)) {
    if (!priorityNetworks.includes(network)) {
      console.log(`[ADDRESS-UTILS] Checking ${network}: ${address}`);
      if (typeof address === 'string' && evmAddressPattern.test(address.toLowerCase())) {
        console.log(`[ADDRESS-UTILS] Found valid EVM address on ${network}: ${address}`);
        return address;
      }
    }
  }
  
  console.log("[ADDRESS-UTILS] No valid EVM address found in platforms");
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

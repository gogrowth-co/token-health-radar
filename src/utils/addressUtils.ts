
/**
 * Utility functions for working with blockchain addresses
 */

// Solana Base58 address pattern (32-44 chars, no 0, O, I, l)
const SOLANA_ADDRESS_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const EVM_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

/**
 * Check if an address is a valid Solana (Base58) address
 * @param address - Address to check
 * @returns True if it's a valid Solana address
 */
export const isSolanaAddress = (address: string | undefined | null): boolean => {
  if (!address || typeof address !== 'string') return false;
  const trimmed = address.trim();
  // Must match Base58 pattern AND not start with 0x (to exclude EVM addresses)
  return SOLANA_ADDRESS_PATTERN.test(trimmed) && !trimmed.startsWith('0x');
};

/**
 * Check if an address is a valid EVM (Ethereum-style) address
 * @param address - Address to check
 * @returns True if it's a valid EVM address
 */
export const isEvmAddress = (address: string | undefined | null): boolean => {
  if (!address || typeof address !== 'string') return false;
  return EVM_ADDRESS_PATTERN.test(address.trim());
};

/**
 * Detect chain type from address format
 * @param address - Address to analyze
 * @returns 'solana' for Base58 addresses, 'ethereum' for 0x addresses
 */
export const detectChainFromAddress = (address: string): 'solana' | 'ethereum' => {
  if (isSolanaAddress(address)) return 'solana';
  return 'ethereum';
};

/**
 * Enhanced function to extract the first valid EVM address from token platforms
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
  
  // Enhanced priority networks list for better EVM support
  const priorityNetworks = [
    'ethereum', 'polygon-pos', 'binance-smart-chain', 'arbitrum-one', 
    'avalanche', 'optimistic-ethereum', 'base', 'fantom'
  ];
  
  // First check priority networks
  for (const network of priorityNetworks) {
    if (platforms[network]) {
      const address = platforms[network];
      console.log(`[ADDRESS-UTILS] Checking priority network ${network}: ${address}`);
      if (typeof address === 'string' && evmAddressPattern.test(address.toLowerCase())) {
        console.log(`[ADDRESS-UTILS] Found valid EVM address on ${network}: ${address}`);
        return address;
      }
    }
  }
  
  // Then check all other platforms for any valid EVM address (excluding Solana)
  for (const [network, address] of Object.entries(platforms)) {
    if (!priorityNetworks.includes(network) && network !== 'solana') {
      console.log(`[ADDRESS-UTILS] Checking other network ${network}: ${address}`);
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
 * Get Solana address from token platforms
 * @param platforms - Object containing blockchain platforms and their addresses
 * @returns Solana mint address or null
 */
export const getSolanaAddress = (platforms: Record<string, string> | undefined): string | null => {
  if (!platforms) return null;
  
  const solanaAddr = platforms['solana'];
  if (solanaAddr && isSolanaAddress(solanaAddr)) {
    console.log(`[ADDRESS-UTILS] Found valid Solana address: ${solanaAddr}`);
    return solanaAddr;
  }
  
  return null;
};

/**
 * Normalize token address to lowercase for consistent database storage
 * CRITICAL: Always use this before ANY database operation to ensure case-insensitive matching
 * @param address - Token address to normalize
 * @returns Lowercase address or empty string
 */
export const normalizeAddress = (address: string | undefined | null): string => {
  if (!address || typeof address !== 'string') return "";
  return address.toLowerCase().trim();
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


// Legacy file - APIs have been refactored into separate modules
// This file is kept for backward compatibility

import { fetchGoPlusSecurity } from './goplusAPI.ts';
import { 
  fetchMoralisPriceData, 
  fetchMoralisMetadata,
  fetchMoralisTokenStats,
  fetchMoralisTokenPairs,
  fetchMoralisTokenOwners
} from './moralisAPI.ts';
import { fetchWebacySecurity } from './webacyAPI.ts';
import { fetchGitHubRepoData } from './githubAPI.ts';
import { 
  calculateSecurityScore, 
  calculateLiquidityScore, 
  calculateTokenomicsScore, 
  calculateDevelopmentScore 
} from './scoringUtils.ts';

// Re-export all functions for backward compatibility
export {
  fetchGoPlusSecurity,
  fetchWebacySecurity,
  fetchMoralisMetadata,
  fetchMoralisPriceData,
  fetchMoralisTokenStats,
  fetchMoralisTokenPairs,
  fetchMoralisTokenOwners,
  fetchGitHubRepoData,
  calculateSecurityScore,
  calculateLiquidityScore,
  calculateTokenomicsScore,
  calculateDevelopmentScore
};

// NOTE: A previous `fetchGeckoTerminalData` alias pointed at Moralis Price.
// It was removed because it caused the API Health dashboard to mislabel
// Moralis as GeckoTerminal. Use `fetchMoralisPriceData` directly instead.

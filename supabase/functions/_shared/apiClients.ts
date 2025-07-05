
// Legacy file - APIs have been refactored into separate modules
// This file is kept for backward compatibility

import { fetchGoPlusSecurity } from './goplusAPI.ts';
import { fetchMoralisPriceData, fetchMoralisMetadata } from './moralisAPI.ts';
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
  fetchGitHubRepoData,
  calculateSecurityScore,
  calculateLiquidityScore,
  calculateTokenomicsScore,
  calculateDevelopmentScore
};

// Keep GeckoTerminalData name for compatibility but use Moralis Price API
export const fetchGeckoTerminalData = fetchMoralisPriceData;

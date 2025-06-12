
import { triggerSecureHubSpotSync } from './secureHubspotSync';

/**
 * Execute the manual HubSpot sync securely
 * Updated to use secure methods without hardcoded credentials
 */
export const executeManualSync = async () => {
  try {
    console.log('🚀 Starting secure manual HubSpot sync execution...');
    
    const result = await triggerSecureHubSpotSync(); // No user ID = sync all users
    
    console.log('✅ Secure manual sync completed successfully:', result);
    console.log(`📊 Results: Synced ${result.synced_count || 0}, Errors: ${result.error_count || 0}`);
    
    if (result.results) {
      console.log('📋 Detailed sync results:', result.results);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Secure manual sync failed:', error);
    throw error;
  }
};

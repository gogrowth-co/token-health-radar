
import { triggerHubSpotSync } from './hubspotSync';

/**
 * Execute the manual HubSpot sync immediately
 * This will be called from the main App component
 */
export const executeManualSync = async () => {
  try {
    console.log('🚀 Starting manual HubSpot sync execution...');
    
    const result = await triggerHubSpotSync(); // No user ID = sync all users
    
    console.log('✅ Manual sync completed successfully:', result);
    console.log(`📊 Results: Synced ${result.synced_count || 0}, Errors: ${result.error_count || 0}`);
    
    if (result.results) {
      console.log('📋 Detailed sync results:', result.results);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Manual sync failed:', error);
    throw error;
  }
};

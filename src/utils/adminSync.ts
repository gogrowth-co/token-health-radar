
import { bulkSyncUsersToHubSpot } from './hubspotSync';

/**
 * Administrative function to manually sync all users to HubSpot
 * Run this in the browser console to trigger a bulk sync
 */
export const runBulkHubSpotSync = async () => {
  try {
    console.log('🚀 Starting administrative bulk HubSpot sync...');
    
    const result = await bulkSyncUsersToHubSpot();
    
    console.log('✅ Bulk sync completed successfully:', result);
    console.log(`📊 Synced: ${result.synced_count}, Errors: ${result.error_count}`);
    
    if (result.results) {
      console.log('📋 Detailed results:', result.results);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Bulk sync failed:', error);
    throw error;
  }
};

// Make it available globally for console access
if (typeof window !== 'undefined') {
  (window as any).runBulkHubSpotSync = runBulkHubSpotSync;
}


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

/**
 * Test function to check HubSpot connectivity
 */
export const testHubSpotConnection = async () => {
  try {
    console.log('🔍 Testing HubSpot connection...');
    
    const { supabase } = await import('@/integrations/supabase/client');
    
    const { data, error } = await supabase.functions.invoke('hubspot-sync', {
      body: { test: true }
    });

    if (error) {
      console.error('❌ HubSpot connection test failed:', error);
      return { success: false, error };
    }

    console.log('✅ HubSpot connection test successful:', data);
    return { success: true, data };
  } catch (error) {
    console.error('❌ HubSpot connection test error:', error);
    return { success: false, error };
  }
};

// Make functions available globally for console access
if (typeof window !== 'undefined') {
  (window as any).runBulkHubSpotSync = runBulkHubSpotSync;
  (window as any).testHubSpotConnection = testHubSpotConnection;
  console.log('🔧 Admin HubSpot functions available:');
  console.log('- runBulkHubSpotSync() - Sync all users to HubSpot');
  console.log('- testHubSpotConnection() - Test HubSpot API connection');
}


import { bulkSyncUsersToHubSpot } from './hubspotSync';
import { checkAdminPermissions } from './secureHubspotSync';

/**
 * Secure administrative functions for HubSpot sync
 * Updated with proper permission checks and secure methods
 */

/**
 * Administrative function to manually sync all users to HubSpot securely
 */
export const runBulkHubSpotSync = async () => {
  try {
    console.log('🚀 Starting secure administrative bulk HubSpot sync...');
    
    // Check admin permissions
    const hasPermission = await checkAdminPermissions();
    if (!hasPermission) {
      console.error('❌ Insufficient permissions for bulk sync');
      throw new Error('Administrative permissions required');
    }
    
    const result = await bulkSyncUsersToHubSpot();
    
    console.log('✅ Secure bulk sync completed successfully:', result);
    console.log(`📊 Synced: ${result.synced_count}, Errors: ${result.error_count}`);
    
    if (result.results) {
      console.log('📋 Detailed results:', result.results);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Secure bulk sync failed:', error);
    throw error;
  }
};

/**
 * Test function to check HubSpot connectivity securely
 */
export const testHubSpotConnection = async () => {
  try {
    console.log('🔍 Testing HubSpot connection securely...');
    
    // Check admin permissions first
    const hasPermission = await checkAdminPermissions();
    if (!hasPermission) {
      console.error('❌ Insufficient permissions for connection test');
      return { success: false, error: 'Administrative permissions required' };
    }
    
    const { supabase } = await import('@/integrations/supabase/client');
    
    const { data, error } = await supabase.functions.invoke('hubspot-sync', {
      body: { test: true }
    });

    if (error) {
      console.error('❌ HubSpot connection test failed:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ HubSpot connection test successful:', data);
    return { success: true, data };
  } catch (error) {
    console.error('❌ HubSpot connection test error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Only make functions available globally in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).runBulkHubSpotSync = runBulkHubSpotSync;
  (window as any).testHubSpotConnection = testHubSpotConnection;
  console.log('🔧 Secure admin HubSpot functions available in development:');
  console.log('- runBulkHubSpotSync() - Sync all users to HubSpot (requires admin permissions)');
  console.log('- testHubSpotConnection() - Test HubSpot API connection (requires admin permissions)');
}


import { triggerSecureHubSpotSync } from './secureHubspotSync';
import { createSecureErrorMessage } from './secureValidation';

/**
 * Secure administrative functions for HubSpot sync
 * Updated with enhanced security and proper permission checks
 */

/**
 * Check if user has admin permissions (enhanced security)
 */
const checkAdminPermissions = async (): Promise<boolean> => {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return false;
    }
    
    // In production, this should check against a proper admin role system
    // For now, this is a placeholder that requires manual verification
    const adminEmails = [
      // Add admin emails here when needed
    ];
    
    return adminEmails.includes(user.email || '');
  } catch (error) {
    console.error('❌ Error checking admin permissions:', error);
    return false;
  }
};

/**
 * Administrative function to manually sync all users to HubSpot securely
 */
export const runBulkHubSpotSync = async () => {
  try {
    console.log('🚀 Starting secure administrative bulk HubSpot sync...');
    
    // Check admin permissions
    const hasPermission = await checkAdminPermissions();
    if (!hasPermission) {
      const error = new Error('Administrative permissions required for bulk sync operations');
      console.error('❌ Insufficient permissions for bulk sync');
      throw error;
    }
    
    // Call the secure sync function without user_id to sync all users
    const result = await triggerSecureHubSpotSync();
    
    console.log('✅ Secure bulk sync completed successfully:', result);
    
    if (result.synced_count !== undefined) {
      console.log(`📊 Synced: ${result.synced_count}, Errors: ${result.error_count || 0}`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Secure bulk sync failed:', error);
    throw new Error(createSecureErrorMessage(error, 'Bulk HubSpot sync failed'));
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
      return { 
        success: false, 
        error: createSecureErrorMessage(
          'Administrative permissions required', 
          'Connection test failed'
        )
      };
    }
    
    const { supabase } = await import('@/integrations/supabase/client');
    
    const { data, error } = await supabase.functions.invoke('hubspot-sync', {
      body: { test: true }
    });

    if (error) {
      console.error('❌ HubSpot connection test failed:', error);
      return { 
        success: false, 
        error: createSecureErrorMessage(error, 'HubSpot connection test failed')
      };
    }

    console.log('✅ HubSpot connection test successful');
    return { success: true, data };
  } catch (error) {
    console.error('❌ HubSpot connection test error:', error);
    return { 
      success: false, 
      error: createSecureErrorMessage(error, 'HubSpot connection test failed')
    };
  }
};

// Security: Only expose functions in development mode with proper warnings
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).runBulkHubSpotSync = runBulkHubSpotSync;
  (window as any).testHubSpotConnection = testHubSpotConnection;
  console.log('🔧 Secure admin HubSpot functions available in development mode only:');
  console.log('- runBulkHubSpotSync() - Requires admin permissions');
  console.log('- testHubSpotConnection() - Requires admin permissions');
  console.log('⚠️  These functions are disabled in production for security');
}


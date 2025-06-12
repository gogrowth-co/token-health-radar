
import { triggerSecureHubSpotSync, syncCurrentUserToHubSpotSecurely } from './secureHubspotSync';

/**
 * Legacy HubSpot sync functions - updated to use secure methods
 * These maintain backward compatibility while using secure implementations
 */

/**
 * @deprecated Use triggerSecureHubSpotSync instead
 */
export const triggerHubSpotSync = triggerSecureHubSpotSync;

/**
 * @deprecated Use syncCurrentUserToHubSpotSecurely instead
 */
export const syncCurrentUserToHubSpot = syncCurrentUserToHubSpotSecurely;

/**
 * Bulk sync all users to HubSpot using secure methods
 */
export const bulkSyncUsersToHubSpot = async () => {
  try {
    console.log('📦 Starting secure bulk HubSpot sync for all users');
    
    const result = await triggerSecureHubSpotSync(); // No user ID = sync all
    
    console.log('✅ Secure bulk sync completed:', result);
    return result;
  } catch (error) {
    console.error('❌ Failed to securely bulk sync users to HubSpot:', error);
    throw error;
  }
};

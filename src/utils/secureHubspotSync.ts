
import { supabase } from "@/integrations/supabase/client";

/**
 * Secure HubSpot sync utilities that don't expose sensitive data
 */

/**
 * Trigger HubSpot sync for a specific user securely
 * This replaces the old function that had hardcoded service keys
 */
export const triggerSecureHubSpotSync = async (userId?: string) => {
  try {
    console.log('🔄 Triggering secure HubSpot sync for user:', userId || 'all users');
    
    // Use the edge function with proper authentication
    const { data, error } = await supabase.functions.invoke('hubspot-sync', {
      body: { user_id: userId }
    });

    if (error) {
      console.error('❌ Error triggering secure HubSpot sync:', error.message);
      throw new Error('HubSpot sync failed');
    }

    console.log('✅ Secure HubSpot sync completed successfully');
    return data;
  } catch (error) {
    console.error('💥 Failed to trigger secure HubSpot sync:', error);
    throw error;
  }
};

/**
 * Sync current authenticated user to HubSpot securely
 */
export const syncCurrentUserToHubSpotSecurely = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('⚠️ No authenticated user found for HubSpot sync');
      return;
    }

    console.log('👤 Syncing current authenticated user to HubSpot');
    await triggerSecureHubSpotSync(user.id);
  } catch (error) {
    console.error('❌ Failed to sync current user to HubSpot securely:', error);
    throw error;
  }
};

/**
 * Check if user has permission to perform admin operations
 */
export const checkAdminPermissions = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return false;
    }
    
    // In a real app, you'd check user roles from your database
    // For now, this is a placeholder that always returns false for non-admin operations
    return false;
  } catch (error) {
    console.error('❌ Error checking admin permissions:', error);
    return false;
  }
};


import { supabase } from "@/integrations/supabase/client";

/**
 * Trigger HubSpot sync for a specific user or all users
 * @param userId - Optional user ID to sync specific user, if not provided syncs all users
 */
export const triggerHubSpotSync = async (userId?: string) => {
  try {
    console.log('Triggering HubSpot sync for user:', userId || 'all users');
    
    const { data, error } = await supabase.functions.invoke('hubspot-sync', {
      body: { user_id: userId }
    });

    if (error) {
      console.error('Error triggering HubSpot sync:', error);
      throw error;
    }

    console.log('HubSpot sync completed:', data);
    return data;
  } catch (error) {
    console.error('Failed to trigger HubSpot sync:', error);
    throw error;
  }
};

/**
 * Sync current user to HubSpot
 */
export const syncCurrentUserToHubSpot = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('No authenticated user found');
      return;
    }

    await triggerHubSpotSync(user.id);
  } catch (error) {
    console.error('Failed to sync current user to HubSpot:', error);
    throw error;
  }
};

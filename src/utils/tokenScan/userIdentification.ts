
import { supabase } from "@/integrations/supabase/client";

/**
 * Get user identifier for rate limiting and authentication
 */
export const getUserIdentifier = async (): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || 'anonymous';
};

/**
 * Get current user session with validation
 */
export const getCurrentUserSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};


import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/components/ui/use-toast";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  isAuthenticated: false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const maxRetries = 3;
    
    // Enhanced session initialization with retry logic
    const initializeAuth = async () => {
      if (!mounted) return;
      
      try {
        console.log('Auth Context - Initializing authentication...');
        setLoading(true);
        
        // Set up auth state listener FIRST to catch any auth events
        const { data: authListener } = supabase.auth.onAuthStateChange(
          (event, newSession) => {
            if (!mounted) return;
            
            try {
              console.log('Auth Context - State change:', { 
                event, 
                hasSession: !!newSession,
                userId: newSession?.user?.id,
                userEmail: newSession?.user?.email
              });
              
              setSession(newSession);
              setUser(newSession?.user || null);
              
              // Only set loading to false after we have processed the auth state
              if (event !== 'INITIAL_SESSION') {
                setLoading(false);
              }
            } catch (error) {
              console.error('Auth Context - Error processing auth state change:', error);
            }
          }
        );

        // Then check for existing session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Auth Context - Error getting session:', sessionError);
          
          // Retry logic for session retrieval
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`Auth Context - Retrying session retrieval (${retryCount}/${maxRetries})...`);
            setTimeout(() => initializeAuth(), 1000 * retryCount);
            return;
          }
        }
        
        if (mounted) {
          console.log('Auth Context - Session retrieved:', { 
            hasSession: !!sessionData.session,
            userId: sessionData.session?.user?.id,
            userEmail: sessionData.session?.user?.email
          });
          
          setSession(sessionData.session);
          setUser(sessionData.session?.user || null);
          setLoading(false);
        }

        return () => {
          if (authListener?.subscription) {
            authListener.subscription.unsubscribe();
          }
        };
        
      } catch (error) {
        console.error('Auth Context - Unexpected error during initialization:', error);
        
        if (mounted && retryCount < maxRetries) {
          retryCount++;
          console.log(`Auth Context - Retrying initialization (${retryCount}/${maxRetries})...`);
          setTimeout(() => initializeAuth(), 1000 * retryCount);
        } else if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      console.log('Auth signup started');
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`
        }
      });

      if (error) {
        console.error('Signup error:', error);
        toast({
          title: "Registration failed",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      }

      console.log('Auth signup successful');
      toast({
        title: "Registration successful",
        description: "Please check your email for the confirmation link.",
      });

    } catch (error: any) {
      console.error('Error during sign up:', error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('Auth signin started');
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Signin error:', error);
        toast({
          title: "Login failed",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      }

      console.log('Auth signin successful');
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });

    } catch (error: any) {
      console.error('Error during sign in:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      console.log('Auth signout started');
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Signout error:', error);
        toast({
          title: "Sign out failed",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      }

      console.log('Auth signout successful');
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });

    } catch (error: any) {
      console.error('Error during sign out:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        signIn,
        signUp,
        signOut,
        isAuthenticated: !!session,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

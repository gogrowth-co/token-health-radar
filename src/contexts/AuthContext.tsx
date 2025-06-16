
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
    
    // Initial session check with enhanced error handling
    const getSession = async () => {
      if (!mounted) return;
      
      setLoading(true);
      
      try {
        console.log('Auth session check started');
        
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting auth session:', error);
        }
        
        if (mounted) {
          setSession(data.session);
          setUser(data.session?.user || null);
          console.log('Auth session check complete:', { 
            hasSession: !!data.session 
          });
        }
      } catch (error: any) {
        console.error('Unexpected error during auth check:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getSession();

    // Subscribe to auth changes with enhanced error handling
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        try {
          console.log('Auth state change:', event, !!newSession);
          
          if (mounted) {
            setSession(newSession);
            setUser(newSession?.user || null);
            setLoading(false);
            
            console.log('Auth state change processed:', { 
              event, 
              hasSession: !!newSession 
            });
          }
        } catch (error: any) {
          console.error('Error in auth state change handler:', error);
        }
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
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

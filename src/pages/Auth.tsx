
import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [googleAuthAttempted, setGoogleAuthAttempted] = useState(false);
  const navigate = useNavigate();
  const { signIn, signUp, isAuthenticated, loading } = useAuth();
  
  // Handle login success and redirect based on saved search
  useEffect(() => {
    // Skip if not authenticated or still loading
    if (!isAuthenticated || loading) return;

    console.log('Auth redirect check:', { 
      hasAuth: isAuthenticated,
      isLoading: loading 
    });

    // Check if we have a saved token search to continue with
    const pendingTokenSearch = localStorage.getItem("pendingTokenSearch");
    if (pendingTokenSearch) {
      console.log("Found pending token search:", pendingTokenSearch);
      // Clear the pending search from localStorage
      localStorage.removeItem("pendingTokenSearch");

      // Check if the token looks like an address
      const isAddress = /^(0x)?[0-9a-fA-F]{40}$/.test(pendingTokenSearch);
      
      if (isAddress) {
        // If it looks like an address, go directly to scan loading with 'token' parameter
        console.log("Pending search is an address, redirecting to scan-loading");
        navigate(`/scan-loading?token=${pendingTokenSearch}`);
      } else {
        // If it's a name, go to confirm
        console.log("Pending search is a name, redirecting to confirm");
        navigate(`/confirm?token=${encodeURIComponent(pendingTokenSearch)}`);
      }
    } else {
      // Default redirect to dashboard
      console.log("No pending token search, redirecting to dashboard");
      navigate("/dashboard");
    }
  }, [isAuthenticated, loading, navigate]);
  
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Missing information",
        description: "Please provide both email and password.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await signIn(email, password);
    } catch (error: any) {
      console.error("Sign in error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Missing information",
        description: "Please provide both email and password.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await signUp(email, password);
      toast({
        title: "Registration successful",
        description: "Please check your email for the confirmation link.",
      });
    } catch (error: any) {
      console.error("Sign up error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsSubmitting(true);
    setGoogleAuthAttempted(true);
    
    try {
      console.log('Google auth attempt started');
      
      // Add timeout for Google auth
      const authPromise = supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/auth',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });
      
      // Set a timeout for the auth request
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Google auth timeout')), 10000)
      );
      
      const { error } = await Promise.race([authPromise, timeoutPromise]) as any;
      
      if (error) {
        console.error('Google OAuth error:', error);
        
        toast({
          title: "Google authentication failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        console.log('Google auth attempt successful');
      }
    } catch (error: any) {
      console.error("Google auth error:", error);
      
      // Handle specific error types
      if (error.message === 'Google auth timeout') {
        toast({
          title: "Authentication timeout",
          description: "Google authentication is taking too long. Please try again.",
          variant: "destructive",
        });
      } else if (error.name === 'PopupBlockedError') {
        toast({
          title: "Popup blocked",
          description: "Please allow popups for this site and try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Google authentication failed",
          description: "An error occurred during Google authentication. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (loading || isAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>{isAuthenticated ? "Redirecting..." : "Loading..."}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex min-h-screen">
      <Helmet>
        <title>Sign In | Token Health Scan</title>
        <meta name="description" content="Sign in to your Token Health Scan account to access advanced token analysis and track your scan history." />
        <link rel="canonical" href="https://tokenhealthscan.com/auth" />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      {/* Left panel with branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary text-primary-foreground p-8 flex-col justify-center">
        <div className="max-w-md mx-auto">
          <h1 className="text-3xl font-bold mb-6">Token Health Scan</h1>
          <p className="text-xl opacity-90 mb-6">
            Scan any token and get a free health report across 5 key risk factors.
          </p>
          <div className="grid gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span>Security risk assessment</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span>Liquidity analysis</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span>Tokenomics evaluation</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span>Community metrics</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span>Development activity</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right panel with auth forms */}
      <div className="w-full lg:w-1/2 p-8 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Welcome to Token Health Scan</CardTitle>
            <CardDescription>
              Sign in to your account or create a new one to start scanning tokens
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="register">Sign Up</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <div className="space-y-4">
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={handleGoogleAuth}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    )}
                    Continue with Google
                  </Button>
                  
                  {googleAuthAttempted && (
                    <div className="text-xs text-muted-foreground text-center">
                      Having trouble? Make sure popups are enabled for this site.
                    </div>
                  )}
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <Separator className="w-full" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>

                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="your@email.com" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input 
                        id="password" 
                        type="password" 
                        placeholder="••••••••" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Signing In...
                        </>
                      ) : "Sign In"}
                    </Button>
                  </form>
                </div>
                <div className="mt-4 text-center text-sm">
                  <p>
                    Don't have an account?{" "}
                    <button 
                      type="button"
                      onClick={() => setActiveTab("register")}
                      className="text-primary hover:underline font-medium"
                    >
                      Create one
                    </button>
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="register">
                <div className="space-y-4">
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={handleGoogleAuth}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    )}
                    Continue with Google
                  </Button>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <Separator className="w-full" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>

                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-email">Email</Label>
                      <Input 
                        id="register-email" 
                        type="email" 
                        placeholder="your@email.com" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password">Password</Label>
                      <Input 
                        id="register-password" 
                        type="password" 
                        placeholder="••••••••" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Password must be at least 6 characters long
                      </p>
                    </div>
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating Account...
                        </>
                      ) : "Create Account"}
                    </Button>
                  </form>
                </div>
                <div className="mt-4 text-center text-sm">
                  <p>
                    Already have an account?{" "}
                    <button 
                      type="button"
                      onClick={() => setActiveTab("login")}
                      className="text-primary hover:underline font-medium"
                    >
                      Sign in
                    </button>
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <div className="text-sm text-muted-foreground text-center w-full">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </div>
            <Button variant="outline" className="w-full" onClick={() => navigate("/")}>
              Back to Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

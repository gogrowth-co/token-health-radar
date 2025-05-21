
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const navigate = useNavigate();
  const { signIn, signUp, isAuthenticated, loading } = useAuth();
  
  // Check if there's a pending token search
  useEffect(() => {
    if (isAuthenticated) {
      const pendingTokenSearch = localStorage.getItem("pendingTokenSearch");
      
      if (pendingTokenSearch) {
        localStorage.removeItem("pendingTokenSearch");
        const isAddress = /^(0x)?[0-9a-fA-F]{40}$/.test(pendingTokenSearch);
        
        if (isAddress) {
          navigate(`/scan-loading?address=${pendingTokenSearch}`);
        } else {
          navigate(`/confirm?token=${encodeURIComponent(pendingTokenSearch)}`);
        }
      } else {
        navigate("/dashboard");
      }
    }
  }, [isAuthenticated, navigate]);
  
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

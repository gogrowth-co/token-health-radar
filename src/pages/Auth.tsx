
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";
import { Search, Shield, Droplet, BarChart3, Globe, Code } from "lucide-react";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  // If user is already authenticated, redirect to the appropriate page
  useEffect(() => {
    if (isAuthenticated) {
      const pendingSearch = localStorage.getItem("pendingTokenSearch");
      
      if (pendingSearch) {
        localStorage.removeItem("pendingTokenSearch");
        
        // Check if input looks like an address
        const isAddress = /^(0x)?[0-9a-fA-F]{40}$/.test(pendingSearch);
        
        if (isAddress) {
          navigate(`/scan-loading?address=${pendingSearch}`);
        } else {
          navigate(`/confirm?token=${pendingSearch}`);
        }
      } else {
        navigate("/dashboard");
      }
    }
  }, [isAuthenticated, navigate]);
  
  const handleAuth = async (action: "login" | "signup") => {
    if (!email || !password) {
      toast({
        title: "Missing credentials",
        description: "Please provide both email and password",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      if (action === "login") {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
    } catch (error: any) {
      // Error handling is done in the AuthContext
      console.error(`Authentication error:`, error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Left column - Project info */}
          <div className="space-y-6 text-center md:text-left">
            <div className="flex flex-col items-center md:items-start gap-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center">
                  <Search className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold">Token Health Scan</h1>
              </div>
              
              <p className="text-xl font-medium">
                Scan any token and get a free health report across 5 key risk factors.
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4">
              <div className="flex flex-col items-center p-4 bg-card rounded-lg border">
                <Shield className="h-6 w-6 text-primary mb-2" />
                <span className="text-sm font-medium">Security</span>
              </div>
              
              <div className="flex flex-col items-center p-4 bg-card rounded-lg border">
                <Droplet className="h-6 w-6 text-primary mb-2" />
                <span className="text-sm font-medium">Liquidity</span>
              </div>
              
              <div className="flex flex-col items-center p-4 bg-card rounded-lg border">
                <BarChart3 className="h-6 w-6 text-primary mb-2" />
                <span className="text-sm font-medium">Tokenomics</span>
              </div>
              
              <div className="flex flex-col items-center p-4 bg-card rounded-lg border">
                <Globe className="h-6 w-6 text-primary mb-2" />
                <span className="text-sm font-medium">Community</span>
              </div>
              
              <div className="flex flex-col items-center p-4 bg-card rounded-lg border">
                <Code className="h-6 w-6 text-primary mb-2" />
                <span className="text-sm font-medium">Development</span>
              </div>
            </div>
          </div>
          
          {/* Right column - Auth form */}
          <div>
            <Card className="w-full">
              <CardHeader>
                <CardTitle>Welcome to Token Health Scan</CardTitle>
                <CardDescription>
                  Sign in to continue or create a new account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="login" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login">Login</TabsTrigger>
                    <TabsTrigger value="signup">Sign Up</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="login">
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="email-login">Email</Label>
                        <Input
                          id="email-login"
                          type="email"
                          placeholder="Enter your email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="password-login">Password</Label>
                        <Input
                          id="password-login"
                          type="password"
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                      </div>
                      
                      <Button 
                        className="w-full" 
                        onClick={() => handleAuth("login")}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Signing in...
                          </>
                        ) : (
                          "Sign In"
                        )}
                      </Button>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="signup">
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="email-signup">Email</Label>
                        <Input
                          id="email-signup"
                          type="email"
                          placeholder="Enter your email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="password-signup">Password</Label>
                        <Input
                          id="password-signup"
                          type="password"
                          placeholder="Choose a password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                      </div>
                      
                      <Button 
                        className="w-full" 
                        onClick={() => handleAuth("signup")}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating account...
                          </>
                        ) : (
                          "Create Account"
                        )}
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
                
                <div className="mt-6">
                  <Separator className="my-4" />
                  <p className="text-sm text-center text-muted-foreground">
                    By signing up, you agree to our Terms of Service and Privacy Policy
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

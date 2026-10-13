import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

// Two steps on one page:
// 1. No recovery session: ask for the email and send the reset link.
// 2. Opened from that link: Supabase signs the user in with a recovery
//    session (PASSWORD_RECOVERY event), so ask for the new password.
export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  // The recovery link puts type=recovery in the URL hash before the client parses it.
  const [isRecovery, setIsRecovery] = useState(
    () => window.location.hash.includes("type=recovery")
  );
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setIsRecovery(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/reset-password",
      });
      if (error) throw error;
      setLinkSent(true);
    } catch (error: any) {
      console.error("Reset link error:", error);
      toast({
        title: "Could not send the reset link",
        description: error.message || "Please try again in a minute.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Use at least 6 characters.",
        variant: "destructive",
      });
      return;
    }
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Type the same password in both fields.",
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: "Password updated", description: "You're signed in." });
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Update password error:", error);
      toast({
        title: "Could not update your password",
        description: error.message || "The link may have expired. Request a new one.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <Helmet>
        <title>Reset Password | Token Health Scan</title>
        <link rel="canonical" href="https://tokenhealthscan.com/reset-password" />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <Card className="w-full max-w-md">
        {isRecovery ? (
          <>
            <CardHeader>
              <CardTitle>Set a new password</CardTitle>
              <CardDescription>Choose a password with at least 6 characters.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm new password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : "Save new password"}
                </Button>
              </form>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader>
              <CardTitle>Reset your password</CardTitle>
              <CardDescription>
                {linkSent
                  ? "If an account exists for that email, a reset link is on its way. Check your inbox and spam folder."
                  : "Enter your account email and I'll send you a link to set a new password."}
              </CardDescription>
            </CardHeader>
            {!linkSent && (
              <CardContent>
                <form onSubmit={handleSendLink} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : "Send reset link"}
                  </Button>
                </form>
              </CardContent>
            )}
          </>
        )}
        <CardFooter>
          <Button variant="outline" className="w-full" onClick={() => navigate("/auth")}>
            Back to Sign In
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

// Opting out takes a click. Email security scanners open every link in a message, so a link that
// unsubscribed on visit would opt people out without them knowing (ENG-075). Only the POST below changes anything.
const FN_URL = "https://qaqebpcqespvzbfwawlp.supabase.co/functions/v1/lifecycle-emails";

type State = "idle" | "sending" | "done" | "error" | "invalid";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const unsub = params.get("unsub") || "";
  const sig = params.get("sig") || "";
  const valid = /^[0-9a-f-]{36}$/.test(unsub) && /^[0-9a-f]{64}$/.test(sig);
  const [state, setState] = useState<State>(valid ? "idle" : "invalid");

  const confirm = async () => {
    setState("sending");
    try {
      const qs = new URLSearchParams({ unsub, sig }).toString();
      const res = await fetch(`${FN_URL}?${qs}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "List-Unsubscribe=One-Click",
      });
      setState(res.ok ? "done" : res.status === 403 ? "invalid" : "error");
    } catch {
      setState("error");
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Helmet>
        <title>Email preferences | Token Health Scan</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <Navbar />
      <main className="flex-1 container px-4 py-16">
        <div className="max-w-md mx-auto">
          {state === "invalid" && (
            <>
              <h1 className="text-2xl font-bold mb-4">This link is not valid</h1>
              <p className="text-muted-foreground">
                Use the unsubscribe link in your latest email, or reply to any email and I'll remove you by hand.
              </p>
            </>
          )}
          {(state === "idle" || state === "sending") && (
            <>
              <h1 className="text-2xl font-bold mb-4">Stop tip emails?</h1>
              <p className="text-muted-foreground mb-6">
                You'll stop getting tips from Token Health Scan. You'll still get emails about your account and billing.
              </p>
              <Button onClick={confirm} disabled={state === "sending"}>
                {state === "sending" ? "Unsubscribing..." : "Unsubscribe from tips"}
              </Button>
            </>
          )}
          {state === "done" && (
            <>
              <h1 className="text-2xl font-bold mb-4">You're unsubscribed</h1>
              <p className="text-muted-foreground">
                No more tip emails. You'll still get emails about your account and billing.
              </p>
            </>
          )}
          {state === "error" && (
            <>
              <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
              <p className="text-muted-foreground mb-6">
                Try again, or reply to any email and I'll remove you by hand.
              </p>
              <Button onClick={confirm}>Try again</Button>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

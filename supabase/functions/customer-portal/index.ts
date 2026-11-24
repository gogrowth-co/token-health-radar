
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@12.18.0?dts";
import { billingReturnUrl } from "../_shared/billingReturnUrl.ts";

// Initialize Stripe with the secret key
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Helper function for logging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CUSTOMER-PORTAL] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    logStep("Function started");
    
    // Validate Stripe key is set
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      logStep("ERROR: Missing Stripe secret key");
      return new Response(JSON.stringify({ error: "Billing service is unavailable" }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    logStep("Stripe key verified");

    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("ERROR: Missing authorization header");
      return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    logStep("Authorization header found");

    // Extract the token
    const token = authHeader.replace("Bearer ", "");
    
    // Get user information from the token
    logStep("Authenticating user with token");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      logStep("Authentication error", { error: userError });
      return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    logStep("User authenticated", { userId: user.id });

    const body = await req.json();
    const returnUrl = billingReturnUrl(body.returnUrl);
    if (!returnUrl) return new Response(JSON.stringify({ error: "Invalid billing return URL" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    
    if (!returnUrl) {
      logStep("ERROR: Missing return URL");
      throw new Error("Missing return URL");
    }
    logStep("Return URL validated", { returnUrl });

    // Get the user's Stripe customer ID
    logStep("Fetching Stripe customer ID");
    const { data: subscriberData, error: subscriberError } = await supabase
      .from("subscribers")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (subscriberError || !subscriberData?.stripe_customer_id) {
      logStep("ERROR: No Stripe customer ID found", { error: subscriberError });
      return new Response(JSON.stringify({ error: "No active billing profile found" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    logStep("Found Stripe customer ID", { customerId: subscriberData.stripe_customer_id });

    const customerId = subscriberData.stripe_customer_id;

    // Create a billing portal session
    logStep("Creating billing portal session");
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });
      logStep("Billing portal session created", { sessionId: session.id, url: session.url });

      return new Response(
        JSON.stringify({ url: session.url }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    } catch (stripeError) {
      console.error("[CUSTOMER-PORTAL] Error creating billing portal session");
      return new Response(JSON.stringify({ error: "Could not open billing portal" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (error) {
    console.error("[CUSTOMER-PORTAL] Unexpected error creating portal session");
    
    return new Response(
      JSON.stringify({ error: "Could not open billing portal" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});

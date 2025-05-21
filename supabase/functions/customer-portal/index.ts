
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@12.18.0?dts";

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
      throw new Error("STRIPE_SECRET_KEY is not configured in Supabase secrets");
    }
    logStep("Stripe key verified");

    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("ERROR: Missing authorization header");
      throw new Error("No authorization header");
    }
    logStep("Authorization header found");

    // Extract the token
    const token = authHeader.replace("Bearer ", "");
    
    // Get user information from the token
    logStep("Authenticating user with token");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      logStep("Authentication error", { error: userError });
      throw new Error("Invalid user token");
    }
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { returnUrl } = await req.json();
    
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
      throw new Error("User does not have a Stripe customer ID");
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
      logStep("Error creating billing portal session", { error: stripeError });
      throw new Error(`Stripe error: ${stripeError instanceof Error ? stripeError.message : 'Unknown error'}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`Error creating portal session: ${errorMessage}`);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});

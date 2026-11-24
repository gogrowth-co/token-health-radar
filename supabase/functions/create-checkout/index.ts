
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

// Helper function to log steps for better debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
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

    // Parse request body to get plan type
    const requestBody = await req.json();
    const { priceId } = requestBody;
    const successUrl = billingReturnUrl(requestBody.successUrl);
    const cancelUrl = billingReturnUrl(requestBody.cancelUrl);
    if (!successUrl || !cancelUrl) return new Response(JSON.stringify({ error: "Invalid billing return URL" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    
    if (!priceId || !successUrl || !cancelUrl) {
      logStep("ERROR: Missing required parameters");
      return new Response(JSON.stringify({ error: "Missing required checkout parameters" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    logStep("Request parameters validated", { priceId, successUrl, cancelUrl });

    // Check if this user already has a Stripe customer ID
    logStep("Checking for existing Stripe customer");
    const { data: subscriberData, error: subscriberError } = await supabase
      .from("subscribers")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (subscriberError && subscriberError.code !== 'PGRST116') {
      logStep("Error fetching subscriber data", { error: subscriberError });
      return new Response(JSON.stringify({ error: "Could not load billing profile" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let customerId: string | null = null;
    
    // If we already have a customer ID, use it
    if (subscriberData?.stripe_customer_id) {
      customerId = subscriberData.stripe_customer_id;
      logStep("Using existing customer ID", { customerId });
    } else {
      // Otherwise create a new customer
      logStep("Creating new Stripe customer");
      try {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            user_id: user.id,
          },
        });
        customerId = customer.id;
        logStep("Created new customer ID", { customerId });
        
        // Update the subscriber record with the new customer ID
        const { error: updateError } = await supabase
          .from("subscribers")
          .update({ stripe_customer_id: customerId })
          .eq("id", user.id);

        if (updateError) {
          logStep("Error updating subscriber with customer ID", { error: updateError });
          console.error("Warning: Failed to update subscriber record with customer ID");
          // Continue anyway since we have the customer ID
        }
      } catch (stripeError) {
        console.error("[CREATE-CHECKOUT] Error creating Stripe customer");
        return new Response(JSON.stringify({ error: "Could not initialize billing profile" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Validate the price ID before creating a checkout session
    try {
      logStep("Validating price ID", { priceId });
      await stripe.prices.retrieve(priceId);
      logStep("Price ID is valid");
    } catch (priceError) {
      console.error("[CREATE-CHECKOUT] Invalid price ID");
      return new Response(JSON.stringify({ error: "Invalid subscription plan" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create a checkout session
    logStep("Creating checkout session");
    try {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [{
          price: priceId,
          quantity: 1,
        }],
        mode: "subscription",
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          user_id: user.id,
        },
      });

      logStep("Checkout session created", { sessionId: session.id, url: session.url });

      return new Response(
        JSON.stringify({ url: session.url }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    } catch (stripeError: any) {
      console.error("[CREATE-CHECKOUT] Stripe checkout creation error");
      const errorMessage = stripeError?.type === 'StripeInvalidRequestError' && stripeError?.param === 'price'
        ? "Invalid subscription plan"
        : "Failed to create checkout session";
      
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
  } catch (error) {
    console.error("[CREATE-CHECKOUT] Unexpected error creating checkout session");
    
    return new Response(
      JSON.stringify({ error: "Failed to create checkout session" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});

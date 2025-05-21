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
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    logStep("Stripe key verified");

    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
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

    // Parse request body to get plan type
    const requestBody = await req.json();
    const { priceId, successUrl, cancelUrl } = requestBody;
    
    if (!priceId || !successUrl || !cancelUrl) {
      throw new Error("Missing required parameters: priceId, successUrl, or cancelUrl");
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
      throw new Error(`Database error: ${subscriberError.message}`);
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
        logStep("Error creating Stripe customer", { error: stripeError });
        throw new Error(`Stripe error: ${stripeError instanceof Error ? stripeError.message : 'Unknown error'}`);
      }
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
      logStep("Stripe checkout creation error", { error: stripeError });
      
      // Return a more detailed error for better debugging
      let errorMessage = "Failed to create checkout session";
      if (stripeError instanceof Error) {
        errorMessage = stripeError.message;
      }
      
      // Check for common Stripe errors
      if (stripeError.type === 'StripeInvalidRequestError' && stripeError.param === 'price') {
        errorMessage = "Invalid or non-existent price ID. Please check your Stripe dashboard for correct price IDs.";
      }
      
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`Error creating checkout session: ${errorMessage}`);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});

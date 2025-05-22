
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

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!webhookSecret) {
    return new Response(
      JSON.stringify({ error: "Webhook secret not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Get the signature from the header
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response(
        JSON.stringify({ error: "No signature provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the raw request body
    const body = await req.text();
    
    // Verify signature and construct the event
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );

    console.log(`Processing webhook event: ${event.type}`);

    // Handle the event based on its type
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        await handleCheckoutCompleted(session);
        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        await handleSubscriptionUpdated(subscription);
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object;
        await handleInvoicePaid(invoice);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        await handlePaymentFailed(invoice);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error(`Error processing webhook: ${error.message}`);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper function to determine plan from price ID
function getPlanFromPriceId(priceId: string): "free" | "pro" {
  const monthlyPriceId = "price_1RQK5tD41aNWIHmd4YspKxDi";
  const annualPriceId = "price_1RQK5tD41aNWIHmd1p46UCwl";
  
  if (priceId === monthlyPriceId || priceId === annualPriceId) {
    return "pro";
  }
  return "free";
}

// Handle checkout.session.completed event
async function handleCheckoutCompleted(session: any) {
  // Get customer ID and subscription ID from the session
  const { customer, subscription } = session;
  
  if (!customer || !subscription) {
    console.log("Missing customer or subscription ID");
    return;
  }
  
  // Get customer email to match with our users
  const customerData = await stripe.customers.retrieve(customer);
  const email = customerData.email;
  
  if (!email) {
    console.log("Customer email not found");
    return;
  }
  
  // Get subscription details to determine the plan
  const subscriptionData = await stripe.subscriptions.retrieve(subscription);
  const priceId = subscriptionData.items.data[0]?.price.id;
  
  if (!priceId) {
    console.log("Price ID not found in subscription");
    return;
  }
  
  const plan = getPlanFromPriceId(priceId);
  
  // Find user by email instead of directly accessing auth.users
  const { data: userData, error: userError } = await supabase
    .from('subscribers')
    .select('id')
    .eq('email', email)
    .single();
  
  if (userError || !userData) {
    console.log(`User not found for email: ${email}`);
    return;
  }
  
  const userId = userData.id;
  
  // Update the subscriber record
  const { error } = await supabase
    .from('subscribers')
    .update({
      stripe_customer_id: customer,
      stripe_subscription_id: subscription,
      plan: plan,
      pro_scan_limit: 10,  // Reset scan limit to 10
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);
  
  if (error) {
    console.error(`Error updating subscriber: ${error.message}`);
  }
}

// Handle customer.subscription.updated event
async function handleSubscriptionUpdated(subscription: any) {
  const customerId = subscription.customer;
  const subscriptionId = subscription.id;
  const status = subscription.status;
  const priceId = subscription.items.data[0]?.price.id;
  
  if (!customerId || !priceId) {
    console.log("Missing customer ID or price ID");
    return;
  }
  
  const plan = status === "active" ? getPlanFromPriceId(priceId) : "free";
  
  // Find subscriber by Stripe customer ID
  const { data: subscribers, error: findError } = await supabase
    .from('subscribers')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .limit(1);
  
  if (findError || !subscribers || subscribers.length === 0) {
    console.log(`Subscriber not found for customer: ${customerId}`);
    return;
  }
  
  const userId = subscribers[0].id;
  
  // Update subscriber record
  const { error: updateError } = await supabase
    .from('subscribers')
    .update({
      plan: plan,
      pro_scan_limit: plan === "pro" ? 10 : 3,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);
  
  if (updateError) {
    console.error(`Error updating subscriber: ${updateError.message}`);
  }
}

// Handle invoice.paid event
async function handleInvoicePaid(invoice: any) {
  const customerId = invoice.customer;
  const subscriptionId = invoice.subscription;
  
  if (!customerId || !subscriptionId) {
    console.log("Missing customer ID or subscription ID");
    return;
  }
  
  // Find subscriber by Stripe customer ID
  const { data: subscribers, error: findError } = await supabase
    .from('subscribers')
    .select('id, plan')
    .eq('stripe_customer_id', customerId)
    .limit(1);
  
  if (findError || !subscribers || subscribers.length === 0) {
    console.log(`Subscriber not found for customer: ${customerId}`);
    return;
  }
  
  const userId = subscribers[0].id;
  const currentPlan = subscribers[0].plan;
  
  // Only update if this is for a pro plan - in case of other charges
  if (currentPlan === "pro") {
    // Reset the scan limit on successful renewal
    const { error: updateError } = await supabase
      .from('subscribers')
      .update({
        pro_scan_limit: 10,  // Reset to monthly limit
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
    
    if (updateError) {
      console.error(`Error updating scan limit: ${updateError.message}`);
    }
  }
}

// Handle invoice.payment_failed event
async function handlePaymentFailed(invoice: any) {
  // For payment failures, we could send notifications or flag accounts,
  // but we don't immediately downgrade to avoid disruption during retry periods
  console.log(`Payment failed for invoice: ${invoice.id}`);
}

// Handle customer.subscription.deleted event
async function handleSubscriptionDeleted(subscription: any) {
  const customerId = subscription.customer;
  
  if (!customerId) {
    console.log("Missing customer ID");
    return;
  }
  
  // Find subscriber by Stripe customer ID
  const { data: subscribers, error: findError } = await supabase
    .from('subscribers')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .limit(1);
  
  if (findError || !subscribers || subscribers.length === 0) {
    console.log(`Subscriber not found for customer: ${customerId}`);
    return;
  }
  
  const userId = subscribers[0].id;
  
  // Update subscriber record - downgrade to free
  const { error: updateError } = await supabase
    .from('subscribers')
    .update({
      plan: 'free',
      pro_scan_limit: 3,  // Reset to free tier limit
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);
  
  if (updateError) {
    console.error(`Error updating subscriber: ${updateError.message}`);
  }
}

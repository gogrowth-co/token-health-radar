
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

  try {
    console.log("Check scan access function called");
    
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Extract the token
    const token = authHeader.replace("Bearer ", "");
    
    // Get user information from the token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Invalid user token");
    }

    console.log(`User authenticated: ${user.id}`);

    // Check if user is admin first
    const { data: roleData, error: roleError } = await supabase.rpc('get_user_role', {
      _user_id: user.id
    });
    
    const isAdmin = roleData === 'admin';
    console.log(`User admin status: ${isAdmin}, role: ${roleData}, email: ${user.email}`);

    // If user is admin, give them unlimited pro access
    if (isAdmin) {
      console.log(`Admin user detected - granting unlimited pro access`);
      return new Response(
        JSON.stringify({
          canScan: true,
          canSelectToken: true,
          hasPro: true,
          proScanAvailable: true,
          plan: "admin",
          scansUsed: 0,
          scanLimit: 999999
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // A scan result page passes the token it is showing; that spends one Pro
    // scan the first time this user opens that token.
    let body: { token_address?: string; chain_id?: string } = {};
    try {
      body = await req.json();
    } catch {
      // No body: read-only status check.
    }

    if (body.token_address && body.chain_id) {
      const { data: consumeData, error: consumeError } = await supabase.rpc("consume_pro_scan", {
        p_user_id: user.id,
        p_chain_id: String(body.chain_id),
        p_token_address: String(body.token_address),
      });
      if (consumeError) {
        throw new Error(`consume_pro_scan failed: ${consumeError.message}`);
      }
      console.log(`Pro scan check for ${user.id} on ${body.chain_id}:${body.token_address}:`, consumeData);
      return new Response(
        JSON.stringify({
          canScan: true,
          canSelectToken: true,
          hasPro: consumeData.hasPro,
          proScanAvailable: consumeData.hasPro || consumeData.scansUsed < consumeData.scanLimit,
          plan: consumeData.plan,
          scansUsed: consumeData.scansUsed,
          scanLimit: consumeData.scanLimit,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Read-only status: is a Pro scan still available?
    const { data: subscriberData, error: subscriberError } = await supabase
      .from("subscribers")
      .select("plan, scans_used, pro_scan_limit, scans_period_start")
      .eq("id", user.id)
      .single();

    if (subscriberError) {
      console.error(`Error fetching subscriber data: ${subscriberError.message}`);
      return new Response(
        JSON.stringify({
          canScan: true,
          canSelectToken: true,
          plan: "free",
          scansUsed: 0,
          scanLimit: 3,
          hasPro: false,
          proScanAvailable: false,
          error: "Could not retrieve subscriber data"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const plan = subscriberData?.plan || "free";
    const scanLimit = plan === "free" ? 3 : (subscriberData?.pro_scan_limit || 3);
    // Paid plans get a fresh allowance once a month; consume_pro_scan applies
    // the reset, this only reports it.
    const periodStart = subscriberData?.scans_period_start ? new Date(subscriberData.scans_period_start) : new Date();
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const periodExpired = (plan === "pro" || plan === "lifetime") && periodStart < monthAgo;
    const scansUsed = periodExpired ? 0 : (subscriberData?.scans_used || 0);

    const proScanAvailable = scansUsed < scanLimit;
    console.log(`User plan: ${plan}, scans used: ${scansUsed}, scan limit: ${scanLimit}`);

    return new Response(
      JSON.stringify({
        canScan: true,
        canSelectToken: true,
        hasPro: proScanAvailable,
        proScanAvailable,
        plan,
        scansUsed,
        scanLimit
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error(`Error checking scan access: ${(error as Error).message}`);
    return new Response(
      JSON.stringify({ 
        error: (error as Error).message, 
        canScan: false, 
        canSelectToken: false,
        hasPro: false,
        proScanAvailable: false
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});

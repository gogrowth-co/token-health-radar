
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Initialize Supabase client with service role for admin operations
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
      console.log("No authorization header provided");
      return new Response(
        JSON.stringify({ 
          error: "No authorization header",
          canScan: true,
          canSelectToken: true,
          hasPro: false,
          proScanAvailable: false,
          plan: "free",
          scansUsed: 0,
          scanLimit: 3
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Extract the token
    const token = authHeader.replace("Bearer ", "");
    
    // Get user information from the token using anon client
    const supabaseAnon = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") || "");
    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser(token);
    
    if (userError || !user) {
      console.log("Invalid user token:", userError?.message);
      return new Response(
        JSON.stringify({ 
          error: "Invalid user token",
          canScan: true,
          canSelectToken: true,
          hasPro: false,
          proScanAvailable: false,
          plan: "free",
          scansUsed: 0,
          scanLimit: 3
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    console.log(`User authenticated: ${user.id}`);

    // Use service role client to get subscriber data (bypasses RLS)
    const { data: subscriberData, error: subscriberError } = await supabase
      .from("subscribers")
      .select("plan, scans_used, pro_scan_limit")
      .eq("id", user.id)
      .maybeSingle();

    let plan = "free";
    let scansUsed = 0;
    let scanLimit = 3;

    if (subscriberError) {
      console.error(`Error fetching subscriber data: ${subscriberError.message}`);
      // Use defaults if query fails
    } else if (!subscriberData) {
      console.log(`No subscriber record found for user ${user.id}, creating default record`);
      
      // Create a default subscriber record if none exists
      const { data: newSubscriber, error: insertError } = await supabase
        .from("subscribers")
        .insert({
          id: user.id,
          plan: "free",
          scans_used: 0,
          pro_scan_limit: 3
        })
        .select("plan, scans_used, pro_scan_limit")
        .single();

      if (insertError) {
        console.error(`Error creating subscriber record: ${insertError.message}`);
        // Use defaults if creation fails
      } else {
        plan = newSubscriber?.plan || "free";
        scansUsed = newSubscriber?.scans_used || 0;
        scanLimit = newSubscriber?.pro_scan_limit || 3;
      }
    } else {
      plan = subscriberData.plan || "free";
      scansUsed = subscriberData.scans_used || 0;
      scanLimit = subscriberData.pro_scan_limit || 3;
    }

    console.log(`User plan: ${plan}, scans used: ${scansUsed}, scan limit: ${scanLimit}`);

    // Determine access levels
    let canScan = true;
    let canSelectToken = true;
    let hasPro = false;
    let proScanAvailable = false;
    
    // Always allow scanning - control what features they get
    if (plan === "pro" || plan === "lifetime") {
      if (plan === "lifetime" || scansUsed < scanLimit) {
        hasPro = true;
        proScanAvailable = true;
      } else {
        hasPro = false;
        proScanAvailable = false;
      }
    } else if (plan === "free") {
      if (scansUsed < 3) {
        hasPro = true;          // First 3 free scans show unblurred content
        proScanAvailable = true; // Can perform a Pro scan
      } else {
        hasPro = false;         // No Pro features
        proScanAvailable = false; // Cannot perform new Pro scan
      }
    }

    console.log(`Access determined - Can scan: ${canScan}, can select token: ${canSelectToken}, has pro: ${hasPro}, pro scan available: ${proScanAvailable}`);

    return new Response(
      JSON.stringify({
        canScan,
        canSelectToken,
        hasPro,
        proScanAvailable,
        plan,
        scansUsed,
        scanLimit
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error(`Error in check-scan-access function: ${error.message}`);
    console.error(`Error stack: ${error.stack}`);
    
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        canScan: true,  // Allow basic scanning even on error
        canSelectToken: true,
        hasPro: false,
        proScanAvailable: false,
        plan: "free",
        scansUsed: 0,
        scanLimit: 3
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }
});

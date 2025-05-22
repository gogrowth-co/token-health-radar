
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

    // Get user's subscriber data
    const { data: subscriberData, error: subscriberError } = await supabase
      .from("subscribers")
      .select("plan, scans_used, pro_scan_limit")
      .eq("id", user.id)
      .single();

    if (subscriberError) {
      console.error(`Error fetching subscriber data: ${subscriberError.message}`);
      // If there's an error, default to free tier with conservative limits
      return new Response(
        JSON.stringify({ 
          canScan: true, // Always allow initial search
          canSelectToken: true, // Assume they can select a token until proven otherwise
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

    // Default to free tier if no data found
    const plan = subscriberData?.plan || "free";
    const scansUsed = subscriberData?.scans_used || 0;
    const scanLimit = subscriberData?.pro_scan_limit || 3;

    console.log(`User plan: ${plan}, scans used: ${scansUsed}, scan limit: ${scanLimit}`);

    // Initial search is always allowed
    let canScan = true;
    let canSelectToken = true;
    let hasPro = false;
    let proScanAvailable = false;
    
    // Updated logic: Allow scans after limit, but only as free scans
    if (plan === "pro") {
      if (scansUsed < scanLimit) {
        hasPro = true;         // Access full scan 
        proScanAvailable = true; // Can perform a new Pro scan
      } else {
        hasPro = false;        // Access free scan
        proScanAvailable = false; // Cannot perform new Pro scan
        // But can still scan as Free user - don't block scanning
        canScan = true;
        canSelectToken = true;
      }
    } else if (plan === "free") {
      if (scansUsed < 3) {
        hasPro = true;          // First 3 free scans show unblurred content
        proScanAvailable = true; // Can perform a Pro scan
      } else {
        hasPro = false;         // No Pro features
        proScanAvailable = false; // Cannot perform new Pro scan
        // But can still scan as Free user - don't block scanning
        canScan = true;
        canSelectToken = true;
      }
    }

    console.log(`Can scan: ${canScan}, can select token: ${canSelectToken}, has pro: ${hasPro}, pro scan available: ${proScanAvailable}`);

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
    console.error(`Error checking scan access: ${error.message}`);
    return new Response(
      JSON.stringify({ 
        error: error.message, 
        canScan: false, 
        canSelectToken: false,
        hasPro: false,
        proScanAvailable: false
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  const token = authHeader ? authHeader.replace('Bearer ', '') : '';
  
  // Compare char by char to find first difference
  let diffIndex = -1;
  const minLen = Math.min(token.length, serviceRoleKey?.length ?? 0);
  for (let i = 0; i < minLen; i++) {
    if (token[i] !== serviceRoleKey![i]) {
      diffIndex = i;
      break;
    }
  }

  return new Response(
    JSON.stringify({
      token_length: token.length,
      srk_length: serviceRoleKey?.length ?? 0,
      match: token === serviceRoleKey,
      diff_at_index: diffIndex,
      token_around_diff: diffIndex >= 0 ? token.substring(Math.max(0, diffIndex - 5), diffIndex + 10) : null,
      srk_around_diff: diffIndex >= 0 ? serviceRoleKey!.substring(Math.max(0, diffIndex - 5), diffIndex + 10) : null,
      token_last_20: token.substring(token.length - 20),
      srk_last_20: serviceRoleKey?.substring((serviceRoleKey?.length ?? 0) - 20) ?? 'NOT SET',
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});

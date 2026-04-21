
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface KiwifyWebhookPayload {
  event_type: string
  data: {
    checkout: {
      id: string
      status: string
      product: {
        id: string
        name: string
      }
      customer: {
        email: string
        full_name: string
      }
      payment: {
        amount: number
        currency: string
      }
    }
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // SECURITY: validate Kiwify webhook signature before doing anything
    // Kiwify signs requests with HMAC-SHA1 and sends the hex digest in the
    // `signature` query string param using the account-token as the key.
    // https://docs.kiwify.com.br/developers/webhooks
    const url = new URL(req.url)
    const providedSig = url.searchParams.get('signature') || req.headers.get('x-kiwify-signature') || ''
    const kiwifySecret = Deno.env.get('KIWIFY_WEBHOOK_SECRET')

    const rawBody = await req.text()

    if (!kiwifySecret) {
      console.error('Kiwify webhook: KIWIFY_WEBHOOK_SECRET not configured')
      return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!providedSig) {
      console.warn('Kiwify webhook: missing signature')
      return new Response(JSON.stringify({ error: 'Missing signature' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Compute HMAC-SHA1(rawBody, secret) and compare hex
    const enc = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw', enc.encode(kiwifySecret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
    )
    const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(rawBody))
    const expectedSig = Array.from(new Uint8Array(sigBuf))
      .map(b => b.toString(16).padStart(2, '0')).join('')

    if (expectedSig.toLowerCase() !== providedSig.toLowerCase()) {
      console.warn('Kiwify webhook: signature mismatch')
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Parse webhook payload (from already-read raw body)
    const payload: KiwifyWebhookPayload = JSON.parse(rawBody)

    console.log('Kiwify webhook received & verified:', JSON.stringify(payload, null, 2))

    // Validate event type
    if (payload.event_type !== 'checkout.approved') {
      console.log('Ignoring event type:', payload.event_type)
      return new Response('Event ignored', { 
        status: 200, 
        headers: corsHeaders 
      })
    }

    // Extract customer data
    const { customer, checkout } = payload.data
    const email = customer.email
    const fullName = customer.full_name
    const checkoutId = checkout.id

    console.log('Processing LTD purchase for:', email)

    // Try to find and update existing user
    const { data: userData, error: userError } = await supabase.rpc(
      'upsert_subscriber_by_email',
      {
        user_email: email,
        user_name: fullName,
        user_plan: 'lifetime',
        user_source: 'kiwify'
      }
    )

    if (userError) {
      console.error('Error calling upsert function:', userError)
      throw userError
    }

    if (userData) {
      console.log('Successfully updated existing user:', userData)
    } else {
      // User doesn't exist in auth.users yet, we'll store this for later processing
      // This can happen if they purchase before creating an account
      console.log('User not found in auth.users, creating pending record')
      
      // For now, we'll just log this case. In a production system, you might want to:
      // 1. Store pending purchases in a separate table
      // 2. Process them when the user signs up
      // 3. Send an email with instructions
      
      // Since the webhook succeeds, Kiwify won't retry
      // The user will need to contact support if they can't access their account
    }

    // Log the successful webhook processing
    console.log(`Kiwify LTD webhook processed successfully for ${email}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook processed successfully',
        user_id: userData 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Kiwify webhook error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})

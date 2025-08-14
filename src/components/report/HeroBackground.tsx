"use client"
import { useEffect, useState } from "react"
import type { HeroResponse } from "@/types/hero"
import { inferVertical } from "@/lib/vertical"
import { supabase } from "@/integrations/supabase/client"

type HeroBackgroundProps = {
  chain: string; 
  address: string; 
  name: string; 
  symbol: string; 
  verticalHint?: string;
  overallScore?: number | null;
  scores?: {
    security: number | null;
    liquidity: number | null;
    tokenomics: number | null;
    community: number | null;
    development: number | null;
  };
  lastScannedAt?: string;
}

export default function HeroBackground({
  chain, address, name, symbol, verticalHint, overallScore, scores, lastScannedAt
}: HeroBackgroundProps) {
  const [resp, setResp] = useState<HeroResponse | null>(null)

  useEffect(() => {
    let cancelled = false
    async function run() {
      const vertical = inferVertical(verticalHint, symbol)
      try {
        const { data } = await supabase.functions.invoke('generate-hero-image', {
          body: { 
            chain, 
            address, 
            name, 
            symbol, 
            vertical, 
            mood: 'neutral',
            overallScore,
            scores,
            lastScannedAt
          }
        })
        const json = data as HeroResponse
        if (!cancelled && json?.ok) setResp(json)
      } catch { /* ignore */ }
    }
    run()
    return () => { cancelled = true }
  }, [chain, address, name, symbol, verticalHint, overallScore, scores, lastScannedAt])

  return resp?.url_1200x630 ? (
    <div className="rounded-2xl overflow-hidden border">
      <img
        src={resp.url_1200x630}
        alt={`${symbol} hero background illustration`}
        className="w-full h-auto"
        loading="lazy"
      />
    </div>
  ) : (
    <div className="rounded-2xl overflow-hidden border bg-muted h-56 flex items-center justify-center text-sm text-muted-foreground">
      Generating hero image…
    </div>
  )
}

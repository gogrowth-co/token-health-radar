"use client"
import { useEffect, useState } from "react"
import type { HeroResponse } from "@/types/hero"
import { inferVertical } from "@/lib/vertical"
import { supabase } from "@/integrations/supabase/client"

export default function HeroBackground({
  chain, address, name, symbol, verticalHint
}: {
  chain: string; address: string; name: string; symbol: string; verticalHint?: string
}) {
  const [resp, setResp] = useState<HeroResponse | null>(null)

  useEffect(() => {
    let cancelled = false
    async function run() {
      const vertical = inferVertical(verticalHint, symbol)
      try {
        const { data } = await supabase.functions.invoke('ai-hero-background', {
          body: { chain, address, name, symbol, vertical, mood: 'neutral' }
        })
        const json = data as HeroResponse
        if (!cancelled && json?.ok) setResp(json)
      } catch { /* ignore */ }
    }
    run()
    return () => { cancelled = true }
  }, [chain, address, name, symbol, verticalHint])

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
      Generating hero background…
    </div>
  )
}

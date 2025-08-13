"use client"
import { useEffect, useState } from "react"
import type { HeroOverlayPayload } from "@/types/overlay"
import { supabase } from "@/integrations/supabase/client"

export default function HeroComposer({ overlay }: { overlay: HeroOverlayPayload }) {
  const [urls, setUrls] = useState<{ url_1200x630?: string; url_1080x1920?: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const { data } = await supabase.functions.invoke('compose-hero', {
          body: overlay
        })
        if (!cancelled && (data as any)?.ok) setUrls(data as any)
      } catch { /* ignore; placeholder below */ }
    }
    run()
    return () => { cancelled = true }
  }, [overlay.address, overlay.overallScore])

  return urls?.url_1200x630 ? (
    <div className="rounded-2xl overflow-hidden border">
      <img
        src={urls.url_1200x630}
        alt={`${overlay.symbol} branded hero`}
        className="w-full h-auto"
        loading="lazy"
      />
    </div>
  ) : (
    <div className="rounded-2xl overflow-hidden border bg-muted h-56 flex items-center justify-center text-sm text-muted-foreground">
      Building branded hero…
    </div>
  )
}

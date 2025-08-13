"use client"
import { useEffect, useState } from "react"
import type { OrchestrateRequest, OrchestrateResponse } from "@/types/orchestrator"
import { supabase } from "@/integrations/supabase/client"

export default function VisualsOrchestrator({ req }: { req: OrchestrateRequest }) {
  const [state, setState] = useState<OrchestrateResponse | null>(null)

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const { data } = await supabase.functions.invoke('orchestrate-visuals', {
          body: req
        })
        if (!cancelled) setState(data as OrchestrateResponse)
      } catch {
        if (!cancelled) setState({ ok:false, assets:{}, errors:[{step:"orchestrate", error:"network"}] })
      }
    }
    run()
    return () => { cancelled = true }
  }, [req.tokenId, req.force])

  return null
}

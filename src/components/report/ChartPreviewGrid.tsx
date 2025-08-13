"use client"
import React from "react"

type Urls = Partial<Record<"price_7d"|"tvl_90d"|"holders_donut", string>>

export function ChartPreviewGrid({ symbol, urls }: { symbol: string; urls?: Urls }) {
  const cards: { key: keyof Urls; label: string }[] = [
    { key: "price_7d", label: "Price (7d)" },
    { key: "tvl_90d", label: "TVL (90d)" },
    { key: "holders_donut", label: "Top Holders" },
  ]
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {cards.map(({ key, label }) => (
        <div key={key} className="rounded-xl border p-2 bg-background">
          <div className="text-sm font-medium mb-2">{label}</div>
          {urls?.[key] ? (
            <img
              src={urls[key]!}
              alt={`${symbol} ${label} chart`}
              loading="lazy"
              className="w-full h-auto rounded-lg"
            />
          ) : (
            <div className="h-40 rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-sm">
              Not generated
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

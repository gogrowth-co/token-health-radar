"use client"
import { useEffect, useState } from "react"

type Props = {
  symbol: string
  name: string
  heroUrl?: string
  logoUrl?: string
  overallScore?: number | null
}

export default function TokenHeaderHero({ symbol, name, heroUrl, logoUrl, overallScore }: Props) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (!heroUrl) return setReady(true)
    const img = new Image()
    img.onload = () => setReady(true)
    img.onerror = () => setReady(true)
    img.src = heroUrl
  }, [heroUrl])

  return (
    <header className="rounded-2xl overflow-hidden border relative" aria-label={`${symbol} hero header`}>
      {/* background image or gradient fallback */}
      <div
        className="w-full h-56 md:h-72 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
        style={heroUrl ? {
          backgroundImage: `url(${heroUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center"
        } : undefined}
        aria-hidden
      />
      {/* gradient scrim for legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
      {/* content row */}
      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-white/90 overflow-hidden flex items-center justify-center">
          {logoUrl
            ? <img src={logoUrl} alt={`${symbol} logo`} className="h-full w-full object-cover" />
            : <span className="text-sm font-semibold">{symbol.slice(0,4).toUpperCase()}</span>}
        </div>
        <div className="flex-1">
          <h2 className="text-white text-lg md:text-2xl font-semibold leading-tight">
            {name} <span className="text-white/80">({symbol})</span>
          </h2>
          {typeof overallScore === "number" ? (
            <p className="text-white/80 text-xs md:text-sm">Overall score: {overallScore}</p>
          ) : (
            <p className="text-white/60 text-xs md:text-sm">Score not available</p>
          )}
        </div>
      </div>
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-white/70">
          Loading cover…
        </div>
      )}
    </header>
  )
}

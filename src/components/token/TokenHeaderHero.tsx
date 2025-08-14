"use client"
import { useEffect, useState } from "react"

type Props = {
  symbol: string
  name: string
  heroUrl?: string
  logoUrl?: string
  overallScore?: number | null
  currentPrice?: number | null
  marketCap?: number | null
}

export default function TokenHeaderHero({ symbol, name, heroUrl, logoUrl, overallScore, currentPrice, marketCap }: Props) {
  const [ready, setReady] = useState(false)
  const [imageError, setImageError] = useState(false)
  
  useEffect(() => {
    if (!heroUrl) {
      setReady(true)
      setImageError(false)
      return
    }
    
    setReady(false)
    setImageError(false)
    
    const img = new Image()
    img.onload = () => {
      setReady(true)
      setImageError(false)
    }
    img.onerror = () => {
      console.warn('Hero image failed to load:', heroUrl)
      setReady(true)
      setImageError(true)
    }
    img.src = heroUrl
  }, [heroUrl])

  return (
    <header className="rounded-2xl overflow-hidden border relative" aria-label={`${symbol} hero header`}>
      {/* background image or gradient fallback */}
      <div
        className="w-full h-56 md:h-72 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
        style={heroUrl && !imageError ? {
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
          <div className="flex flex-col gap-1">
            {typeof overallScore === "number" ? (
              <p className="text-white/80 text-xs md:text-sm">Overall score: {overallScore}/100</p>
            ) : (
              <p className="text-white/60 text-xs md:text-sm">Score not available</p>
            )}
            <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm text-white/70">
              {currentPrice && (
                <span>${currentPrice.toFixed(4)}</span>
              )}
              {marketCap && (
                <span>Market cap: ${marketCap >= 1e9 ? `${(marketCap/1e9).toFixed(1)}B` : marketCap >= 1e6 ? `${(marketCap/1e6).toFixed(0)}M` : `${(marketCap/1e3).toFixed(0)}K`}</span>
              )}
            </div>
          </div>
        </div>
      </div>
      {!ready && heroUrl && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-white/70">
          Loading cover…
        </div>
      )}
      {process.env.NODE_ENV !== 'production' && imageError && heroUrl && (
        <div className="absolute top-2 left-2 bg-red-500/80 text-white text-xs px-2 py-1 rounded">
          Image failed: {heroUrl}
        </div>
      )}
    </header>
  )
}

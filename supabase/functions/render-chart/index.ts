// Supabase Edge Function: render-chart
// Generates PNG charts (1200x630) from stored DB data only and saves to Storage
// - price_7d: line chart
// - tvl_90d: area chart with change badge
// - holders_donut: donut chart with Top1/Top5/Top10/Rest

// CORS headers
const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createCanvas } from "https://deno.land/x/canvas@v1.4.1/mod.ts";

// Types
interface SeriesPoint { t: number; v: number }

interface RequestBody {
  chain: string;
  address: string;
  tokenId: string;
  type: "price_7d" | "tvl_90d" | "holders_donut";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return json({ error: "invalid_method" });
    }

    const body = (await req.json()) as RequestBody;
    const { chain, address, tokenId, type } = body || {} as RequestBody;

    if (!chain || !address || !tokenId || !type) {
      return json({ error: "invalid_payload" });
    }

    if (!(["price_7d", "tvl_90d", "holders_donut"] as const).includes(type)) {
      return json({ error: "invalid_type", type });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return json({ error: "missing_env", type });
    }
    const supabase = createClient(supabaseUrl, serviceKey);

    let pngBytes: Uint8Array | null = null;

    if (type === "price_7d" || type === "tvl_90d") {
      const { data, error } = await supabase
        .from("token_timeseries")
        .select("data")
        .eq("token_id", tokenId)
        .eq("series_type", type)
        .maybeSingle();

      const points = (data?.data as SeriesPoint[] | undefined) || [];
      if (error || points.length < 2) {
        return json({ error: "no_data", type });
      }

      try {
        pngBytes = await renderLineOrArea(points, type === "tvl_90d");
      } catch (e) {
        console.error("Render line/area failed", e);
        return json({ error: "render_failed", type });
      }
    } else if (type === "holders_donut") {
      const breakdown = await fetchHoldersBreakdown(supabase, tokenId, chain, address);
      if (!breakdown) {
        return json({ error: "no_data", type });
      }
      try {
        pngBytes = await renderHoldersDonut(breakdown);
      } catch (e) {
        console.error("Render donut failed", e);
        return json({ error: "render_failed", type });
      }
    }

    if (!pngBytes) {
      return json({ error: "render_failed", type });
    }

    const path = `reports/${chain}/${address}/chart_${type}.png`;
    const { error: upErr } = await supabase.storage
      .from("reports")
      .upload(path, pngBytes, {
        cacheControl: "3600",
        contentType: "image/png",
        upsert: true,
      });

    if (upErr) {
      console.error("Upload error", upErr);
      return json({ error: "upload_failed", type });
    }

    const { data: pub } = supabase.storage.from("reports").getPublicUrl(path);
    return json({ url: pub.publicUrl, type });
  } catch (e) {
    console.error("Unhandled error", e);
    return json({ error: "render_failed", details: String((e as Error)?.message || e) });
  }
});

function json(obj: Record<string, unknown>) {
  return new Response(JSON.stringify(obj), { headers: corsHeaders, status: 200 });
}

// Try to fetch holders breakdown from token_snapshot or compatible views/tables
async function fetchHoldersBreakdown(
  supabase: ReturnType<typeof createClient>,
  tokenId: string,
  chain: string,
  address: string,
): Promise<{ top1: number; top5: number; top10: number; rest: number } | null> {
  // 1) token_snapshot by token_id
  const tryFetch = async () => {
    const attempts: Array<Promise<{ data: any; error: any }>> = [
      supabase.from("token_snapshot").select("*").eq("token_id", tokenId).maybeSingle(),
      supabase.from("token_snapshot").select("*").eq("address", address).maybeSingle(),
      supabase.from("token_snapshot").select("*").eq("token_address", address).maybeSingle(),
      supabase.from("token_tokenomics_cache").select("*").eq("token_address", address).maybeSingle(),
    ];

    for (const p of attempts) {
      try {
        const { data } = await p;
        if (data) return data;
      } catch (_) { /* ignore */ }
    }
    return null;
  };

  const snap = await tryFetch();
  if (!snap) return null;

  const getPct = (obj: any, keys: string[]): number | undefined => {
    for (const k of keys) {
      const v = obj?.[k];
      if (typeof v === "number") return v;
      if (typeof v === "string") {
        const n = Number(v);
        if (!Number.isNaN(n)) return n;
      }
    }
    return undefined;
  };

  const top1 = getPct(snap, ["holders_top1_pct", "top1_pct", "top1", "top_1_pct", "top_holder_pct"]);
  const top5 = getPct(snap, ["holders_top5_pct", "top5_pct", "top5", "top_5_pct"]);
  const top10 = getPct(snap, ["holders_top10_pct", "top10_pct", "top10", "top_10_pct"]);

  if (top1 == null || top5 == null || top10 == null) return null;

  const seg1 = clamp(top1, 0, 100);
  const seg2 = clamp(top5 - top1, 0, 100);
  const seg3 = clamp(top10 - top5, 0, 100);
  const rest = Math.max(0, 100 - (seg1 + seg2 + seg3));

  return { top1: seg1, top5: seg2, top10: seg3, rest };
}

function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }

// Rendering helpers (Canvas)
async function renderLineOrArea(points: SeriesPoint[], area: boolean): Promise<Uint8Array> {
  const W = 1200, H = 630, P = 60;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#0b0d10"; // neutral dark
  ctx.fillRect(0, 0, W, H);

  // Frame
  ctx.fillStyle = "#11151a";
  roundRect(ctx, 20, 20, W - 40, H - 40, 16);
  ctx.fill();

  // Plot area
  const x0 = P + 20, y0 = H - P - 20;
  const x1 = W - P - 20, y1 = 60 + 20;

  // Axes grid
  ctx.strokeStyle = "#1f2937";
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.6;
  for (let i = 0; i <= 6; i++) {
    const y = y0 - ((y0 - y1) * i) / 6;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.stroke();
  }
  for (let i = 0; i <= 8; i++) {
    const x = x0 + ((x1 - x0) * i) / 8;
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.lineTo(x, y1);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const pts = [...points].sort((a, b) => a.t - b.t);
  const minT = pts[0].t, maxT = pts[pts.length - 1].t;
  let minV = Number.POSITIVE_INFINITY, maxV = Number.NEGATIVE_INFINITY;
  for (const p of pts) {
    if (p.v < minV) minV = p.v;
    if (p.v > maxV) maxV = p.v;
  }
  if (minV === maxV) { maxV += 1; minV -= 1; }

  const toX = (t: number) => x0 + ((t - minT) / (maxT - minT)) * (x1 - x0);
  const toY = (v: number) => y0 - ((v - minV) / (maxV - minV)) * (y0 - y1);

  // Area fill for TVL
  if (area) {
    ctx.beginPath();
    ctx.moveTo(toX(pts[0].t), toY(pts[0].v));
    for (let i = 1; i < pts.length; i++) ctx.lineTo(toX(pts[i].t), toY(pts[i].v));
    ctx.lineTo(toX(pts[pts.length - 1].t), y0);
    ctx.lineTo(toX(pts[0].t), y0);
    ctx.closePath();
    ctx.fillStyle = "#2563eb33"; // primary with alpha
    ctx.fill();
  }

  // Line
  ctx.beginPath();
  ctx.moveTo(toX(pts[0].t), toY(pts[0].v));
  for (let i = 1; i < pts.length; i++) ctx.lineTo(toX(pts[i].t), toY(pts[i].v));
  ctx.strokeStyle = area ? "#3b82f6" : "#10b981"; // blue for area, green for price
  ctx.lineWidth = 3;
  ctx.stroke();

  // TVL change badge
  if (area) {
    const start = pts[0].v, end = pts[pts.length - 1].v;
    const change = ((end - start) / Math.max(1e-9, Math.abs(start))) * 100;
    const badge = `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`;
    drawBadge(ctx, x1 - 120, y1 + 20, badge, change >= 0 ? "#16a34a" : "#ef4444");
  }

  // Title
  ctx.fillStyle = "#e5e7eb";
  ctx.font = "24px sans-serif";
  ctx.fillText(area ? "TVL (90d)" : "Price (7d)", 40, 56);

  // Encode PNG
  // deno_canvas: toBuffer() returns Uint8Array
  const png = canvas.toBuffer();
  return png as Uint8Array;
}

async function renderHoldersDonut(parts: { top1: number; top5: number; top10: number; rest: number }): Promise<Uint8Array> {
  const W = 1200, H = 630;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#0b0d10";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#11151a";
  roundRect(ctx, 20, 20, W - 40, H - 40, 16);
  ctx.fill();

  // Donut
  const cx = W / 2, cy = H / 2 + 10;
  const rOuter = Math.min(W, H) * 0.28;
  const rInner = rOuter * 0.6;

  const segments = [
    { label: "Top1", val: parts.top1, color: "#ef4444" },
    { label: "Top5", val: parts.top5, color: "#f59e0b" },
    { label: "Top10", val: parts.top10, color: "#3b82f6" },
    { label: "Rest", val: parts.rest, color: "#10b981" },
  ];

  const total = segments.reduce((s, x) => s + x.val, 0) || 1;
  let start = -Math.PI / 2;
  for (const seg of segments) {
    const ang = (seg.val / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, rOuter, start, start + ang);
    ctx.closePath();
    ctx.fillStyle = seg.color + "cc"; // add alpha
    ctx.fill();
    start += ang;
  }

  // Hollow center
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(cx, cy, rInner, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";

  // Center label
  ctx.fillStyle = "#e5e7eb";
  ctx.font = "28px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Concentration", cx, cy - 6);

  // Legend
  ctx.textAlign = "left";
  ctx.font = "18px sans-serif";
  let lx = 60, ly = 80;
  for (const seg of segments) {
    ctx.fillStyle = seg.color;
    ctx.fillRect(lx, ly - 12, 18, 18);
    ctx.fillStyle = "#e5e7eb";
    ctx.fillText(`${seg.label}: ${seg.val.toFixed(1)}%`, lx + 26, ly + 2);
    ly += 28;
  }

  // Title
  ctx.fillStyle = "#e5e7eb";
  ctx.font = "24px sans-serif";
  ctx.fillText("Top Holders (Donut)", 40, 56);

  const png = canvas.toBuffer();
  return png as Uint8Array;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawBadge(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color: string) {
  ctx.font = "18px sans-serif";
  const padding = 10;
  const metrics = ctx.measureText(text);
  const w = metrics.width + padding * 2;
  const h = 30;
  ctx.fillStyle = color + "33";
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.fillText(text, x + padding, y + h - 10);
}

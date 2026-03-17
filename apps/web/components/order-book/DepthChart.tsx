"use client";

import { useMemo, useRef, useEffect } from "react";
import type { AggregatedBook } from "@repo/shared-types";

interface DepthChartProps {
  book: AggregatedBook | null;
}

export function DepthChart({ book }: DepthChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const data = useMemo(() => {
    if (!book || book.mid === null) return null;

    // Build cumulative depth curves
    let cumBidSize = 0;
    const bidCurve = book.bids.map((l) => {
      cumBidSize += l.totalSize;
      return { price: l.price, cumSize: cumBidSize };
    });

    let cumAskSize = 0;
    const askCurve = book.asks.map((l) => {
      cumAskSize += l.totalSize;
      return { price: l.price, cumSize: cumAskSize };
    });

    const maxCum = Math.max(cumBidSize, cumAskSize, 1);
    return { bidCurve, askCurve, maxCum, mid: book.mid };
  }, [book]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const pad = { top: 8, bottom: 20, left: 10, right: 10 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;

    // Clear
    ctx.clearRect(0, 0, W, H);

    // Price range: use actual data bounds with padding
    const minBidPrice = data.bidCurve.length > 0 ? data.bidCurve[data.bidCurve.length - 1]!.price : data.mid;
    const maxAskPrice = data.askCurve.length > 0 ? data.askCurve[data.askCurve.length - 1]!.price : data.mid;
    const priceMin = Math.max(0, Math.min(minBidPrice, data.mid) - 0.02);
    const priceMax = Math.min(1, Math.max(maxAskPrice, data.mid) + 0.02);
    const priceToX = (p: number) =>
      pad.left + ((p - priceMin) / (priceMax - priceMin)) * chartW;
    const sizeToY = (s: number) =>
      pad.top + chartH - (s / data.maxCum) * chartH;

    // Draw bid curve (stepped, filled)
    ctx.beginPath();
    ctx.moveTo(priceToX(data.bidCurve[0]?.price ?? data.mid), sizeToY(0));
    for (const point of data.bidCurve) {
      const x = priceToX(point.price);
      ctx.lineTo(x, sizeToY(point.cumSize));
    }
    // Close to baseline
    const lastBid = data.bidCurve[data.bidCurve.length - 1];
    if (lastBid) ctx.lineTo(priceToX(lastBid.price), sizeToY(0));
    ctx.closePath();
    ctx.fillStyle = "rgba(34, 197, 94, 0.15)";
    ctx.fill();
    ctx.strokeStyle = "rgba(34, 197, 94, 0.6)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Draw ask curve (stepped, filled)
    ctx.beginPath();
    ctx.moveTo(priceToX(data.askCurve[0]?.price ?? data.mid), sizeToY(0));
    for (const point of data.askCurve) {
      const x = priceToX(point.price);
      ctx.lineTo(x, sizeToY(point.cumSize));
    }
    const lastAsk = data.askCurve[data.askCurve.length - 1];
    if (lastAsk) ctx.lineTo(priceToX(lastAsk.price), sizeToY(0));
    ctx.closePath();
    ctx.fillStyle = "rgba(239, 68, 68, 0.15)";
    ctx.fill();
    ctx.strokeStyle = "rgba(239, 68, 68, 0.6)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Draw mid line
    ctx.beginPath();
    ctx.moveTo(priceToX(data.mid), pad.top);
    ctx.lineTo(priceToX(data.mid), pad.top + chartH);
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Price axis labels
    ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
    ctx.font = "10px Inter, sans-serif";
    ctx.textAlign = "center";
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const p = priceMin + (i / steps) * (priceMax - priceMin);
      const label = `${(p * 100).toFixed(0)}¢`;
      ctx.fillText(label, priceToX(p), H - 4);
    }
  }, [data]);

  if (!data) {
    return (
      <div className="h-32 flex items-center justify-center text-xs text-text-muted">
        No data for depth chart
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface-2 overflow-hidden shadow-sm">
      <div className="px-5 py-3 border-b border-border">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          Depth Chart
        </h2>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full h-40"
        style={{ display: "block" }}
      />
    </div>
  );
}

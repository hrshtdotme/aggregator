"use client";

import { useRef, useEffect } from "react";
import type { PricePoint } from "../../hooks/useOrderBook";

interface PriceChartProps {
  history: PricePoint[];
}

const YES_COLOR = "#22c55e";
const YES_FILL = "rgba(34, 197, 94, 0.06)";
const NO_COLOR = "#ef4444";
const NO_FILL = "rgba(239, 68, 68, 0.06)";
const LABEL_COLOR = "#666666";

export function PriceChart({ history }: PriceChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || history.length < 2) return;

    const maybeCtx = canvas.getContext("2d");
    if (!maybeCtx) return;
    const ctx = maybeCtx;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const pad = { top: 12, bottom: 24, left: 10, right: 44 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;

    ctx.clearRect(0, 0, W, H);

    // Find price range across both YES and NO
    let minP = Infinity;
    let maxP = -Infinity;
    for (const pt of history) {
      if (pt.yes < minP) minP = pt.yes;
      if (pt.yes > maxP) maxP = pt.yes;
      if (pt.no < minP) minP = pt.no;
      if (pt.no > maxP) maxP = pt.no;
    }
    const range = maxP - minP || 0.01;
    minP -= range * 0.1;
    maxP += range * 0.1;

    const timeMin = history[0]!.time;
    const timeMax = history[history.length - 1]!.time;
    const timeRange = timeMax - timeMin || 1;

    const toX = (t: number) => pad.left + ((t - timeMin) / timeRange) * chartW;
    const toY = (p: number) => pad.top + chartH - ((p - minP) / (maxP - minP)) * chartH;

    // Draw a curve with fill
    const drawCurve = (
      field: "yes" | "no",
      lineColor: string,
      fillColor: string
    ): void => {
      // Fill
      ctx.beginPath();
      ctx.moveTo(toX(history[0]!.time), toY(history[0]![field]));
      for (const pt of history) {
        ctx.lineTo(toX(pt.time), toY(pt[field]));
      }
      ctx.lineTo(toX(timeMax), pad.top + chartH);
      ctx.lineTo(toX(timeMin), pad.top + chartH);
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();

      // Line
      ctx.beginPath();
      ctx.moveTo(toX(history[0]!.time), toY(history[0]![field]));
      for (const pt of history) {
        ctx.lineTo(toX(pt.time), toY(pt[field]));
      }
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.stroke();

      // End dot
      const last = history[history.length - 1]!;
      ctx.beginPath();
      ctx.arc(toX(last.time), toY(last[field]), 3, 0, Math.PI * 2);
      ctx.fillStyle = lineColor;
      ctx.fill();
    }

    drawCurve("no", NO_COLOR, NO_FILL);
    drawCurve("yes", YES_COLOR, YES_FILL);

    // Y-axis price labels
    ctx.fillStyle = LABEL_COLOR;
    ctx.font = "10px Inter, sans-serif";
    ctx.textAlign = "left";
    const steps = 3;
    for (let i = 0; i <= steps; i++) {
      const p = minP + (i / steps) * (maxP - minP);
      ctx.fillText(`${(p * 100).toFixed(1)}¢`, W - pad.right + 6, toY(p) + 3);
    }

    // Current price labels at end of lines
    const last = history[history.length - 1]!;
    ctx.font = "bold 10px Inter, sans-serif";
    ctx.fillStyle = YES_COLOR;
    ctx.fillText(`${(last.yes * 100).toFixed(1)}¢`, W - pad.right + 6, toY(last.yes) - 6);
    ctx.fillStyle = NO_COLOR;
    ctx.fillText(`${(last.no * 100).toFixed(1)}¢`, W - pad.right + 6, toY(last.no) + 14);

    // Time label
    ctx.fillStyle = LABEL_COLOR;
    ctx.font = "10px Inter, sans-serif";
    ctx.textAlign = "center";
    const elapsed = (timeMax - timeMin) / 1000;
    let timeLabel: string;
    if (elapsed < 120) timeLabel = `Last ${Math.round(elapsed)}s`;
    else if (elapsed < 3600) timeLabel = `Last ${Math.round(elapsed / 60)}m`;
    else timeLabel = `Last ${(elapsed / 3600).toFixed(1)}h`;
    ctx.fillText(timeLabel, pad.left + chartW / 2, H - 4);
  }, [history]);

  if (history.length < 2) {
    return (
      <div className="rounded-xl border border-border bg-surface-2 overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            Price History
          </h2>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-bid" /> Yes</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-ask" /> No</span>
          </div>
        </div>
        <div className="h-32 flex items-center justify-center text-xs text-text-muted">
          Collecting price data...
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface-2 overflow-hidden shadow-sm">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          Price History
        </h2>
        <div className="flex items-center gap-3 text-[10px] text-text-muted">
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-bid" /> Yes</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-ask" /> No</span>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full h-36"
        style={{ display: "block" }}
      />
    </div>
  );
}

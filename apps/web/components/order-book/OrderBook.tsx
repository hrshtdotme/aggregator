"use client";

import { useState, useMemo } from "react";
import type { AggregatedBook, VenueId, VenueOrderBook } from "@repo/shared-types";
import { OrderBookRow } from "./OrderBookRow";

type ViewMode = "combined" | "polymarket" | "kalshi";

interface OrderBookProps {
  aggregated: AggregatedBook | null;
  venues: Partial<Record<VenueId, VenueOrderBook>>;
}

const MAX_ROWS = 15;

export function OrderBook({ aggregated, venues }: OrderBookProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("combined");

  const { displayBids, displayAsks, maxSize } = useMemo(() => {
    if (!aggregated) {
      return { displayBids: [], displayAsks: [], maxSize: 0 };
    }

    if (viewMode === "combined") {
      const bids = aggregated.bids.slice(0, MAX_ROWS);
      const asks = aggregated.asks.slice(0, MAX_ROWS);
      const max = Math.max(
        ...bids.map((l) => l.totalSize),
        ...asks.map((l) => l.totalSize),
        1
      );
      return { displayBids: bids, displayAsks: asks, maxSize: max };
    }

    // Single venue view
    const venueBook = venues[viewMode];
    if (!venueBook) {
      return { displayBids: [], displayAsks: [], maxSize: 0 };
    }

    const bids = venueBook.bids.slice(0, MAX_ROWS).map((l) => ({
      price: l.price,
      totalSize: l.size,
      venues: { [viewMode]: l.size } as Partial<Record<VenueId, number>>,
    }));
    const asks = venueBook.asks.slice(0, MAX_ROWS).map((l) => ({
      price: l.price,
      totalSize: l.size,
      venues: { [viewMode]: l.size } as Partial<Record<VenueId, number>>,
    }));
    const max = Math.max(
      ...bids.map((l) => l.totalSize),
      ...asks.map((l) => l.totalSize),
      1
    );
    return { displayBids: bids, displayAsks: asks, maxSize: max };
  }, [aggregated, venues, viewMode]);

  return (
    <div className="rounded-xl border border-border bg-surface-2 overflow-hidden shadow-sm">
      {/* View mode toggle */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          Order Book
        </h2>
        <div className="flex gap-1">
          {(["combined", "polymarket", "kalshi"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                viewMode === mode
                  ? "bg-surface-3 text-accent"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              {mode === "combined" ? "Combined" : mode === "polymarket" ? "Polymarket" : "Kalshi"}
            </button>
          ))}
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-2 text-[10px] uppercase tracking-wider font-semibold text-text-muted border-b border-border">
        <div className="grid grid-cols-3 px-3 py-2">
          <span className="text-left">Venue</span>
          <span className="text-right">Size</span>
          <span className="text-right text-bid">Bid (Yes)</span>
        </div>
        <div className="grid grid-cols-3 px-3 py-2">
          <span className="text-left text-ask">Ask (No)</span>
          <span className="text-left">Size</span>
          <span className="text-right">Venue</span>
        </div>
      </div>

      {/* Order book rows */}
      <div className="relative">
        {!aggregated ? (
          <div className="py-12 text-center text-sm text-text-muted">
            Waiting for data...
          </div>
        ) : displayBids.length === 0 && displayAsks.length === 0 ? (
          <div className="py-12 text-center text-sm text-text-muted">
            No orders
          </div>
        ) : (
          Array.from({ length: Math.max(displayBids.length, displayAsks.length) }).map((_, i) => {
            const bid = displayBids[i];
            const ask = displayAsks[i];
            return (
              <OrderBookRow
                key={i}
                bid={bid ?? null}
                ask={ask ?? null}
                maxSize={maxSize}
                showVenues={viewMode === "combined"}
              />
            );
          })
        )}
      </div>

      {/* Legend */}
      {viewMode === "combined" && (
        <div className="flex items-center gap-4 px-5 py-2.5 border-t border-border text-xs text-text-muted">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-2 rounded-sm bg-polymarket opacity-60" />
            <span>Polymarket</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-2 rounded-sm bg-kalshi opacity-60" />
            <span>Kalshi</span>
          </div>
        </div>
      )}
    </div>
  );
}

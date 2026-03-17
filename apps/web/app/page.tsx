"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { ExploreMarket, MarketsResponse } from "@repo/shared-types";

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";

type SortOption = "volume" | "liquidity" | "price" | "newest";
type VenueFilter = "all" | "matched" | "polymarket" | "kalshi";

function formatNum(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  if (n > 0) return `$${n.toFixed(0)}`;
  return "-";
}

function PriceBar({ price }: { price: number | null }) {
  if (price === null || price === 0) return <span className="text-text-muted">-</span>;
  const pct = Math.round(price * 100);
  const isHigh = pct >= 70;
  const isLow = pct <= 30;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-surface-3 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${isHigh ? "bg-bid" : isLow ? "bg-ask" : "bg-text-secondary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-medium tabular-nums w-10 text-right">{pct}%</span>
    </div>
  );
}

function VenueBadge({ venue }: { venue: "polymarket" | "kalshi" }) {
  return (
    <span
      className={`inline-block px-1.5 py-0.5 text-[10px] font-medium rounded ${
        venue === "polymarket"
          ? "bg-polymarket/20 text-polymarket"
          : "bg-kalshi/20 text-kalshi"
      }`}
    >
      {venue === "polymarket" ? "Poly" : "Kalshi"}
    </span>
  );
}

function MarketCard({ market }: { market: ExploreMarket }) {
  return (
    <Link
      href={`/market/${encodeURIComponent(market.id)}`}
      className="block rounded-xl border border-border bg-surface-2 p-5 shadow-sm hover:border-accent/40 hover:shadow-md hover:shadow-(--color-accent)/5 transition-all"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-sm font-medium leading-snug text-text-primary line-clamp-2">
          {market.question}
        </h3>
        <div className="flex gap-1 shrink-0">
          {market.venues.map((v) => (
            <VenueBadge key={v.venue} venue={v.venue} />
          ))}
        </div>
      </div>

      <div className="mb-3">
        <div className="text-[10px] text-text-muted mb-1 uppercase tracking-wider font-semibold">
          Yes probability
        </div>
        <PriceBar price={market.yesPrice} />
      </div>

      <div className="flex items-center justify-between text-xs text-text-secondary">
        <span className="text-text-muted uppercase tracking-wider text-[10px]">{market.category}</span>
        <div className="flex gap-3">
          <span>Vol {formatNum(market.volume24h)}</span>
          <span>Liq {formatNum(market.liquidity)}</span>
        </div>
      </div>
    </Link>
  );
}

export default function ExplorePage() {
  const [data, setData] = useState<MarketsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("volume");
  const [venue, setVenue] = useState<VenueFilter>("all");
  const [offset, setOffset] = useState(0);
  const limit = 30;

  const fetchMarkets = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
        sort,
      });
      if (search) params.set("q", search);
      if (venue !== "all") params.set("venue", venue);

      const res = await fetch(`${API_URL}/api/markets?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as MarketsResponse;
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch markets");
    } finally {
      setLoading(false);
    }
  }, [search, sort, venue, offset]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(fetchMarkets, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchMarkets, search]);

  // Reset offset when filters change
  useEffect(() => {
    setOffset(0);
  }, [search, sort, venue]);

  return (
    <main className="min-h-screen p-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-1">Markets</h1>
        <p className="text-sm text-text-secondary">
          Aggregated order books across Polymarket and Kalshi
          {data && (
            <span className="text-text-muted">
              {" "}&middot; {data.polymarketCount.toLocaleString()} Polymarket &middot; {data.kalshiCount.toLocaleString()} Kalshi &middot; {data.matchedCount} Matched
            </span>
          )}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-8">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search markets..."
          className="flex-1 min-w-[200px] px-4 py-2.5 bg-surface-2 border border-border rounded-xl text-sm shadow-sm placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
        />

        <div className="flex gap-1 bg-surface-2 border border-border rounded-xl p-1">
          {(["all", "matched", "polymarket", "kalshi"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setVenue(v)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                venue === v
                  ? "bg-surface-3 text-accent"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              {v === "all" ? "All" : v === "matched" ? "Matched" : v === "polymarket" ? "Polymarket" : "Kalshi"}
            </button>
          ))}
        </div>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="px-3 py-2.5 bg-surface-2 border border-border rounded-xl text-xs text-text-secondary focus:outline-none focus:border-accent"
        >
          <option value="volume">Volume (24h)</option>
          <option value="liquidity">Liquidity</option>
          <option value="price">Price (high)</option>
          <option value="newest">Newest</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 px-4 py-3 bg-ask-muted border border-ask/30 rounded-xl text-sm text-ask">
          Failed to load markets: {error}. Make sure the server is running on port 3001.
        </div>
      )}

      {/* Loading skeletons */}
      {loading && !data && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-surface-2 p-5 animate-pulse">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-surface-3 rounded w-full" />
                  <div className="h-4 bg-surface-3 rounded w-2/3" />
                </div>
                <div className="h-5 w-10 bg-surface-3 rounded" />
              </div>
              <div className="mb-3">
                <div className="h-3 bg-surface-3 rounded w-20 mb-2" />
                <div className="h-1.5 bg-surface-3 rounded-full w-full" />
              </div>
              <div className="flex justify-between">
                <div className="h-3 bg-surface-3 rounded w-16" />
                <div className="h-3 bg-surface-3 rounded w-24" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Market grid */}
      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {data.markets.map((market) => (
              <MarketCard key={market.id} market={market} />
            ))}
          </div>

          {data.markets.length === 0 && (
            <div className="text-center py-20 text-text-muted">
              No markets found
            </div>
          )}

          {/* Pagination */}
          {data.total > limit && (
            <div className="flex items-center justify-between mt-8">
              <span className="text-xs text-text-muted">
                Showing {offset + 1}–{Math.min(offset + limit, data.total)} of {data.total.toLocaleString()}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                  className="px-4 py-2 text-xs font-medium bg-surface-2 border border-border rounded-xl disabled:opacity-30 hover:bg-surface-hover transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setOffset(offset + limit)}
                  disabled={offset + limit >= data.total}
                  className="px-4 py-2 text-xs font-medium bg-surface-2 border border-border rounded-xl disabled:opacity-30 hover:bg-surface-hover transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}

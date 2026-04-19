import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { SiteHeader } from "@/components/SiteHeader";
import { ListingCard } from "@/components/ListingCard";
import { supabase } from "@/integrations/supabase/client";
import type { Listing } from "@/lib/types";
import { Search } from "lucide-react";

const TYPES = [
  { v: "all", label: "All" },
  { v: "rent", label: "Rent" },
  { v: "sell", label: "Buy" },
  { v: "both", label: "Rent / Buy" },
] as const;

export default function Marketplace() {
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [rentedMap, setRentedMap] = useState<Record<string, string>>({});
  const [type, setType] = useState<string>("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"new" | "price_asc" | "price_desc">("new");

  useEffect(() => {
    // Show approved + sold so buyers see what's no longer available (with Sold badge)
    supabase
      .from("listings")
      .select("*")
      .in("status", ["approved", "sold"])
      .order("created_at", { ascending: false })
      .then(async ({ data }) => {
        const ls = (data as Listing[]) || [];
        setListings(ls);
        const ids = ls.map((l) => l.id);
        if (!ids.length) return;
        const { data: txns } = await supabase
          .from("transactions")
          .select("listing_id, expires_at")
          .eq("transaction_type", "rent")
          .eq("status", "completed")
          .in("listing_id", ids)
          .gt("expires_at", new Date().toISOString());
        const map: Record<string, string> = {};
        (txns ?? []).forEach((t) => {
          if (!t.expires_at) return;
          const cur = map[t.listing_id];
          if (!cur || new Date(t.expires_at) > new Date(cur)) map[t.listing_id] = t.expires_at;
        });
        setRentedMap(map);
      });
  }, []);

  const filtered = useMemo(() => {
    if (!listings) return [];
    let out = listings.filter((l) => type === "all" || l.listing_type === type);
    if (q.trim()) {
      const needle = q.toLowerCase();
      out = out.filter((l) => l.title.toLowerCase().includes(needle) || l.rank?.toLowerCase().includes(needle));
    }
    if (sort === "price_asc") out = [...out].sort((a, b) => (a.buy_price ?? a.rent_daily_price ?? 0) - (b.buy_price ?? b.rent_daily_price ?? 0));
    if (sort === "price_desc") out = [...out].sort((a, b) => (b.buy_price ?? b.rent_daily_price ?? 0) - (a.buy_price ?? a.rent_daily_price ?? 0));
    return out;
  }, [listings, type, q, sort]);

  return (
    <main className="min-h-screen bg-background text-foreground noise-overlay">
      <SiteHeader />
      <section className="relative overflow-hidden px-6 pb-12 pt-32 md:px-10">
        <div className="pointer-events-none absolute inset-0 bg-radial-glow opacity-60" />
        <div className="relative mx-auto max-w-7xl">
          <p className="font-display text-[11px] uppercase tracking-[0.4em] text-primary/80">Marketplace</p>
          <h1 className="mt-4 font-display text-5xl font-semibold tracking-tight text-balance md:text-7xl">
            Premium Valorant <span className="text-gradient-primary">accounts</span>.
          </h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Hand-curated listings from verified sellers. Rent or own outright.
          </p>

          {/* Filters */}
          <div className="mt-10 flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by title or rank…"
                className="w-full rounded-full border border-border/60 bg-foreground/[0.03] py-3 pl-11 pr-4 text-sm focus:border-primary/60 focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {TYPES.map((t) => (
                <button key={t.v} onClick={() => setType(t.v)}
                  className={`rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.25em] transition ${
                    type === t.v
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border/60 bg-foreground/[0.03] text-muted-foreground hover:text-foreground"
                  }`}>{t.label}</button>
              ))}
            </div>
            <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}
              className="rounded-full border border-border/60 bg-foreground/[0.03] px-4 py-2 text-[11px] uppercase tracking-[0.25em] focus:border-primary/60 focus:outline-none">
              <option value="new">Newest</option>
              <option value="price_asc">Price: Low → High</option>
              <option value="price_desc">Price: High → Low</option>
            </select>
          </div>
        </div>
      </section>

      <section className="px-6 pb-32 md:px-10">
        <div className="mx-auto max-w-7xl">
          {!listings && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-72 animate-pulse rounded-2xl bg-foreground/[0.04]" />
              ))}
            </div>
          )}
          {listings && filtered.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border/60 p-16 text-center">
              <p className="font-display text-lg">No listings match your filters.</p>
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((l, i) => (
              <motion.div key={l.id}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: Math.min(i * 0.03, 0.3) }}>
                <ListingCard listing={l} rentedUntil={rentedMap[l.id] ?? null} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

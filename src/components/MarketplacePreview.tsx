import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Shield, Zap, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ListingCard } from "@/components/ListingCard";
import type { Listing } from "@/lib/types";

export function MarketplacePreview() {
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [rentedMap, setRentedMap] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase
      .from("listings")
      .select("*")
      .in("status", ["approved", "sold"])
      .order("created_at", { ascending: false })
      .limit(6)
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

  return (
    <section className="relative overflow-hidden px-6 py-32 md:px-10">
      <div className="pointer-events-none absolute inset-0 bg-radial-glow opacity-40" />
      <div className="relative mx-auto max-w-7xl">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="font-display text-[11px] uppercase tracking-[0.4em] text-primary/80">
              The Marketplace
            </p>
            <h2 className="mt-4 max-w-2xl font-display text-5xl font-semibold tracking-tight text-balance md:text-6xl">
              Verified accounts. <span className="text-gradient-primary">Premium inventories.</span>
            </h2>
            <p className="mt-4 max-w-xl text-muted-foreground">
              Browse hand-curated Valorant accounts from verified sellers. Rent by the hour, day, or own outright.
            </p>
          </div>
          <Link
            to="/marketplace"
            className="group inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-foreground hover:text-primary"
          >
            View all listings <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Feature pills */}
        <div className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-3">
          {[
            { icon: Shield, label: "Verified Sellers", desc: "Every seller manually approved" },
            { icon: Zap, label: "Instant Demo Payment", desc: "QR-based mock checkout" },
            { icon: Star, label: "Premium Inventories", desc: "Rare skins & high ranks" },
          ].map((f) => (
            <div key={f.label} className="glass rounded-2xl p-5">
              <f.icon className="h-5 w-5 text-primary" />
              <p className="mt-3 font-display text-sm font-semibold">{f.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Listings */}
        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {!listings &&
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-72 animate-pulse rounded-2xl bg-foreground/[0.04]" />
            ))}
          {listings?.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-border/60 p-16 text-center">
              <p className="font-display text-lg">No active listings yet.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Be the first — create a premium listing.
              </p>
              <Link
                to="/marketplace/new"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-xs uppercase tracking-[0.2em] text-primary-foreground shadow-glow"
              >
                Create Listing
              </Link>
            </div>
          )}
          {listings?.map((l, i) => (
            <motion.div
              key={l.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: Math.min(i * 0.05, 0.3) }}
            >
              <ListingCard listing={l} rentedUntil={rentedMap[l.id] ?? null} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

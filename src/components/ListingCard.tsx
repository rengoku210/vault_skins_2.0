import { Link } from "react-router-dom";
import { Shield, Eye, Lock } from "lucide-react";
import type { Listing } from "@/lib/types";

const RANK_COLORS: Record<string, string> = {
  Iron: "text-zinc-400",
  Bronze: "text-amber-700",
  Silver: "text-zinc-300",
  Gold: "text-yellow-500",
  Platinum: "text-cyan-400",
  Diamond: "text-blue-400",
  Ascendant: "text-emerald-400",
  Immortal: "text-rose-500",
  Radiant: "text-yellow-300",
};

export function ListingCard({
  listing,
  rentedUntil,
}: {
  listing: Listing;
  /** ISO timestamp — when set, the card shows a "Currently Rented" state with countdown. */
  rentedUntil?: string | null;
}) {
  const rankClass = RANK_COLORS[listing.rank ?? ""] ?? "text-muted-foreground";
  const showRent = listing.listing_type !== "sell" && (listing.rent_hourly_price || listing.rent_daily_price);
  const showBuy = listing.listing_type !== "rent" && listing.buy_price;
  const isSold = listing.status === "sold";
  const isRented = !!rentedUntil && new Date(rentedUntil).getTime() > Date.now();
  const unavailable = isSold || isRented;

  return (
    <Link
      to={`/marketplace/${listing.id}`}
      className={`group block overflow-hidden rounded-2xl border border-border/40 bg-card-gradient transition hover:border-primary/50 hover:shadow-glow ${
        unavailable ? "opacity-90" : ""
      }`}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-secondary">
        {listing.cover_image_url ? (
          <img
            src={listing.cover_image_url}
            alt={listing.title}
            loading="lazy"
            className={`h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 ${
              unavailable ? "grayscale" : ""
            }`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-transparent">
            <span className="font-display text-3xl font-semibold text-foreground/20">VaultSkins</span>
          </div>
        )}

        <div className="absolute inset-x-0 top-0 flex justify-between p-3">
          <span className="rounded-full bg-background/80 px-3 py-1 text-[10px] font-display uppercase tracking-[0.25em] backdrop-blur">
            {listing.listing_type === "both" ? "Rent / Buy" : listing.listing_type}
          </span>
          {listing.region && (
            <span className="rounded-full bg-background/80 px-3 py-1 text-[10px] font-display uppercase tracking-[0.25em] text-muted-foreground backdrop-blur">
              {listing.region}
            </span>
          )}
        </div>

        {/* Sold / Rented banner */}
        {unavailable && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/55 backdrop-blur-[1px]">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-[11px] font-display uppercase tracking-[0.3em] backdrop-blur ${
                isSold
                  ? "border-rose-400/50 bg-rose-400/15 text-rose-200"
                  : "border-primary/50 bg-primary/15 text-primary"
              }`}
            >
              <Lock className="h-3 w-3" />
              {isSold ? "Sold" : "Currently rented"}
            </span>
            {isRented && rentedUntil && (
              <p className="mt-2 font-display text-[10px] uppercase tracking-[0.25em] text-foreground/80">
                {formatRemaining(rentedUntil)}
              </p>
            )}
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-card to-transparent" />
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-display text-base font-semibold">{listing.title}</h3>
            {listing.rank && (
              <p className={`mt-1 text-xs font-display uppercase tracking-[0.2em] ${rankClass}`}>
                <Shield className="mr-1 inline h-3 w-3" /> {listing.rank}
              </p>
            )}
          </div>
          <div className="text-right">
            {showBuy && (
              <p className="font-display text-lg font-semibold text-foreground">
                ₹{Number(listing.buy_price).toLocaleString()}
              </p>
            )}
            {showRent && listing.rent_daily_price && (
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                ₹{Number(listing.rent_daily_price).toLocaleString()}/day
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3 text-[11px] text-muted-foreground">
          <span>{listing.agents_owned ?? 0} agents · {listing.skins_count ?? 0} skins</span>
          <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" /> {listing.view_count}</span>
        </div>
      </div>
    </Link>
  );
}

function formatRemaining(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "Available again";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h >= 24) return `Available in ${Math.ceil(h / 24)}d`;
  if (h >= 1) return `${h}h ${m}m remaining`;
  return `${m}m remaining`;
}

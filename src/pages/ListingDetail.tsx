import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Shield, ShieldCheck, Eye, Calendar, Clock, Tag, Lock, Sparkles, Play, Crown } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { PaymentModal } from "@/components/PaymentModal";
import { SkinPreviewModal } from "@/components/SkinPreviewModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Listing, ListingSkin, Profile } from "@/lib/types";
import type { Skin } from "@/lib/valorant-api";

// Valorant rarity tiers (higher rank = more premium)
const TIER_RANK: Record<string, { rank: number; name: string; color: string }> = {
  "e046854e-406c-37f4-6607-19a9ba8426fc": { rank: 5, name: "Ultra", color: "#f9d563" },
  "12683d76-48d7-84a3-4e09-6985794f0445": { rank: 4, name: "Exclusive", color: "#f8a352" },
  "60bca009-4182-7998-dee7-b8a2558dc369": { rank: 3, name: "Premium", color: "#d1548d" },
  "0cebb8be-46d7-c12a-d306-e9907bfc5a25": { rank: 2, name: "Deluxe", color: "#5cf0b8" },
  "12683d76-48d7-84a3-4e09-6985794f0444": { rank: 1, name: "Select", color: "#5a9fe2" },
};

function tierMeta(uuid: string | null | undefined) {
  if (!uuid) return null;
  return TIER_RANK[uuid] ?? null;
}

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [seller, setSeller] = useState<Profile | null>(null);
  const [skins, setSkins] = useState<ListingSkin[]>([]);
  const [rentedUntil, setRentedUntil] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState<{ type: "rent" | "buy"; amount: number; hours?: number }>({ type: "buy", amount: 0 });
  const [previewSkin, setPreviewSkin] = useState<{ skin: Skin; weaponName?: string } | null>(null);
  const [featuredIdx, setFeaturedIdx] = useState(0);

  useEffect(() => {
    if (!id) return;
    supabase.from("listings").select("*").eq("id", id).maybeSingle()
      .then(async ({ data, error }) => {
        if (error || !data) { setError("Listing not found"); return; }
        setListing(data as Listing);
        supabase.from("listings").update({ view_count: (data.view_count ?? 0) + 1 }).eq("id", id);
        const [{ data: s }, { data: sk }, { data: rentTxns }] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", data.seller_id).maybeSingle(),
          supabase.from("listing_skins").select("*").eq("listing_id", id).order("created_at"),
          supabase
            .from("transactions")
            .select("expires_at")
            .eq("listing_id", id)
            .eq("transaction_type", "rent")
            .eq("status", "completed")
            .gt("expires_at", new Date().toISOString())
            .order("expires_at", { ascending: false })
            .limit(1),
        ]);
        setSeller(s as Profile);
        setSkins((sk as ListingSkin[]) ?? []);
        setRentedUntil(rentTxns?.[0]?.expires_at ?? null);
      });
  }, [id]);

  // Sort skins: rarest first, then those with video previews, then by name
  const sortedSkins = useMemo(() => {
    return [...skins].sort((a, b) => {
      const ra = tierMeta(a.content_tier_uuid)?.rank ?? 0;
      const rb = tierMeta(b.content_tier_uuid)?.rank ?? 0;
      if (rb !== ra) return rb - ra;
      const va = a.preview_video ? 1 : 0;
      const vb = b.preview_video ? 1 : 0;
      if (vb !== va) return vb - va;
      return a.skin_name.localeCompare(b.skin_name);
    });
  }, [skins]);

  const featured = sortedSkins[featuredIdx] ?? null;

  const isSold = listing?.status === "sold";
  const isRented = !!rentedUntil && new Date(rentedUntil).getTime() > Date.now();
  const unavailable = isSold || isRented;

  const startCheckout = (type: "rent" | "buy", amount: number, hours?: number) => {
    if (!user) { toast.error("Sign in to continue"); return; }
    if (unavailable) {
      toast.error(isSold ? "This account has already been sold." : "This account is currently rented.");
      return;
    }
    if (!amount) { toast.error("Price not available"); return; }
    setPaymentMode({ type, amount, hours });
    setPaymentOpen(true);
  };

  const openSkinPreview = (s: ListingSkin) => {
    const skin: Skin = {
      uuid: s.skin_uuid,
      displayName: s.skin_name,
      displayIcon: s.display_icon,
      wallpaper: null,
      contentTierUuid: s.content_tier_uuid,
      themeUuid: null,
      chromas: [
        {
          uuid: `${s.skin_uuid}-base`,
          displayName: s.skin_name,
          displayIcon: s.display_icon,
          fullRender: s.display_icon,
          swatch: null,
          streamedVideo: s.preview_video,
        },
      ],
      levels: s.preview_video
        ? [{ uuid: `${s.skin_uuid}-l1`, displayName: s.skin_name, displayIcon: s.display_icon, streamedVideo: s.preview_video, levelItem: null }]
        : [],
    };
    setPreviewSkin({ skin, weaponName: s.weapon_name ?? undefined });
  };

  if (error) return (
    <main className="min-h-screen bg-background text-foreground"><SiteHeader />
      <div className="mx-auto max-w-3xl px-6 pt-40 text-center"><p className="text-destructive">{error}</p></div>
    </main>
  );

  if (!listing) return (
    <main className="min-h-screen bg-background text-foreground"><SiteHeader />
      <div className="mx-auto max-w-7xl px-6 pt-40">
        <div className="h-72 animate-pulse rounded-2xl bg-foreground/[0.04]" />
      </div>
    </main>
  );

  // Featured media: prefer rarest skin, fallback to cover image
  const heroImage = featured?.display_icon ?? listing.cover_image_url ?? sortedSkins[0]?.display_icon ?? null;
  const heroVideo = featured?.preview_video ?? null;
  const heroTier = tierMeta(featured?.content_tier_uuid);

  return (
    <main className="min-h-screen bg-background text-foreground noise-overlay">
      <SiteHeader />
      <div className="px-6 pb-32 pt-28 md:px-10">
        <div className="mx-auto max-w-7xl">
          <Link to="/marketplace" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Marketplace
          </Link>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-5">
            {/* Left: media + details */}
            <div className="lg:col-span-3">
              {/* Controlled premium media frame */}
              <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-foreground/[0.04] via-background to-primary/[0.06]">
                <div
                  className="relative mx-auto flex w-full items-center justify-center"
                  style={{ aspectRatio: "16 / 9", maxHeight: "440px" }}
                >
                  {heroVideo ? (
                    <video
                      key={heroVideo}
                      src={heroVideo}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="h-full w-full object-contain p-6"
                    />
                  ) : heroImage ? (
                    <img
                      src={heroImage}
                      alt={featured?.skin_name ?? listing.title}
                      className="max-h-full max-w-full object-contain p-8 drop-shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <span className="font-display text-4xl font-semibold text-foreground/15">VaultSkins</span>
                    </div>
                  )}

                  {/* Subtle vignette for depth */}
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,hsl(var(--background)/0.4))]" />
                </div>

                {/* Featured badge overlay */}
                {featured && (
                  <div className="absolute left-4 top-4 flex items-center gap-2">
                    {heroTier && (
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full border bg-background/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] backdrop-blur-md"
                        style={{ borderColor: `${heroTier.color}55`, color: heroTier.color }}
                      >
                        <Crown className="h-3 w-3" /> {heroTier.name}
                      </span>
                    )}
                    <span className="rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground backdrop-blur-md">
                      Featured · {featured.weapon_name}
                    </span>
                  </div>
                )}
                {heroVideo && (
                  <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-primary/90 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-primary-foreground backdrop-blur-md">
                    <Play className="h-2.5 w-2.5 fill-current" /> Live
                  </span>
                )}
              </div>

              {/* Featured thumb strip */}
              {sortedSkins.length > 1 && (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {sortedSkins.slice(0, 8).map((s, i) => {
                    const t = tierMeta(s.content_tier_uuid);
                    return (
                      <button
                        key={s.id}
                        onClick={() => setFeaturedIdx(i)}
                        className={
                          "relative flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-card/40 transition " +
                          (i === featuredIdx
                            ? "border-primary shadow-glow"
                            : "border-border/40 hover:border-border")
                        }
                        style={i === featuredIdx && t ? { boxShadow: `0 0 0 1px ${t.color}66, 0 8px 24px ${t.color}22` } : undefined}
                      >
                        {s.display_icon ? (
                          <img src={s.display_icon} alt={s.skin_name} className="h-full w-full object-contain p-1.5" loading="lazy" />
                        ) : (
                          <span className="text-[9px] text-muted-foreground">—</span>
                        )}
                        {s.preview_video && (
                          <span className="absolute bottom-0.5 right-0.5 rounded-full bg-primary/90 p-0.5">
                            <Play className="h-2 w-2 fill-current text-primary-foreground" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              <h1 className="mt-8 font-display text-3xl font-semibold tracking-tight md:text-4xl">{listing.title}</h1>
              <div className="mt-4 flex flex-wrap gap-2">
                {listing.rank && <span className="rounded-full border border-border/60 bg-foreground/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-foreground"><Shield className="mr-1 inline h-3 w-3" />{listing.rank}</span>}
                {listing.region && <span className="rounded-full border border-border/60 bg-foreground/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{listing.region}</span>}
                <span className="rounded-full bg-primary/15 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-primary">{listing.listing_type === "both" ? "Rent / Buy" : listing.listing_type}</span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-primary">
                  <Lock className="h-3 w-3" /> Encrypted handoff
                </span>
              </div>

              {listing.description && (
                <div className="mt-8">
                  <p className="font-display text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Description</p>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">{listing.description}</p>
                </div>
              )}

              <div className="mt-10 grid grid-cols-3 gap-4">
                <Stat label="Agents" value={String(listing.agents_owned ?? 0)} />
                <Stat label="Skins" value={String(skins.length || (listing.skins_count ?? 0))} />
                <Stat label="Inventory" value={`₹${Number(listing.inventory_value ?? 0).toLocaleString()}`} />
              </div>

              {/* Premium account gallery */}
              {sortedSkins.length > 0 && (
                <section className="mt-14">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="font-display text-[11px] uppercase tracking-[0.3em] text-primary/80">Inventory</p>
                      <h2 className="mt-2 flex items-center gap-2 font-display text-2xl font-semibold tracking-tight md:text-3xl">
                        <Sparkles className="h-5 w-5 text-primary" /> Premium skins included
                      </h2>
                    </div>
                    <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                      {sortedSkins.length} item{sortedSkins.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">
                    {sortedSkins.map((s, i) => {
                      const t = tierMeta(s.content_tier_uuid);
                      return (
                        <motion.button
                          key={s.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(i * 0.03, 0.3) }}
                          onClick={() => openSkinPreview(s)}
                          className="group relative overflow-hidden rounded-xl border border-border/40 bg-card/50 p-3 text-left transition hover:-translate-y-0.5 hover:border-primary/50"
                          style={t ? { boxShadow: `inset 0 0 0 1px ${t.color}1f` } : undefined}
                        >
                          {/* Rarity glow */}
                          {t && (
                            <div
                              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                              style={{ background: `radial-gradient(circle at 50% 0%, ${t.color}26, transparent 70%)` }}
                            />
                          )}

                          <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-gradient-to-br from-foreground/[0.04] to-transparent">
                            {s.display_icon ? (
                              <img
                                src={s.display_icon}
                                alt={s.skin_name}
                                loading="lazy"
                                className="h-full w-full object-contain p-2 transition-transform duration-700 group-hover:scale-110"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                                No preview
                              </div>
                            )}

                            {s.preview_video && (
                              <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary/90 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.2em] text-primary-foreground">
                                <Play className="h-2 w-2 fill-current" /> Video
                              </span>
                            )}
                            {t && (
                              <span
                                className="absolute left-2 top-2 rounded-full border bg-background/70 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.2em] backdrop-blur-md"
                                style={{ borderColor: `${t.color}55`, color: t.color }}
                              >
                                {t.name}
                              </span>
                            )}
                          </div>
                          <p className="relative mt-3 truncate font-display text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                            {s.weapon_name}
                          </p>
                          <p className="relative mt-0.5 truncate font-display text-sm font-semibold">{s.skin_name}</p>
                        </motion.button>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>

            {/* Right: pricing/checkout */}
            <aside className="lg:col-span-2">
              <div className="sticky top-28 glass rounded-2xl p-6">
                <p className="font-display text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Pricing</p>

                {unavailable && (
                  <div className={`mt-5 rounded-xl border p-4 ${isSold ? "border-rose-400/40 bg-rose-400/10" : "border-primary/40 bg-primary/10"}`}>
                    <p className={`flex items-center gap-2 font-display text-sm font-semibold ${isSold ? "text-rose-200" : "text-primary"}`}>
                      <Lock className="h-4 w-4" />
                      {isSold ? "This account has been sold" : "Currently rented"}
                    </p>
                    <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                      {isSold
                        ? "Ownership has been transferred to another buyer."
                        : rentedUntil ? formatRentalRemaining(rentedUntil) : "Temporarily unavailable."}
                    </p>
                  </div>
                )}

                {listing.buy_price && (listing.listing_type === "sell" || listing.listing_type === "both") && (
                  <div className={`mt-5 rounded-xl border border-border/40 p-4 ${unavailable ? "opacity-50" : ""}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Buy outright</p>
                        <p className="mt-1 font-display text-3xl font-semibold">₹{Number(listing.buy_price).toLocaleString()}</p>
                      </div>
                      <Tag className="h-5 w-5 text-primary" />
                    </div>
                    <button
                      disabled={unavailable}
                      onClick={() => startCheckout("buy", Number(listing.buy_price))}
                      className="mt-4 w-full rounded-full bg-primary px-4 py-3 text-xs uppercase tracking-[0.2em] text-primary-foreground shadow-glow transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
                    >
                      {isSold ? "Sold" : isRented ? "Unavailable" : "Buy Now"}
                    </button>
                  </div>
                )}

                {(listing.listing_type === "rent" || listing.listing_type === "both") && (listing.rent_hourly_price || listing.rent_daily_price) && (
                  <div className={`mt-3 space-y-3 ${unavailable ? "opacity-50" : ""}`}>
                    {listing.rent_hourly_price && (
                      <RentRow disabled={unavailable} icon={<Clock className="h-4 w-4" />} label="Per hour" amount={Number(listing.rent_hourly_price)} onPick={() => startCheckout("rent", Number(listing.rent_hourly_price), 1)} />
                    )}
                    {listing.rent_daily_price && (
                      <RentRow disabled={unavailable} icon={<Calendar className="h-4 w-4" />} label="Per day" amount={Number(listing.rent_daily_price)} onPick={() => startCheckout("rent", Number(listing.rent_daily_price), 24)} />
                    )}
                  </div>
                )}

                <div className="mt-5 rounded-xl border border-primary/20 bg-primary/[0.05] p-4 text-[11px] leading-relaxed text-muted-foreground">
                  <p className="flex items-start gap-2 text-foreground/90">
                    <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <span>
                      Riot credentials are encrypted at rest. They are released by an administrator only after your payment is confirmed.
                    </span>
                  </p>
                </div>

                <div className="mt-6 border-t border-border/40 pt-5">
                  <p className="font-display text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Seller</p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 font-display text-sm font-semibold text-primary">
                      {(seller?.display_name ?? "S").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="flex items-center gap-1.5 font-display text-sm font-semibold">
                        {seller?.display_name ?? "Seller"}
                        {seller?.is_verified && <ShieldCheck className="h-3.5 w-3.5 text-primary" />}
                      </p>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground"><Eye className="mr-1 inline h-3 w-3" />{listing.view_count} views</p>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </motion.div>
        </div>
      </div>

      <PaymentModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        listing={listing}
        type={paymentMode.type}
        amount={paymentMode.amount}
        rentHours={paymentMode.hours}
      />

      {previewSkin && (
        <SkinPreviewModal
          skin={previewSkin.skin}
          weaponName={previewSkin.weaponName}
          onClose={() => setPreviewSkin(null)}
        />
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/40 bg-foreground/[0.02] p-4 text-center">
      <p className="font-display text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
    </div>
  );
}

function RentRow({ icon, label, amount, onPick, disabled }: { icon: React.ReactNode; label: string; amount: number; onPick: () => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border/40 p-4">
      <div className="flex items-center gap-3">
        <div className="text-primary">{icon}</div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{label}</p>
          <p className="font-display text-lg font-semibold">₹{amount.toLocaleString()}</p>
        </div>
      </div>
      <button
        onClick={onPick}
        disabled={disabled}
        className="rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-primary transition hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {disabled ? "Locked" : "Rent"}
      </button>
    </div>
  );
}

function formatRentalRemaining(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "Available again shortly";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h >= 24) return `Available in ${Math.ceil(h / 24)} day${Math.ceil(h / 24) === 1 ? "" : "s"}`;
  if (h >= 1) return `${h}h ${m}m remaining`;
  return `${m}m remaining`;
}

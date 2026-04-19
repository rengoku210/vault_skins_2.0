import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Package, Receipt, Bell, ShoppingBag } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { OwnedAccountCard } from "@/components/OwnedAccountCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Listing, Transaction } from "@/lib/types";

const STATUS_COLORS: Record<string, string> = {
  pending: "text-yellow-400 bg-yellow-400/10",
  approved: "text-emerald-400 bg-emerald-400/10",
  rejected: "text-rose-400 bg-rose-400/10",
  sold: "text-zinc-400 bg-zinc-400/10",
  archived: "text-zinc-500 bg-zinc-500/10",
};

type Tab = "listings" | "owned" | "rentals" | "sales";

export default function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("listings");
  const [listings, setListings] = useState<Listing[]>([]);
  const [purchases, setPurchases] = useState<Transaction[]>([]);
  const [sales, setSales] = useState<Transaction[]>([]);
  const [listingsById, setListingsById] = useState<Record<string, Listing>>({});

  useEffect(() => {
    if (!loading && !user) navigate("/auth?redirect=/dashboard");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("listings").select("*").eq("seller_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setListings((data as Listing[]) || []));
    supabase.from("transactions").select("*").eq("buyer_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setPurchases((data as Transaction[]) || []));
    supabase.from("transactions").select("*").eq("seller_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setSales((data as Transaction[]) || []));
  }, [user]);

  // Hydrate every listing referenced by a transaction (so we can show titles, covers, contact)
  useEffect(() => {
    const ids = Array.from(new Set([...purchases, ...sales].map((t) => t.listing_id)));
    if (ids.length === 0) return;
    supabase.from("listings").select("*").in("id", ids).then(({ data }) => {
      const map: Record<string, Listing> = {};
      (data as Listing[] | null)?.forEach((l) => { map[l.id] = l; });
      setListingsById(map);
    });
  }, [purchases, sales]);

  if (!user) return null;

  const totalEarnings = sales.filter((s) => s.status === "completed").reduce((sum, s) => sum + Number(s.amount), 0);
  const ownedPurchases = purchases.filter((t) => t.transaction_type === "buy");
  const activeRentals = purchases.filter((t) => t.transaction_type === "rent");

  return (
    <main className="min-h-screen bg-background text-foreground noise-overlay">
      <SiteHeader />
      <div className="px-6 pb-32 pt-28 md:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="font-display text-[11px] uppercase tracking-[0.4em] text-primary/80">Dashboard</p>
              <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">
                Welcome, {user.email?.split("@")[0]}
              </h1>
            </div>
            <Link to="/marketplace/new"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-xs uppercase tracking-[0.2em] text-primary-foreground shadow-glow">
              <Plus className="h-4 w-4" /> New Listing
            </Link>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard icon={<Package />} label="My listings" value={String(listings.length)} />
            <StatCard icon={<ShoppingBag />} label="Owned accounts" value={String(ownedPurchases.length)} />
            <StatCard icon={<Receipt />} label="Active rentals" value={String(activeRentals.length)} />
            <StatCard icon={<Bell />} label="Earnings" value={`₹${totalEarnings.toLocaleString()}`} highlight />
          </div>

          <div className="mt-10 flex flex-wrap gap-2 border-b border-border/40">
            {(["listings", "owned", "rentals", "sales"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`relative px-4 py-3 text-xs uppercase tracking-[0.2em] transition ${
                  tab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}>
                {tabLabel(t)}
                {tab === t && <motion.div layoutId="dash-tab" className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />}
              </button>
            ))}
          </div>

          <div className="mt-8">
            {tab === "listings" && (
              listings.length === 0 ? (
                <Empty msg="You haven't listed an account yet." action={{ label: "Create Listing", to: "/marketplace/new" }} />
              ) : (
                <div className="space-y-3">
                  {listings.map((l) => (
                    <Link key={l.id} to={`/marketplace/${l.id}`}
                      className="flex items-center gap-4 rounded-2xl border border-border/40 bg-card-gradient p-4 transition hover:border-primary/50">
                      <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-secondary">
                        {l.cover_image_url && <img src={l.cover_image_url} alt="" className="h-full w-full object-cover" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-sm font-semibold">{l.title}</p>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{l.rank ?? "—"} · {l.region ?? "—"}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] ${STATUS_COLORS[l.status]}`}>
                        {l.status}
                      </span>
                    </Link>
                  ))}
                </div>
              )
            )}

            {tab === "owned" && (
              ownedPurchases.length === 0 ? (
                <Empty msg="No purchased accounts yet." action={{ label: "Browse Marketplace", to: "/marketplace" }} />
              ) : (
                <div className="space-y-3">
                  {ownedPurchases.map((t) => (
                    <OwnedAccountCard key={t.id} txn={t} listing={listingsById[t.listing_id]} side="buyer" />
                  ))}
                </div>
              )
            )}

            {tab === "rentals" && (
              activeRentals.length === 0 ? (
                <Empty msg="No active rentals." action={{ label: "Browse Marketplace", to: "/marketplace" }} />
              ) : (
                <div className="space-y-3">
                  {activeRentals.map((t) => (
                    <OwnedAccountCard key={t.id} txn={t} listing={listingsById[t.listing_id]} side="buyer" />
                  ))}
                </div>
              )
            )}

            {tab === "sales" && (
              sales.length === 0 ? (
                <Empty msg="No sales yet." />
              ) : (
                <div className="space-y-3">
                  {sales.map((t) => (
                    <OwnedAccountCard key={t.id} txn={t} listing={listingsById[t.listing_id]} side="seller" />
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function tabLabel(t: Tab): string {
  switch (t) {
    case "listings": return "My listings";
    case "owned": return "Owned";
    case "rentals": return "Rentals";
    case "sales": return "Sales";
  }
}

function StatCard({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 ${highlight ? "border-primary/40 bg-primary/5" : "border-border/40 bg-card-gradient"}`}>
      <div className={highlight ? "text-primary" : "text-muted-foreground"}>{icon}</div>
      <p className="mt-3 font-display text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
    </div>
  );
}

function Empty({ msg, action }: { msg: string; action?: { label: string; to: string } }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/60 p-16 text-center">
      <p className="font-display text-base">{msg}</p>
      {action && (
        <Link to={action.to}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-xs uppercase tracking-[0.2em] text-primary-foreground shadow-glow">
          {action.label}
        </Link>
      )}
    </div>
  );
}

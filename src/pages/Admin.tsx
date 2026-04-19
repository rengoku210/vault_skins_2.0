import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, X, Eye } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Listing } from "@/lib/types";

export default function Admin() {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"pending" | "approved" | "rejected" | "release">("pending");
  const [listings, setListings] = useState<Listing[]>([]);
  const [pendingReleases, setPendingReleases] = useState<Array<{ id: string; mock_txn_id: string; amount: number; listing_id: string; created_at: string; listing_title: string | null }>>([]);
  const [stats, setStats] = useState({ users: 0, listings: 0, txns: 0, revenue: 0 });
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate("/");
  }, [user, isAdmin, loading, navigate]);

  const load = async () => {
    if (tab === "release") {
      const { data: txns } = await supabase
        .from("transactions")
        .select("id, mock_txn_id, amount, listing_id, created_at")
        .eq("transaction_type", "buy")
        .eq("status", "completed")
        .eq("credentials_released", false)
        .order("created_at", { ascending: false });
      const ids = Array.from(new Set((txns ?? []).map((t) => t.listing_id)));
      const titles: Record<string, string> = {};
      if (ids.length) {
        const { data: ls } = await supabase.from("listings").select("id,title").in("id", ids);
        (ls ?? []).forEach((l) => { titles[l.id] = l.title; });
      }
      setPendingReleases((txns ?? []).map((t) => ({ ...t, listing_title: titles[t.listing_id] ?? null })));
      return;
    }
    const { data } = await supabase.from("listings").select("*").eq("status", tab).order("created_at", { ascending: false });
    setListings((data as Listing[]) || []);
  };

  useEffect(() => { if (isAdmin) load(); }, [tab, isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("listings").select("id", { count: "exact", head: true }),
      supabase.from("transactions").select("amount, status"),
    ]).then(([u, l, t]) => {
      const completed = (t.data || []).filter((x: { status: string }) => x.status === "completed");
      setStats({
        users: u.count ?? 0,
        listings: l.count ?? 0,
        txns: t.data?.length ?? 0,
        revenue: completed.reduce((sum: number, x: { amount: number }) => sum + Number(x.amount), 0),
      });
    });
  }, [isAdmin]);

  const updateStatus = async (id: string, status: "approved" | "rejected") => {
    setBusy(id);
    const { error } = await supabase.from("listings").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); setBusy(null); return; }
    const listing = listings.find((l) => l.id === id);
    if (listing) {
      await supabase.from("notifications").insert({
        user_id: listing.seller_id,
        title: status === "approved" ? "Listing approved" : "Listing rejected",
        message: listing.title,
        link: `/marketplace/${id}`,
      });
    }
    toast.success(`Listing ${status}`);
    setBusy(null);
    load();
  };

  const releaseCreds = async (txnId: string) => {
    setBusy(txnId);
    const { error } = await supabase.rpc("admin_release_credentials", { _transaction_id: txnId });
    if (error) toast.error(error.message);
    else toast.success("Credentials released to buyer");
    setBusy(null);
    load();
  };

  if (!isAdmin) return null;

  return (
    <main className="min-h-screen bg-background text-foreground noise-overlay">
      <SiteHeader />
      <div className="px-6 pb-32 pt-28 md:px-10">
        <div className="mx-auto max-w-7xl">
          <p className="font-display text-[11px] uppercase tracking-[0.4em] text-primary/80">Admin Panel</p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">Operations</h1>

          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            <Stat label="Users" value={stats.users.toLocaleString()} />
            <Stat label="Listings" value={stats.listings.toLocaleString()} />
            <Stat label="Transactions" value={stats.txns.toLocaleString()} />
            <Stat label="Demo Revenue" value={`₹${stats.revenue.toLocaleString()}`} highlight />
          </div>

          <div className="mt-10 flex flex-wrap gap-2 border-b border-border/40">
            {(["pending", "approved", "rejected", "release"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`relative px-4 py-3 text-xs uppercase tracking-[0.2em] transition ${
                  tab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}>
                {t}
                {tab === t && <motion.div layoutId="admin-tab" className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />}
              </button>
            ))}
          </div>

          {/* Release tab UI */}
          {tab === "release" && (
            <div className="mt-8 space-y-3">
              {pendingReleases.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border/60 p-16 text-center text-muted-foreground">
                  No purchases waiting for credential release.
                </div>
              )}
              {pendingReleases.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-col gap-4 rounded-2xl border border-primary/30 bg-card-gradient p-5 md:flex-row md:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-emerald-300">
                        <Check className="h-3 w-3" /> Payment verified
                      </span>
                      <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-amber-300">
                        Awaiting release
                      </span>
                      <span className="rounded-full border border-border/60 bg-foreground/[0.03] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        {r.mock_txn_id}
                      </span>
                    </div>
                    <p className="mt-3 truncate font-display text-base font-semibold">
                      {r.listing_title ?? "Listing"}
                    </p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                      ₹{Number(r.amount).toLocaleString()} · paid {new Date(r.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={`/marketplace/${r.listing_id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
                    >
                      <Eye className="h-3.5 w-3.5" /> View listing
                    </a>
                    <button
                      disabled={busy === r.id}
                      onClick={() => releaseCreds(r.id)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-[11px] uppercase tracking-[0.2em] text-primary-foreground shadow-glow hover:scale-[1.02] disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" /> Release credentials
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Listings tabs UI */}
          {tab !== "release" && (
          <div className="mt-8 space-y-3">
            {listings.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border/60 p-16 text-center text-muted-foreground">
                No {tab} listings.
              </div>
            )}
            {listings.map((l) => (
              <div key={l.id} className="flex flex-col gap-4 rounded-2xl border border-border/40 bg-card-gradient p-4 md:flex-row md:items-center">
                <div className="h-20 w-32 shrink-0 overflow-hidden rounded-lg bg-secondary">
                  {l.cover_image_url && <img src={l.cover_image_url} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-base font-semibold">{l.title}</p>
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{l.description}</p>
                  <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    {l.listing_type} · {l.rank ?? "—"} · {l.region ?? "—"} · ₹{Number(l.buy_price ?? l.rent_daily_price ?? 0).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <a href={`/marketplace/${l.id}`} target="_blank" rel="noreferrer"
                    className="rounded-full border border-border/60 p-2.5 text-muted-foreground hover:text-foreground">
                    <Eye className="h-4 w-4" />
                  </a>
                  {tab !== "approved" && (
                    <button disabled={busy === l.id} onClick={() => updateStatus(l.id, "approved")}
                      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-emerald-400 hover:bg-emerald-400/20 disabled:opacity-50">
                      <Check className="h-3.5 w-3.5" /> Approve
                    </button>
                  )}
                  {tab !== "rejected" && (
                    <button disabled={busy === l.id} onClick={() => updateStatus(l.id, "rejected")}
                      className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/40 bg-rose-400/10 px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-rose-400 hover:bg-rose-400/20 disabled:opacity-50">
                      <X className="h-3.5 w-3.5" /> Reject
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 ${highlight ? "border-primary/40 bg-primary/5" : "border-border/40 bg-card-gradient"}`}>
      <p className={`font-display text-2xl font-semibold ${highlight ? "text-primary" : ""}`}>{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
    </div>
  );
}

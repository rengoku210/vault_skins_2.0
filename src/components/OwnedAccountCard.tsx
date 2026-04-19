import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Lock, Copy, Eye, EyeOff, Clock, ShieldCheck, Loader2, MessageCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Listing, Transaction } from "@/lib/types";

interface Props {
  txn: Transaction;
  listing: Listing | undefined;
  side: "buyer" | "seller";
}

/**
 * Owned-account card for the Dashboard.
 *
 * Buyer side:
 *   - Shows ownership / rental status with countdown
 *   - Shows seller contact (always after payment)
 *   - "Reveal credentials" button — calls buyer_reveal_credentials RPC
 *
 * Seller side:
 *   - Shows buyer-side status (awaiting release / transferred / rented)
 *   - Shows handoff instructions
 */
export function OwnedAccountCard({ txn, listing, side }: Props) {
  const [creds, setCreds] = useState<{ username: string; password: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (txn.transaction_type !== "rent" || !txn.expires_at) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [txn.expires_at, txn.transaction_type]);

  const isRent = txn.transaction_type === "rent";
  const expired = isRent && txn.expires_at ? new Date(txn.expires_at).getTime() <= now : false;
  const remainingMs = isRent && txn.expires_at ? Math.max(0, new Date(txn.expires_at).getTime() - now) : 0;

  const canReveal =
    side === "buyer" &&
    txn.status === "completed" &&
    (isRent ? !expired : txn.credentials_released);

  const reveal = async () => {
    if (!listing) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("buyer_reveal_credentials", { _listing_id: listing.id });
    setLoading(false);
    if (error || !data || data.length === 0) {
      toast.error(error?.message ?? "Could not reveal credentials");
      return;
    }
    setCreds({ username: data[0].username ?? "", password: data[0].password ?? "" });
  };

  const status = (() => {
    if (txn.status !== "completed") return { label: txn.status, tone: "neutral" as const };
    if (isRent) {
      if (expired) return { label: "Rental expired", tone: "neutral" as const };
      return { label: "Active rental", tone: "good" as const };
    }
    if (txn.credentials_released) return { label: "Ownership transferred", tone: "good" as const };
    return { label: "Awaiting credential release", tone: "warn" as const };
  })();

  return (
    <div className="rounded-2xl border border-border/40 bg-card-gradient p-4">
      <div className="flex items-start gap-4">
        <Link to={listing ? `/marketplace/${listing.id}` : "#"} className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-secondary">
          {listing?.cover_image_url && (
            <img src={listing.cover_image_url} alt="" className="h-full w-full object-cover" />
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <Link to={listing ? `/marketplace/${listing.id}` : "#"} className="truncate font-display text-sm font-semibold hover:text-primary">
              {listing?.title ?? "Listing"}
            </Link>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] ${
              status.tone === "good" ? "bg-emerald-400/10 text-emerald-400" :
              status.tone === "warn" ? "bg-yellow-400/10 text-yellow-400" :
              "bg-zinc-400/10 text-zinc-400"
            }`}>
              {status.label}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <code className="font-mono normal-case tracking-normal">{txn.mock_txn_id}</code>
            <span>·</span>
            <span>₹{Number(txn.amount).toLocaleString()}</span>
            <span>·</span>
            <span>{isRent ? "Rental" : "Purchase"}</span>
          </div>

          {isRent && !expired && txn.expires_at && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-primary">
              <Clock className="h-3 w-3" /> {formatCountdown(remainingMs)}
            </p>
          )}
        </div>
      </div>

      {/* Seller contact — visible to buyer for both rent and buy after payment */}
      {side === "buyer" && txn.status === "completed" && listing?.contact_handle && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-border/40 bg-foreground/[0.02] p-3">
          <div className="flex items-center gap-2 text-[11px]">
            <MessageCircle className="h-3.5 w-3.5 text-primary" />
            <span className="uppercase tracking-[0.2em] text-muted-foreground">{listing.contact_method ?? "Contact"}</span>
            <span className="font-mono text-foreground">{listing.contact_handle}</span>
          </div>
          <button
            onClick={() => { navigator.clipboard.writeText(listing.contact_handle ?? ""); toast.success("Copied"); }}
            className="text-muted-foreground hover:text-foreground"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Credential reveal — buyer only */}
      {side === "buyer" && txn.status === "completed" && (
        <div className="mt-3">
          {!creds ? (
            <button
              type="button"
              onClick={reveal}
              disabled={!canReveal || loading}
              className={`flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-[11px] uppercase tracking-[0.2em] transition ${
                canReveal
                  ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
                  : "border-border/40 bg-foreground/[0.02] text-muted-foreground"
              } disabled:opacity-50`}
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : canReveal ? (
                <>
                  <Lock className="h-3.5 w-3.5" /> Reveal Riot credentials
                </>
              ) : isRent && expired ? (
                <>
                  <AlertCircle className="h-3.5 w-3.5" /> Rental ended — credentials locked
                </>
              ) : (
                <>
                  <Clock className="h-3.5 w-3.5" /> Awaiting admin release
                </>
              )}
            </button>
          ) : (
            <div className="rounded-xl border border-primary/30 bg-primary/[0.04] p-4">
              <div className="flex items-center justify-between">
                <p className="inline-flex items-center gap-1.5 font-display text-[10px] uppercase tracking-[0.3em] text-primary">
                  <ShieldCheck className="h-3 w-3" /> Riot account
                </p>
                <button onClick={() => setCreds(null)} className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground">
                  Hide
                </button>
              </div>
              <CredRow label="Username" value={creds.username} />
              <CredRow
                label="Password"
                value={showPassword ? creds.password : "•".repeat(Math.min(12, creds.password.length))}
                trailing={
                  <button onClick={() => setShowPassword((v) => !v)} className="text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                }
                copyValue={creds.password}
              />
              {isRent && txn.expires_at && (
                <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Access until {new Date(txn.expires_at).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Seller-side handoff status */}
      {side === "seller" && txn.status === "completed" && (
        <div className="mt-4 rounded-xl border border-border/40 bg-foreground/[0.02] p-3 text-[11px] text-muted-foreground">
          {isRent ? (
            <>Buyer has temporary access{txn.expires_at ? ` until ${new Date(txn.expires_at).toLocaleString()}` : ""}.</>
          ) : txn.credentials_released ? (
            <>Ownership transferred. Buyer holds the Riot login.</>
          ) : (
            <>Awaiting admin to release credentials to the buyer. No action needed from you.</>
          )}
        </div>
      )}
    </div>
  );
}

function CredRow({
  label, value, trailing, copyValue,
}: { label: string; value: string; trailing?: React.ReactNode; copyValue?: string }) {
  return (
    <div className="mt-3 rounded-lg border border-border/40 bg-background/40 px-3 py-2.5">
      <p className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <code className="truncate font-mono text-sm text-foreground">{value}</code>
        <div className="flex items-center gap-2">
          {trailing}
          <button
            onClick={() => { navigator.clipboard.writeText(copyValue ?? value); toast.success(`${label} copied`); }}
            className="text-muted-foreground hover:text-foreground"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function formatCountdown(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d > 0) return `${d}d ${h}h remaining`;
  if (h > 0) return `${h}h ${m}m remaining`;
  if (m > 0) return `${m}m ${s}s remaining`;
  return `${s}s remaining`;
}

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2, X, Copy, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Listing } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  listing: Listing;
  type: "rent" | "buy";
  amount: number;
  rentHours?: number;
}

type Stage = "qr" | "verifying" | "success";

export function PaymentModal({ open, onClose, listing, type, amount, rentHours }: Props) {
  const { user } = useAuth();
  const [stage, setStage] = useState<Stage>("qr");
  const [txnId, setTxnId] = useState<string>("");

  useEffect(() => {
    if (open) { setStage("qr"); setTxnId(""); }
  }, [open]);

  const handleVerify = async () => {
    if (!user) return;
    setStage("verifying");

    const expiresAt =
      type === "rent" && rentHours
        ? new Date(Date.now() + rentHours * 60 * 60 * 1000).toISOString()
        : null;

    const { data, error } = await supabase.from("transactions").insert({
      listing_id: listing.id,
      buyer_id: user.id,
      seller_id: listing.seller_id,
      amount,
      transaction_type: type,
      status: "verifying",
      rent_hours: rentHours ?? null,
      expires_at: expiresAt,
    }).select().single();

    if (error) {
      toast.error(error.message);
      setStage("qr");
      return;
    }

    await new Promise((r) => setTimeout(r, 2500));

    await supabase.from("transactions")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", data.id);

    // Notify seller of new sale/rental
    await supabase.from("notifications").insert({
      user_id: listing.seller_id,
      title: type === "buy" ? "Account purchased — admin verifying" : "Rental started",
      message: `${listing.title} — ₹${amount.toLocaleString()}. ${
        type === "buy"
          ? "Buyer is awaiting credential release."
          : "Buyer has instant access until rental expires."
      }`,
      link: `/dashboard`,
    });

    setTxnId(data.mock_txn_id);
    setStage("success");
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-4 backdrop-blur-md"
        onClick={stage !== "verifying" ? onClose : undefined}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border/40 bg-card-gradient shadow-elegant"
        >
          {stage !== "verifying" && (
            <button onClick={onClose}
              className="absolute right-4 top-4 z-10 rounded-full border border-border/40 bg-foreground/[0.04] p-2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          <AnimatePresence mode="wait">
            {stage === "qr" && (
              <motion.div key="qr" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-8">
                <p className="font-display text-[10px] uppercase tracking-[0.3em] text-primary/80">Demo Payment</p>
                <h2 className="mt-2 font-display text-2xl font-semibold">Scan to {type === "buy" ? "purchase" : "rent"}</h2>
                <p className="mt-1 text-sm text-muted-foreground truncate">{listing.title}</p>

                <div className="mt-6 rounded-2xl border border-border/40 bg-background p-6">
                  <div className="mx-auto flex aspect-square w-48 items-center justify-center rounded-xl bg-white p-3">
                    {/* Fake QR pattern */}
                    <svg viewBox="0 0 100 100" className="h-full w-full">
                      {Array.from({ length: 100 }).map((_, i) => {
                        const x = i % 10, y = Math.floor(i / 10);
                        const seed = (i * 9301 + 49297) % 233280;
                        const filled = (seed / 233280) > 0.5;
                        return filled && <rect key={i} x={x * 10} y={y * 10} width="10" height="10" fill="#000" />;
                      })}
                      <rect x="0" y="0" width="30" height="30" fill="#fff" /><rect x="5" y="5" width="20" height="20" fill="#000" /><rect x="10" y="10" width="10" height="10" fill="#fff" />
                      <rect x="70" y="0" width="30" height="30" fill="#fff" /><rect x="75" y="5" width="20" height="20" fill="#000" /><rect x="80" y="10" width="10" height="10" fill="#fff" />
                      <rect x="0" y="70" width="30" height="30" fill="#fff" /><rect x="5" y="75" width="20" height="20" fill="#000" /><rect x="10" y="80" width="10" height="10" fill="#fff" />
                    </svg>
                  </div>
                  <p className="mt-5 text-center font-display text-3xl font-semibold">₹{amount.toLocaleString()}</p>
                  <p className="text-center text-[10px] uppercase tracking-[0.25em] text-muted-foreground">vaultskins@upi · DEMO</p>
                </div>

                <button onClick={handleVerify}
                  className="mt-6 w-full rounded-full bg-primary px-4 py-3.5 text-sm font-medium uppercase tracking-[0.2em] text-primary-foreground shadow-glow transition hover:scale-[1.01]">
                  I've Paid · Verify
                </button>
                <p className="mt-3 text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  No real money is moved. This is a portfolio demo.
                </p>
              </motion.div>
            )}

            {stage === "verifying" && (
              <motion.div key="verify" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center p-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <h2 className="mt-6 font-display text-xl font-semibold">Verifying payment…</h2>
                <p className="mt-2 text-sm text-muted-foreground">Securely confirming on the demo gateway.</p>
                <div className="mt-6 h-px w-48 overflow-hidden bg-foreground/10">
                  <motion.div className="h-full bg-primary" initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 2.3, ease: "easeInOut" }} />
                </div>
              </motion.div>
            )}

            {stage === "success" && (
              <motion.div key="success" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="p-8 text-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
                  <CheckCircle2 className="h-9 w-9 text-primary" />
                </motion.div>
                <h2 className="mt-5 font-display text-2xl font-semibold">Payment confirmed</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {type === "buy"
                    ? "Your purchase is queued for credential release. An administrator will verify and release the Riot login to your dashboard within 24 hours."
                    : `Rental is active${rentHours ? ` for ${rentHours}h` : ""}. Credentials are available immediately in your dashboard.`}
                </p>

                <div className="mt-6 rounded-xl border border-border/40 bg-foreground/[0.02] p-4 text-left">
                  <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Transaction ID</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <code className="font-mono text-sm">{txnId}</code>
                    <button onClick={() => { navigator.clipboard.writeText(txnId); toast.success("Copied"); }}
                      className="text-muted-foreground hover:text-foreground"><Copy className="h-4 w-4" /></button>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-[11px]">
                    <div><p className="text-muted-foreground uppercase tracking-[0.2em]">Amount</p><p className="mt-1 font-display font-semibold">₹{amount.toLocaleString()}</p></div>
                    <div>
                      <p className="text-muted-foreground uppercase tracking-[0.2em]">Status</p>
                      <p className="mt-1 inline-flex items-center gap-1 font-display font-semibold text-primary">
                        <ShieldCheck className="h-3 w-3" />
                        {type === "buy" ? "Awaiting release" : "Active"}
                      </p>
                    </div>
                  </div>
                  {type === "buy" && listing.contact_handle && (
                    <div className="mt-4 rounded-lg border border-border/40 bg-foreground/[0.03] p-3">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Seller contact</p>
                      <p className="mt-1 font-display text-sm font-semibold">
                        {listing.contact_method ?? "contact"} · {listing.contact_handle}
                      </p>
                    </div>
                  )}
                </div>

                <a
                  href="/dashboard"
                  className="mt-6 block w-full rounded-full bg-primary px-4 py-3 text-center text-xs uppercase tracking-[0.2em] text-primary-foreground shadow-glow transition hover:scale-[1.01]"
                >
                  Go to dashboard
                </a>
                <button onClick={onClose}
                  className="mt-2 w-full rounded-full border border-border/60 bg-foreground/[0.03] px-4 py-3 text-xs uppercase tracking-[0.2em] text-foreground hover:border-primary/60 hover:text-primary">
                  Close
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

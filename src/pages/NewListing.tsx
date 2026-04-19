import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ShieldCheck, Lock, Sparkles, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SkinSelector, type SelectedSkin } from "@/components/SkinSelector";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { RANKS, REGIONS, estimateInventoryValue, type ListingType } from "@/lib/types";
import { useMemo } from "react";

export default function NewListing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [skins, setSkins] = useState<SelectedSkin[]>([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    listing_type: "sell" as ListingType,
    rent_hourly_price: "",
    rent_daily_price: "",
    buy_price: "",
    rank: "",
    region: "",
    agents_owned: "",
    inventory_override: "", // empty = use auto-calculated value
    cover_image_url: "",
    contact_method: "discord",
    contact_handle: "",
    riot_id: "",
    riot_region: "",
    riot_username: "",
    riot_password: "",
    recovery_email: "",
  });

  const autoInventoryValue = useMemo(() => estimateInventoryValue(skins), [skins]);
  const effectiveInventoryValue = form.inventory_override
    ? Number(form.inventory_override)
    : autoInventoryValue;

  if (!loading && !user) {
    navigate("/auth?redirect=/marketplace/new");
    return null;
  }

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!form.riot_username.trim() || !form.riot_password) {
      toast.error("Riot credentials are required for verified listings.");
      return;
    }
    if (skins.length === 0) {
      toast.error("Add at least one owned skin to your inventory.");
      return;
    }

    setBusy(true);
    try {
      // Auto-cover: first skin's icon if no cover supplied
      const autoCover = skins[0]?.display_icon ?? null;

      const payload = {
        seller_id: user.id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        listing_type: form.listing_type,
        status: "pending" as const,
        rent_hourly_price: form.rent_hourly_price ? Number(form.rent_hourly_price) : null,
        rent_daily_price: form.rent_daily_price ? Number(form.rent_daily_price) : null,
        buy_price: form.buy_price ? Number(form.buy_price) : null,
        rank: form.rank || null,
        region: form.region || null,
        agents_owned: form.agents_owned ? Number(form.agents_owned) : 0,
        skins_count: skins.length,
        inventory_value: effectiveInventoryValue,
        cover_image_url: form.cover_image_url || autoCover,
        contact_method: form.contact_method || null,
        contact_handle: form.contact_handle || null,
        riot_id: form.riot_id || null,
        riot_region: form.riot_region || form.region || null,
        recovery_email: form.recovery_email || null,
      };

      const { data: listing, error } = await supabase
        .from("listings")
        .insert(payload)
        .select("id")
        .single();
      if (error || !listing) {
        toast.error(error?.message ?? "Failed to create listing");
        return;
      }

      // Encrypt + store credentials server-side
      const { error: credErr } = await supabase.rpc("set_listing_credentials", {
        _listing_id: listing.id,
        _riot_username: form.riot_username,
        _riot_password: form.riot_password,
        _riot_id: form.riot_id || null,
        _riot_region: form.riot_region || form.region || null,
        _recovery_email: form.recovery_email || null,
      });
      if (credErr) {
        toast.error(`Credentials: ${credErr.message}`);
        return;
      }

      // Insert skins
      if (skins.length) {
        const rows = skins.map((s) => ({ ...s, listing_id: listing.id }));
        const { error: skinErr } = await supabase.from("listing_skins").insert(rows);
        if (skinErr) console.error(skinErr);
      }

      toast.success("Listing submitted for approval.");
      navigate("/dashboard");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground noise-overlay">
      <SiteHeader />
      <div className="px-6 pb-32 pt-28 md:px-10">
        <div className="mx-auto max-w-3xl">
          <Link
            to="/marketplace"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" /> Marketplace
          </Link>

          <motion.header initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
            <p className="font-display text-[11px] uppercase tracking-[0.4em] text-primary/80">Create Listing</p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">
              List your account
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Submitted listings enter the approval queue. An administrator reviews each account within 24 hours.
              Credentials are encrypted at rest and only released after a verified completed transaction.
            </p>
          </motion.header>

          <form onSubmit={handleSubmit} className="mt-10 space-y-10">
            {/* SECTION 1 — Basics */}
            <Section
              num="01"
              title="Account identity"
              caption="The story buyers see at a glance."
            >
              <Field label="Listing title" required>
                <input
                  required
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="e.g. Immortal smurf · Premium knife collection"
                  className={inputClass}
                />
              </Field>

              <Field label="Description">
                <textarea
                  rows={5}
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Inventory highlights, KDA, mains, custom skins…"
                  className={`${inputClass} resize-y`}
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Listing type" required>
                  <select
                    value={form.listing_type}
                    onChange={(e) => set("listing_type", e.target.value as ListingType)}
                    className={inputClass}
                  >
                    <option value="sell">Sell only</option>
                    <option value="rent">Rent only</option>
                    <option value="both">Both</option>
                  </select>
                </Field>
                <Field label="Region">
                  <select
                    value={form.region}
                    onChange={(e) => set("region", e.target.value)}
                    className={inputClass}
                  >
                    <option value="">—</option>
                    {REGIONS.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Rank">
                  <select
                    value={form.rank}
                    onChange={(e) => set("rank", e.target.value)}
                    className={inputClass}
                  >
                    <option value="">—</option>
                    {RANKS.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Agents owned">
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={form.agents_owned}
                    onChange={(e) => set("agents_owned", e.target.value)}
                    className={inputClass}
                  />
                </Field>
              </div>
            </Section>

            {/* SECTION 2 — Pricing */}
            <Section num="02" title="Pricing" caption="Set fair market value. Negative values are rejected.">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {(form.listing_type === "rent" || form.listing_type === "both") && (
                  <>
                    <Field label="Rent ₹/hour">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={form.rent_hourly_price}
                        onChange={(e) => set("rent_hourly_price", e.target.value)}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Rent ₹/day">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={form.rent_daily_price}
                        onChange={(e) => set("rent_daily_price", e.target.value)}
                        className={inputClass}
                      />
                    </Field>
                  </>
                )}
                {(form.listing_type === "sell" || form.listing_type === "both") && (
                  <Field label="Buy price ₹">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.buy_price}
                      onChange={(e) => set("buy_price", e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                )}
                <div className="md:col-span-1">
                  <label className="font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                    Inventory value ₹ <span className="ml-1 text-primary/70">auto</span>
                  </label>
                  <div className="mt-2 rounded-lg border border-primary/30 bg-primary/[0.04] px-4 py-3">
                    <p className="font-display text-2xl font-semibold text-primary">
                      ₹{effectiveInventoryValue.toLocaleString()}
                    </p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      {skins.length === 0
                        ? "Select skins to calculate"
                        : form.inventory_override
                          ? `Override · auto was ₹${autoInventoryValue.toLocaleString()}`
                          : `Based on ${skins.length} skin${skins.length === 1 ? "" : "s"}`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-border/40 bg-foreground/[0.02] p-4">
                <label className="flex items-center justify-between">
                  <span className="font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                    Manual override (optional)
                  </span>
                  {form.inventory_override && (
                    <button
                      type="button"
                      onClick={() => set("inventory_override", "")}
                      className="text-[10px] uppercase tracking-[0.2em] text-primary hover:underline"
                    >
                      Reset to auto
                    </button>
                  )}
                </label>
                <input
                  type="number"
                  min={0}
                  step="1"
                  value={form.inventory_override}
                  onChange={(e) => set("inventory_override", e.target.value)}
                  placeholder={`Auto ₹${autoInventoryValue.toLocaleString()} — type to override`}
                  className={`${inputClass} mt-2`}
                />
                <p className="mt-2 text-[10px] text-muted-foreground">
                  Override is capped at ±20% of the auto value during admin review.
                </p>
              </div>
            </Section>

            {/* SECTION 3 — Skin inventory */}
            <Section
              num="03"
              title="Skin inventory"
              caption="Search the full Valorant catalogue. Selected skins power your listing's gallery."
              icon={<Sparkles className="h-4 w-4" />}
            >
              <SkinSelector value={skins} onChange={setSkins} />
            </Section>

            {/* SECTION 4 — Cover */}
            <Section
              num="04"
              title="Cover image"
              caption="Optional. If left empty, your first selected skin becomes the cover."
              icon={<ImageIcon className="h-4 w-4" />}
            >
              <Field label="Cover image URL">
                <input
                  type="url"
                  value={form.cover_image_url}
                  onChange={(e) => set("cover_image_url", e.target.value)}
                  placeholder="https://…"
                  className={inputClass}
                />
              </Field>
              {!form.cover_image_url && skins[0]?.display_icon && (
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-border/40 bg-foreground/[0.02] p-3">
                  <img src={skins[0].display_icon} alt="" className="h-12 w-20 rounded-md object-contain" />
                  <p className="text-xs text-muted-foreground">
                    Auto-cover: <span className="text-foreground">{skins[0].skin_name}</span>
                  </p>
                </div>
              )}
            </Section>

            {/* SECTION 5 — Contact */}
            <Section num="05" title="Contact" caption="How buyers reach you for handoff coordination.">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Contact method">
                  <select
                    value={form.contact_method}
                    onChange={(e) => set("contact_method", e.target.value)}
                    className={inputClass}
                  >
                    <option value="discord">Discord</option>
                    <option value="telegram">Telegram</option>
                    <option value="email">Email</option>
                  </select>
                </Field>
                <Field label="Contact handle" required>
                  <input
                    required
                    value={form.contact_handle}
                    onChange={(e) => set("contact_handle", e.target.value)}
                    placeholder="@yourhandle"
                    className={inputClass}
                  />
                </Field>
              </div>
            </Section>

            {/* SECTION 6 — Secure credentials */}
            <Section
              num="06"
              title="Secure Riot account credentials"
              caption="Encrypted at rest. Never visible to buyers. Decrypted only by an administrator after a completed transaction."
              icon={<ShieldCheck className="h-4 w-4 text-primary" />}
              accent
            >
              <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4 text-[11px] leading-relaxed text-muted-foreground">
                <p className="flex items-start gap-2 text-foreground/90">
                  <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>
                    Stored using authenticated symmetric encryption inside our backend. The buyer never sees these.
                    Admin decrypts and securely delivers credentials only after the buyer's payment is confirmed.
                  </span>
                </p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <Field label="Riot ID (in-game tag)">
                  <input
                    value={form.riot_id}
                    onChange={(e) => set("riot_id", e.target.value)}
                    placeholder="VaultPlayer#NA1"
                    className={inputClass}
                  />
                </Field>
                <Field label="Riot account region">
                  <select
                    value={form.riot_region}
                    onChange={(e) => set("riot_region", e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Same as listing region</option>
                    {REGIONS.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Riot username" required>
                  <input
                    required
                    value={form.riot_username}
                    onChange={(e) => set("riot_username", e.target.value)}
                    autoComplete="off"
                    className={inputClass}
                  />
                </Field>
                <Field label="Riot password" required>
                  <input
                    required
                    type="password"
                    value={form.riot_password}
                    onChange={(e) => set("riot_password", e.target.value)}
                    autoComplete="new-password"
                    className={inputClass}
                  />
                </Field>
                <div className="col-span-2">
                  <Field label="Recovery email (optional)">
                    <input
                      type="email"
                      value={form.recovery_email}
                      onChange={(e) => set("recovery_email", e.target.value)}
                      placeholder="recovery@example.com"
                      className={inputClass}
                    />
                  </Field>
                </div>
              </div>
            </Section>

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-primary px-4 py-3.5 text-sm font-medium uppercase tracking-[0.2em] text-primary-foreground shadow-glow transition hover:scale-[1.01] disabled:opacity-50"
            >
              {busy ? "Submitting…" : "Submit for approval"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

const inputClass =
  "w-full rounded-lg border border-border/60 bg-foreground/[0.03] px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/60 focus:outline-none transition";

function Section({
  num,
  title,
  caption,
  icon,
  accent,
  children,
}: {
  num: string;
  title: string;
  caption?: string;
  icon?: React.ReactNode;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl border p-6 md:p-7 ${
        accent ? "border-primary/30 bg-primary/[0.025]" : "border-border/40 bg-foreground/[0.015]"
      }`}
    >
      <header className="mb-5 flex items-start gap-4">
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-display text-[11px] tracking-[0.15em] ${
            accent ? "bg-primary/15 text-primary" : "bg-foreground/[0.05] text-muted-foreground"
          }`}
        >
          {num}
        </span>
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
            {icon}
            {title}
          </h2>
          {caption && <p className="mt-1 text-xs text-muted-foreground">{caption}</p>}
        </div>
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        {label}
        {required && <span className="ml-1 text-primary">*</span>}
      </label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

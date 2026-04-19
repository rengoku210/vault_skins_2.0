import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { getWeapons, type Weapon } from "@/lib/valorant-api";

export default function Skins() {
  const [weapons, setWeapons] = useState<Weapon[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    getWeapons().then(setWeapons).catch((e) => setError(e.message));
  }, []);

  const categories = useMemo(() => {
    if (!weapons) return [] as string[];
    return Array.from(new Set(weapons.map((w) => w.category.replace("EEquippableCategory::", ""))));
  }, [weapons]);

  const filtered = useMemo(() => {
    if (!weapons) return [];
    return weapons
      .filter((w) => filter === "all" || w.category.endsWith(filter))
      .filter((w) => !q.trim() || w.displayName.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [weapons, filter, q]);

  return (
    <main className="min-h-screen bg-background text-foreground noise-overlay">
      <SiteHeader />
      <section className="relative overflow-hidden px-6 pb-12 pt-32 md:px-10">
        <div className="pointer-events-none absolute inset-0 bg-radial-glow opacity-60" />
        <div className="relative mx-auto max-w-7xl">
          <p className="font-display text-[11px] uppercase tracking-[0.4em] text-primary/80">The Vault</p>
          <h1 className="mt-4 font-display text-5xl font-semibold tracking-tight text-balance md:text-7xl">
            Every weapon. <span className="text-gradient-primary">Every skin.</span>
          </h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Pick a weapon to see all of its skins, chromas and levels — with full image and video previews.
          </p>

          <div className="mt-10 flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search weapons…"
                className="w-full rounded-full border border-border/60 bg-foreground/[0.03] py-2.5 pl-11 pr-4 text-sm focus:border-primary/60 focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Pill label="All" active={filter === "all"} onClick={() => setFilter("all")} />
              {categories.map((c) => (
                <Pill key={c} label={c} active={filter === c} onClick={() => setFilter(c)} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-32 md:px-10">
        <div className="mx-auto max-w-7xl">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {!weapons && !error && (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[4/3] animate-pulse rounded-2xl bg-foreground/[0.04]" />
              ))}
            </div>
          )}
          {weapons && (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {filtered.map((weapon, idx) => (
                <motion.div
                  key={weapon.uuid}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: Math.min(idx * 0.02, 0.3) }}
                >
                  <Link
                    to={`/skins/${weapon.uuid}`}
                    className="group block rounded-2xl border border-border/40 bg-card/40 p-5 backdrop-blur transition hover:border-primary/50 hover:shadow-glow"
                  >
                    <div className="flex aspect-[4/3] items-center justify-center overflow-hidden">
                      <img
                        src={weapon.displayIcon}
                        alt={weapon.displayName}
                        loading="lazy"
                        className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>
                    <p className="mt-2 font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                      {weapon.category.replace("EEquippableCategory::", "")}
                    </p>
                    <h3 className="font-display text-base font-semibold">{weapon.displayName}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{weapon.skins.length} skins</p>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={
        "rounded-full border px-4 py-1.5 text-[11px] uppercase tracking-[0.25em] transition " +
        (active
          ? "border-primary bg-primary/15 text-primary"
          : "border-border/60 bg-foreground/[0.03] text-muted-foreground hover:text-foreground")
      }
    >
      {label}
    </button>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SkinCard } from "@/components/SkinCard";
import { SkinPreviewModal } from "@/components/SkinPreviewModal";
import { getWeapon, getContentTiers, type Weapon, type ContentTier, type Skin } from "@/lib/valorant-api";

export default function WeaponSkins() {
  const { weaponId = "" } = useParams();
  const [weapon, setWeapon] = useState<Weapon | null>(null);
  const [tiers, setTiers] = useState<Record<string, ContentTier>>({});
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Skin | null>(null);

  useEffect(() => {
    Promise.all([getWeapon(weaponId), getContentTiers()])
      .then(([w, t]) => {
        setWeapon(w);
        setTiers(Object.fromEntries(t.map((tier) => [tier.uuid, tier])));
      })
      .catch((e) => setError(e.message));
  }, [weaponId]);

  const skins = useMemo(
    () => (weapon ? weapon.skins.filter((s) => s.displayIcon || s.chromas[0]?.fullRender) : []),
    [weapon],
  );

  return (
    <main className="min-h-screen bg-background text-foreground noise-overlay">
      <SiteHeader />
      <div className="px-6 pb-32 pt-28 md:px-10">
        <div className="mx-auto max-w-7xl">
          <Link
            to="/skins"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" /> Vault
          </Link>

          {error && <p className="mt-12 text-sm text-destructive">{error}</p>}

          {weapon && (
            <motion.header initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
              <p className="font-display text-[11px] uppercase tracking-[0.4em] text-muted-foreground">
                {weapon.category.replace("EEquippableCategory::", "")}
              </p>
              <h1 className="mt-2 font-display text-5xl font-semibold tracking-tight text-balance md:text-6xl">
                {weapon.displayName}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">{skins.length} skins</p>
              <div className="mt-6 flex aspect-[16/5] items-center justify-center overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-r from-foreground/[0.04] via-transparent to-primary/5">
                <img src={weapon.displayIcon} alt="" className="max-h-full max-w-2xl object-contain p-6" />
              </div>
            </motion.header>
          )}

          {!weapon && !error && (
            <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-72 animate-pulse rounded-2xl bg-foreground/[0.04]" />
              ))}
            </div>
          )}

          {weapon && (
            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {skins.map((skin) => {
                const tier = skin.contentTierUuid ? tiers[skin.contentTierUuid] : undefined;
                return (
                  <SkinCard
                    key={skin.uuid}
                    skin={skin}
                    weaponName={weapon.displayName}
                    onSelect={() => setSelected(skin)}
                    highlightColor={tier?.highlightColor}
                  />
                );
              })}
            </div>
          )}

          {selected && (
            <SkinPreviewModal
              skin={selected}
              weaponName={weapon?.displayName}
              onClose={() => setSelected(null)}
            />
          )}
        </div>
      </div>
    </main>
  );
}

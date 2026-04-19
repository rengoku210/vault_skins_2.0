import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Check, Loader2, Image as ImageIcon } from "lucide-react";
import { getWeapons, getContentTiers, type Weapon, type Skin, type ContentTier } from "@/lib/valorant-api";
import type { ListingSkin } from "@/lib/types";

export type SelectedSkin = Omit<ListingSkin, "id" | "listing_id" | "created_at">;

interface Props {
  value: SelectedSkin[];
  onChange: (next: SelectedSkin[]) => void;
}

export function SkinSelector({ value, onChange }: Props) {
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [tiers, setTiers] = useState<Record<string, ContentTier>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeWeapon, setActiveWeapon] = useState<string>("all");

  useEffect(() => {
    let alive = true;
    Promise.all([getWeapons(), getContentTiers()])
      .then(([w, t]) => {
        if (!alive) return;
        setWeapons(w.filter((x) => x.skins.length > 1));
        setTiers(Object.fromEntries(t.map((x) => [x.uuid, x])));
      })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const selectedSet = useMemo(() => new Set(value.map((s) => s.skin_uuid)), [value]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list: { weapon: Weapon; skin: Skin }[] = [];
    for (const w of weapons) {
      if (activeWeapon !== "all" && w.uuid !== activeWeapon) continue;
      for (const s of w.skins) {
        if (s.displayName.toLowerCase().includes("standard")) continue;
        if (s.displayName.toLowerCase().includes("random favorite")) continue;
        if (q && !s.displayName.toLowerCase().includes(q) && !w.displayName.toLowerCase().includes(q)) continue;
        list.push({ weapon: w, skin: s });
      }
    }
    return list.slice(0, 60);
  }, [weapons, query, activeWeapon]);

  const toggle = (weapon: Weapon, skin: Skin) => {
    if (selectedSet.has(skin.uuid)) {
      onChange(value.filter((s) => s.skin_uuid !== skin.uuid));
      return;
    }
    const video = skin.chromas[0]?.streamedVideo ?? skin.levels.find((l) => l.streamedVideo)?.streamedVideo ?? null;
    const icon = skin.displayIcon ?? skin.chromas[0]?.fullRender ?? skin.chromas[0]?.displayIcon ?? null;
    onChange([
      ...value,
      {
        skin_uuid: skin.uuid,
        skin_name: skin.displayName,
        weapon_uuid: weapon.uuid,
        weapon_name: weapon.displayName,
        display_icon: icon,
        preview_video: video,
        content_tier_uuid: skin.contentTierUuid,
      },
    ]);
  };

  const remove = (uuid: string) => onChange(value.filter((s) => s.skin_uuid !== uuid));

  return (
    <div className="rounded-2xl border border-border/40 bg-foreground/[0.02] p-5">
      {/* Selected chips */}
      {value.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          <AnimatePresence>
            {value.map((s) => {
              const tier = s.content_tier_uuid ? tiers[s.content_tier_uuid] : null;
              return (
                <motion.div
                  key={s.skin_uuid}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="group flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 py-1 pl-1 pr-3 text-xs"
                  style={tier ? { boxShadow: `0 0 0 1px #${tier.highlightColor.slice(0, 6)}33` } : undefined}
                >
                  {s.display_icon ? (
                    <img src={s.display_icon} alt="" className="h-6 w-10 shrink-0 rounded-full object-contain" />
                  ) : (
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="font-display font-medium text-foreground">{s.skin_name}</span>
                  <button
                    type="button"
                    onClick={() => remove(s.skin_uuid)}
                    className="ml-1 rounded-full p-0.5 text-muted-foreground opacity-60 transition hover:bg-foreground/10 hover:text-foreground hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search skins or weapons (Reaver, Phantom, Operator…)"
          className="w-full rounded-lg border border-border/60 bg-background/40 py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/60 focus:outline-none"
        />
      </div>

      {/* Weapon filter chips */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        <FilterChip active={activeWeapon === "all"} onClick={() => setActiveWeapon("all")}>All</FilterChip>
        {weapons.map((w) => (
          <FilterChip key={w.uuid} active={activeWeapon === w.uuid} onClick={() => setActiveWeapon(w.uuid)}>
            {w.displayName}
          </FilterChip>
        ))}
      </div>

      {/* Results grid */}
      <div className="mt-5 max-h-[420px] overflow-y-auto pr-1">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : results.length === 0 ? (
          <p className="py-12 text-center text-xs text-muted-foreground">No skins match.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {results.map(({ weapon, skin }) => {
              const selected = selectedSet.has(skin.uuid);
              const icon = skin.displayIcon ?? skin.chromas[0]?.fullRender;
              const tier = skin.contentTierUuid ? tiers[skin.contentTierUuid] : null;
              return (
                <button
                  type="button"
                  key={skin.uuid}
                  onClick={() => toggle(weapon, skin)}
                  className={`group relative overflow-hidden rounded-xl border p-2.5 text-left transition ${
                    selected
                      ? "border-primary/70 bg-primary/10"
                      : "border-border/40 bg-background/30 hover:border-primary/40 hover:bg-foreground/[0.04]"
                  }`}
                  style={tier ? { boxShadow: `inset 0 0 0 1px #${tier.highlightColor.slice(0, 6)}22` } : undefined}
                >
                  <div className="aspect-[16/9] overflow-hidden rounded-md bg-foreground/[0.04]">
                    {icon ? (
                      <img src={icon} alt={skin.displayName} loading="lazy" className="h-full w-full object-contain p-2" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <p className="mt-2 truncate font-display text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    {weapon.displayName}
                  </p>
                  <p className="mt-0.5 truncate font-display text-xs font-semibold text-foreground">{skin.displayName}</p>
                  {selected && (
                    <div className="absolute right-2 top-2 rounded-full bg-primary p-1 text-primary-foreground shadow-glow">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <p className="mt-4 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {value.length} skin{value.length === 1 ? "" : "s"} selected
      </p>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] transition ${
        active
          ? "border-primary/70 bg-primary/15 text-primary"
          : "border-border/50 text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

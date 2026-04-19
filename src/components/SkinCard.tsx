import { motion } from "framer-motion";
import { Eye } from "lucide-react";
import type { Skin } from "@/lib/valorant-api";

interface Props {
  skin: Skin;
  weaponName?: string;
  onSelect?: () => void;
  highlightColor?: string;
}

export function SkinCard({ skin, weaponName, onSelect, highlightColor }: Props) {
  const icon = skin.displayIcon ?? skin.chromas[0]?.fullRender ?? skin.chromas[0]?.displayIcon;
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 220, damping: 20 }}
      className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card/50 p-5 backdrop-blur-sm"
      style={highlightColor ? { boxShadow: `inset 0 0 0 1px #${highlightColor.slice(0, 6)}33` } : undefined}
    >
      <button onClick={onSelect} className="block w-full text-left">
        <div className="aspect-[16/9] overflow-hidden rounded-lg bg-gradient-to-br from-foreground/[0.03] to-transparent">
          {icon ? (
            <img
              src={icon}
              alt={skin.displayName}
              loading="lazy"
              className="h-full w-full object-contain p-4 transition-transform duration-700 group-hover:scale-110"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No preview</div>
          )}
        </div>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            {weaponName && (
              <p className="font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{weaponName}</p>
            )}
            <h3 className="mt-1 truncate font-display text-base font-semibold leading-tight text-foreground">
              {skin.displayName}
            </h3>
            {skin.chromas.length > 1 && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                {skin.chromas.length} variants · {skin.levels.length} levels
              </p>
            )}
          </div>
          <div className="rounded-full border border-border/60 bg-background/60 p-2 opacity-0 transition group-hover:opacity-100">
            <Eye className="h-3.5 w-3.5" />
          </div>
        </div>
      </button>
    </motion.div>
  );
}

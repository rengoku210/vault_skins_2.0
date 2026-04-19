import { useState } from "react";
import { motion } from "framer-motion";
import { X, Play } from "lucide-react";
import type { Skin } from "@/lib/valorant-api";

interface Props {
  skin: Skin;
  weaponName?: string;
  onClose: () => void;
}

export function SkinPreviewModal({ skin, weaponName, onClose }: Props) {
  const [chromaIdx, setChromaIdx] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const chroma = skin.chromas[chromaIdx] ?? skin.chromas[0];
  const video = chroma?.streamedVideo ?? skin.levels.find((l) => l.streamedVideo)?.streamedVideo ?? null;
  const img = chroma?.fullRender ?? chroma?.displayIcon ?? skin.displayIcon ?? skin.wallpaper ?? null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 px-4 py-8 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-border/50 bg-card/95 backdrop-blur-xl shadow-glow-lg"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full border border-border/60 bg-background/70 p-2 text-muted-foreground transition hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="grid gap-6 p-6 md:grid-cols-[1.5fr_1fr] md:p-10">
          {/* Media */}
          <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-foreground/[0.06] via-background to-primary/5">
            {showVideo && video ? (
              <video
                src={video}
                autoPlay
                loop
                muted
                playsInline
                className="h-full w-full object-contain"
              />
            ) : img ? (
              <img src={img} alt={skin.displayName} className="max-h-full max-w-full object-contain p-6" />
            ) : (
              <span className="text-sm text-muted-foreground">No preview available</span>
            )}
            {video && !showVideo && (
              <button
                onClick={() => setShowVideo(true)}
                className="absolute inset-0 flex items-center justify-center bg-background/0 transition hover:bg-background/30"
              >
                <span className="flex items-center gap-2 rounded-full bg-primary/90 px-5 py-2.5 text-xs uppercase tracking-[0.25em] text-primary-foreground shadow-glow">
                  <Play className="h-3.5 w-3.5 fill-current" /> Play preview
                </span>
              </button>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col">
            {weaponName && (
              <p className="font-display text-[10px] uppercase tracking-[0.3em] text-primary/80">{weaponName}</p>
            )}
            <h2 className="mt-1 font-display text-3xl font-semibold tracking-tight text-balance">
              {skin.displayName}
            </h2>

            {skin.chromas.length > 1 && (
              <div className="mt-6">
                <p className="font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  Variants
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {skin.chromas.map((c, i) => (
                    <button
                      key={c.uuid}
                      onClick={() => {
                        setChromaIdx(i);
                        setShowVideo(false);
                      }}
                      className={
                        "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition " +
                        (i === chromaIdx
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border/60 text-muted-foreground hover:text-foreground")
                      }
                    >
                      {c.swatch && <img src={c.swatch} alt="" className="h-4 w-4 rounded-full object-cover" />}
                      Variant {i + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {skin.levels.length > 1 && (
              <div className="mt-6">
                <p className="font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  Upgrade levels
                </p>
                <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                  {skin.levels.map((lvl, i) => (
                    <li key={lvl.uuid} className="flex items-baseline gap-3">
                      <span className="font-display text-[10px] uppercase tracking-[0.25em] text-foreground/60">
                        Lv {i + 1}
                      </span>
                      <span>{lvl.displayName.replace(skin.displayName, "").trim() || "Base"}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { SiteHeader } from "@/components/SiteHeader";
import { getAgents, type Agent } from "@/lib/valorant-api";

export default function Agents() {
  const [agents, setAgents] = useState<Agent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<string>("all");

  useEffect(() => {
    getAgents().then(setAgents).catch((e) => setError(e.message));
  }, []);

  const roles = agents ? Array.from(new Set(agents.map((a) => a.role?.displayName).filter(Boolean))) as string[] : [];
  const filtered = agents?.filter((a) => role === "all" || a.role?.displayName === role) ?? [];

  return (
    <main className="min-h-screen bg-background text-foreground noise-overlay">
      <SiteHeader />
      <section className="relative overflow-hidden px-6 pb-12 pt-32 md:px-10">
        <div className="pointer-events-none absolute inset-0 bg-radial-glow opacity-60" />
        <div className="relative mx-auto max-w-7xl">
          <p className="font-display text-[11px] uppercase tracking-[0.4em] text-primary/80">Roster</p>
          <h1 className="mt-4 font-display text-5xl font-semibold tracking-tight text-balance md:text-7xl">
            Every agent. <span className="text-gradient-primary">One vault.</span>
          </h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Premium showcase of every playable Valorant agent — abilities, roles, and full strategy guides.
          </p>
          {roles.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2">
              <Pill label="All" active={role === "all"} onClick={() => setRole("all")} />
              {roles.map((r) => (
                <Pill key={r} label={r} active={role === r} onClick={() => setRole(r)} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="px-6 pb-32 md:px-10">
        <div className="mx-auto max-w-7xl">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {!agents && !error && (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-foreground/[0.04]" />
              ))}
            </div>
          )}
          {agents && (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {filtered.map((agent, idx) => (
                <motion.div
                  key={agent.uuid}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: Math.min(idx * 0.03, 0.4) }}
                >
                  <Link
                    to={`/agents/${agent.uuid}`}
                    className="group relative block aspect-[3/4] overflow-hidden rounded-2xl border border-border/40 bg-card/40"
                    style={{
                      backgroundImage: agent.backgroundGradientColors?.length
                        ? `linear-gradient(180deg, #${agent.backgroundGradientColors[0].slice(0, 6)}33, #${agent.backgroundGradientColors[2]?.slice(0, 6) ?? "000000"}cc)`
                        : undefined,
                    }}
                  >
                    {agent.fullPortrait && (
                      <img
                        src={agent.fullPortrait}
                        alt={agent.displayName}
                        loading="lazy"
                        className="absolute inset-x-0 bottom-0 h-[110%] w-full object-contain object-bottom transition-transform duration-700 group-hover:scale-105"
                      />
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background to-transparent p-4 pt-16">
                      <div className="flex items-center gap-2">
                        {agent.role?.displayIcon && (
                          <img src={agent.role.displayIcon} alt="" className="h-3 w-3 invert" />
                        )}
                        <span className="font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                          {agent.role?.displayName ?? "Agent"}
                        </span>
                      </div>
                      <h3 className="mt-1 font-display text-xl font-semibold text-foreground">
                        {agent.displayName}
                      </h3>
                    </div>
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

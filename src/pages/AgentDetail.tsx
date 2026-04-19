import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Target, Lightbulb, MapPin, Swords, Users, AlertTriangle } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { getAgent, ROLE_GUIDES, type Agent } from "@/lib/valorant-api";

export default function AgentDetail() {
  const { agentId = "" } = useParams();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAgent(agentId).then(setAgent).catch((e) => setError(e.message));
  }, [agentId]);

  const guide = agent?.role?.displayName ? ROLE_GUIDES[agent.role.displayName] : undefined;

  return (
    <main className="min-h-screen bg-background text-foreground noise-overlay">
      <SiteHeader />
      <div className="px-6 pb-32 pt-28 md:px-10">
        <div className="mx-auto max-w-6xl">
          <Link
            to="/agents"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" /> All agents
          </Link>

          {error && <p className="mt-12 text-sm text-destructive">{error}</p>}
          {!agent && !error && <div className="mt-12 h-96 animate-pulse rounded-3xl bg-foreground/[0.04]" />}

          {agent && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mt-8 grid gap-10 lg:grid-cols-[1.1fr_1fr]"
            >
              <div
                className="relative overflow-hidden rounded-3xl border border-border/40"
                style={{
                  backgroundImage: agent.backgroundGradientColors?.length
                    ? `linear-gradient(160deg, #${agent.backgroundGradientColors[0].slice(0, 6)}, #${agent.backgroundGradientColors[2]?.slice(0, 6) ?? "000000"})`
                    : undefined,
                }}
              >
                {agent.background && (
                  <img src={agent.background} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
                )}
                {agent.fullPortrait && (
                  <img
                    src={agent.fullPortrait}
                    alt={agent.displayName}
                    className="relative h-[600px] w-full object-contain"
                  />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  {agent.role?.displayIcon && (
                    <img src={agent.role.displayIcon} alt="" className="h-4 w-4 invert" />
                  )}
                  <span className="font-display text-[10px] uppercase tracking-[0.3em] text-primary/80">
                    {agent.role?.displayName ?? "Agent"}
                  </span>
                </div>
                <h1 className="mt-2 font-display text-5xl font-semibold tracking-tight text-balance md:text-6xl">
                  {agent.displayName}
                </h1>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{agent.description}</p>

                <h2 className="mt-10 font-display text-xs uppercase tracking-[0.3em] text-primary/80">
                  Abilities
                </h2>
                <ul className="mt-4 space-y-4">
                  {agent.abilities
                    .filter((a) => a.displayName)
                    .map((ability) => (
                      <li key={ability.slot} className="flex gap-4 rounded-xl border border-border/40 bg-card/40 p-4">
                        {ability.displayIcon ? (
                          <img src={ability.displayIcon} alt="" className="h-10 w-10 shrink-0 invert" />
                        ) : (
                          <div className="h-10 w-10 shrink-0 rounded bg-foreground/[0.06]" />
                        )}
                        <div>
                          <p className="font-display text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                            {ability.slot}
                          </p>
                          <h3 className="mt-1 font-display text-base font-semibold text-foreground">
                            {ability.displayName}
                          </h3>
                          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{ability.description}</p>
                        </div>
                      </li>
                    ))}
                </ul>
              </div>
            </motion.div>
          )}

          {/* Strategy Guide */}
          {agent && guide && (
            <motion.section
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-20"
            >
              <p className="font-display text-[11px] uppercase tracking-[0.4em] text-primary/80">Strategy</p>
              <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">
                How to play <span className="text-gradient-primary">{agent.displayName}</span>
              </h2>

              <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-6">
                <p className="font-display text-[10px] uppercase tracking-[0.3em] text-primary/80">Core playstyle</p>
                <p className="mt-2 text-base text-foreground">{guide.playstyle}</p>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <GuideCard icon={Target} title="Beginner tips" items={guide.beginner} />
                <GuideCard icon={Lightbulb} title="Advanced tips" items={guide.advanced} />
                <GuideCard icon={MapPin} title="Best maps" items={guide.bestMaps} />
                <GuideCard icon={Swords} title="Counters & weaknesses" items={guide.counters} />
                <GuideCard icon={Users} title="Team synergy" items={guide.synergy} />
                <GuideCard icon={AlertTriangle} title="Common mistakes" items={guide.mistakes} />
              </div>
            </motion.section>
          )}
        </div>
      </div>
    </main>
  );
}

function GuideCard({
  icon: Icon,
  title,
  items,
}: {
  icon: typeof Target;
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-2xl border border-border/40 bg-card/40 p-6 backdrop-blur transition hover:border-primary/40">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <p className="font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{title}</p>
      </div>
      <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

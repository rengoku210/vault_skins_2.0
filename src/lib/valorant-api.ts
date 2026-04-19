// Thin client over https://valorant-api.com (community-maintained, no auth)
const BASE = "https://valorant-api.com/v1";

export interface Agent {
  uuid: string;
  displayName: string;
  description: string;
  developerName: string;
  displayIcon: string;
  fullPortrait: string | null;
  background: string | null;
  backgroundGradientColors: string[];
  role: { displayName: string; displayIcon: string; description?: string } | null;
  isPlayableCharacter: boolean;
  abilities: { displayName: string; description: string; displayIcon: string | null; slot: string }[];
}

export interface SkinChroma {
  uuid: string;
  displayName: string;
  displayIcon: string | null;
  fullRender: string | null;
  swatch: string | null;
  streamedVideo: string | null;
}

export interface SkinLevel {
  uuid: string;
  displayName: string;
  displayIcon: string | null;
  streamedVideo: string | null;
  levelItem: string | null;
}

export interface Skin {
  uuid: string;
  displayName: string;
  displayIcon: string | null;
  wallpaper: string | null;
  contentTierUuid: string | null;
  themeUuid: string | null;
  chromas: SkinChroma[];
  levels: SkinLevel[];
}

export interface Weapon {
  uuid: string;
  displayName: string;
  category: string;
  displayIcon: string;
  killStreamIcon: string | null;
  skins: Skin[];
}

export interface ContentTier {
  uuid: string;
  displayName: string;
  rank: number;
  highlightColor: string;
  displayIcon: string;
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`Valorant API error: ${res.status}`);
  const json = (await res.json()) as { status: number; data: T };
  return json.data;
}

export const getAgents = () =>
  fetchJson<Agent[]>("/agents?isPlayableCharacter=true").then((all) =>
    all.filter((a) => a.isPlayableCharacter),
  );

export const getAgent = (uuid: string) => fetchJson<Agent>(`/agents/${uuid}`);
export const getWeapons = () => fetchJson<Weapon[]>("/weapons");
export const getWeapon = (uuid: string) => fetchJson<Weapon>(`/weapons/${uuid}`);
export const getContentTiers = () => fetchJson<ContentTier[]>("/contenttiers");

// Premium strategy guide content per role (curated, role-based)
export const ROLE_GUIDES: Record<
  string,
  {
    playstyle: string;
    beginner: string[];
    advanced: string[];
    bestMaps: string[];
    counters: string[];
    synergy: string[];
    mistakes: string[];
  }
> = {
  Duelist: {
    playstyle: "Aggressive entry-fragger. Open sites, secure first-bloods, force enemy utility.",
    beginner: [
      "Always have backup before entering a site.",
      "Use abilities to clear corners, not just to chase kills.",
      "Trade fights — don't rush 1v5.",
    ],
    advanced: [
      "Bait enemy ults with aggressive timing pushes.",
      "Combine flashes with teammate movement for crossfires.",
      "Use map-specific lineups to deny defender setups.",
    ],
    bestMaps: ["Ascent", "Bind", "Haven", "Split"],
    counters: ["Sentinels with strong setups (Killjoy, Cypher)", "Smokes that block entry (Brimstone)"],
    synergy: ["Initiators that flash for entry", "Smokers that block crossfires"],
    mistakes: ["Peeking without info", "Wasting ult on eco rounds", "Not communicating entry timing"],
  },
  Sentinel: {
    playstyle: "Anchor and lockdown specialist. Hold sites, gather info, deny flanks.",
    beginner: [
      "Place utility before the round starts, not mid-fight.",
      "Cover the flank — your team trusts you to call rotations.",
      "Don't push without info; play for retake.",
    ],
    advanced: [
      "Stagger trip placements to break enemy timing.",
      "Use one-way smokes/walls on defense for free picks.",
      "Save ults for retakes, not pushes.",
    ],
    bestMaps: ["Haven", "Bind", "Icebox", "Sunset"],
    counters: ["Initiators with reveal (Sova, Fade)", "Aggressive duelists (Jett, Raze)"],
    synergy: ["Controllers for crossfires", "Initiators to clear before retakes"],
    mistakes: ["Predictable trip placements", "Pushing as a sentinel", "Not calling rotations"],
  },
  Initiator: {
    playstyle: "Info-gatherer and setup-breaker. Reveal enemies, flash for entries, soften defenses.",
    beginner: [
      "Use recon abilities BEFORE the team commits.",
      "Flash AT angles, not into walls.",
      "Communicate every piece of info you collect.",
    ],
    advanced: [
      "Pre-aim flashed angles to convert info into kills.",
      "Use pop-flashes for fast executes.",
      "Layer recon with smokes for safe info gathering.",
    ],
    bestMaps: ["Ascent", "Sunset", "Lotus", "Pearl"],
    counters: ["Sentinels with traps", "Smokers blocking recon"],
    synergy: ["Duelists that follow flashes", "Controllers for safe entries"],
    mistakes: ["Solo-flashing without team commit", "Wasting recon early in round", "Not calling flashes"],
  },
  Controller: {
    playstyle: "Map architect. Smoke key sightlines, control space, enable executes.",
    beginner: [
      "Learn 3 default smoke setups per map per side.",
      "Smoke for your team's path, not your own.",
      "Save 1 smoke for retakes.",
    ],
    advanced: [
      "Use one-way smokes for free picks.",
      "Time smokes with team utility (flash + smoke combo).",
      "Mid-round re-smoke to deny info trades.",
    ],
    bestMaps: ["Bind", "Split", "Lotus", "Breeze"],
    counters: ["Initiators that reveal through smoke (Sova)", "Operators holding alt sightlines"],
    synergy: ["Duelists for entry", "Sentinels to lock the smoked site"],
    mistakes: ["Smoking too early", "Forgetting your own crosshair placement", "Wasting ult on first round"],
  },
};

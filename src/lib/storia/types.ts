export interface People {
  id: string;
  name: string;
  race: string;
  trait: string;
  habitat: string;
  magic: string;
  habit: string;
  origin_belief: string;
  internal_conflict: string;
  relations: string;
  unanswered: string;
}

export interface Kingdom {
  id: string;
  name: string;
  power: string;
  resource: string;
  relations: string;
  secret: string;
}

export interface HistEvent {
  id: string;
  what: string;
  who: string;
  affects: string;
  official_vs_real: string;
  unresolved: string;
}

export interface Threat {
  id: string;
  what: string;
  who_knows: string;
  if_ignored: string;
  who_wants: string;
  magic_link: string;
}

export interface Creature {
  id: string;
  name: string;
  type: "Ameaça" | "Recurso" | "Símbolo" | "Guardião" | "Lendária";
  habitat: string;
  behavior: string;
  people_relation: string;
  magic_relation: string;
  economic: string;
  narrative: string;
  legend: string;
}

export interface Verb {
  verb: string;
  represents: string;
  mechanic: string;
}

export interface Attribute {
  id: string;
  name: string;
  represents: string;
  verb: string;
}

export interface RpgResource {
  id: string;
  name: string;
  represents: string;
  lethality: "Alto" | "Médio" | "Baixo";
}

export interface WorldSheet {
  // identity
  world_name: string;
  premise: string;
  story_type: string;
  tone: string;
  epoch: string;
  central_conflict: string;
  method: "Top-down" | "Bottom-up" | "Híbrido" | "";

  // mythology
  mythology: {
    creation: string;
    before: string;
    forces: string;
    beliefs: string;
    sacred: string;
    destiny: string;
    afterlife: string;
    echo_event: string;
  };

  // geography
  geography: {
    shape: string;
    regions: string;
    obstacle: string;
    resources: string;
    inaccessible: string;
    movement: string;
    phenomena: string;
  };

  // magic
  magic: {
    system_type: string;
    magic_tech: string;
    who: string;
    cost: string;
    forbidden: string;
    abundance: string;
    mythology_link: string;
    distinctive: string;
  };

  peoples: People[];
  kingdoms: Kingdom[];
  events: HistEvent[];
  threats: Threat[];
  bestiary: Creature[];

  checkpoint: {
    items: Record<string, boolean>;
    contradictions: string;
    gaps: string;
  };

  rpg_system: {
    branch: string;
    audience: string;
    central_tension: string;
    character_type: string;
    tone_mechanic: string;
    chance_role: string;
    dice_system: string;
    resolution: string;
    playtest_notes: string;
    verbs: Verb[];
    risks: string[];
    risks_other: string;
    attributes: Attribute[];
    resources: RpgResource[];
  };
}

export const emptySheet = (): WorldSheet => ({
  world_name: "",
  premise: "",
  story_type: "",
  tone: "",
  epoch: "",
  central_conflict: "",
  method: "",
  mythology: {
    creation: "", before: "", forces: "", beliefs: "",
    sacred: "", destiny: "", afterlife: "", echo_event: "",
  },
  geography: {
    shape: "", regions: "", obstacle: "", resources: "",
    inaccessible: "", movement: "", phenomena: "",
  },
  magic: {
    system_type: "", magic_tech: "", who: "", cost: "",
    forbidden: "", abundance: "", mythology_link: "", distinctive: "",
  },
  peoples: [],
  kingdoms: [],
  events: [],
  threats: [],
  bestiary: [],
  checkpoint: { items: {}, contradictions: "", gaps: "" },
  rpg_system: {
    branch: "", audience: "", central_tension: "", character_type: "",
    tone_mechanic: "", chance_role: "", dice_system: "", resolution: "",
    playtest_notes: "",
    verbs: Array.from({ length: 5 }, () => ({ verb: "", represents: "", mechanic: "" })),
    risks: [],
    risks_other: "",
    attributes: [],
    resources: [],
  },
});

export interface DicelessResource {
  id: string;
  name: string;
  current: number;
  max: number;
}

export interface SpinnerList {
  id: string;
  name: string;
  options: string[];
}

export interface LogEntry {
  id: string;
  ts: number;
  text: string;
}

export const STORAGE_KEYS = {
  worldSheet: "storiaverso:world_sheet",
  resources: "storiaverso:resources",
  spinnerLists: "storiaverso:spinner_lists",
  diceLog: "storiaverso:dice_log",
  spinnerLog: "storiaverso:spinner_log",
  apiKey: "storiaverso:anthropic_key",
  lastSaved: "storiaverso:last_saved",
} as const;

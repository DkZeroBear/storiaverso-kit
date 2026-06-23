import { useMemo, useState } from "react";
import { Plus, Trash2, Download, Upload, Sparkles, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uid } from "@/lib/storia/storage";
import type { WorldSheet, People, Kingdom, HistEvent, Threat, Creature, RpgResource } from "@/lib/storia/types";

type Setter = (next: WorldSheet) => void;

interface Props {
  sheet: WorldSheet;
  setSheet: React.Dispatch<React.SetStateAction<WorldSheet>>;
}

const Field = ({
  label, value, onChange, placeholder, textarea, type = "text",
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; textarea?: boolean; type?: string }) => (
  <label className="block space-y-1.5">
    <span className="text-xs uppercase tracking-wider text-[color:var(--muted-foreground)]">{label}</span>
    {textarea ? (
      <textarea
        className="field-input min-h-[72px] resize-y"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    ) : (
      <input
        type={type}
        className="field-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    )}
  </label>
);

const Select = ({
  label, value, onChange, options,
}: { label: string; value: string; onChange: (v: string) => void; options: string[] }) => (
  <label className="block space-y-1.5">
    <span className="text-xs uppercase tracking-wider text-[color:var(--muted-foreground)]">{label}</span>
    <select className="field-input" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">—</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  </label>
);

function Accordion({ title, children, onRemove }: { title: string; children: React.ReactNode; onRemove?: () => void }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="grimoire-card overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-[color:var(--muted)]">
        <button onClick={() => setOpen(!open)} className="flex items-center gap-2 text-sm font-serif text-[color:var(--amber-accent)]">
          <ChevronDown className={`transition-transform ${open ? "" : "-rotate-90"}`} size={14} />
          {title || "(sem nome)"}
        </button>
        {onRemove && (
          <button onClick={onRemove} className="text-[color:var(--muted-foreground)] hover:text-[color:var(--destructive)]">
            <Trash2 size={14} />
          </button>
        )}
      </div>
      {open && <div className="p-4 space-y-3">{children}</div>}
    </div>
  );
}

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="section-title">{children}</h3>
);

const CHECKPOINT_ITEMS: Record<string, string[]> = {
  Mitologia: ["Origem definida", "Forças identificadas", "Crença central", "Sagrado e proibido", "Cosmologia descrita", "Conecta com outro pilar"],
  Geografia: ["Forma definida", "Regiões mapeadas", "Obstáculo físico", "Recursos disputados", "Lugar inacessível", "Esboço de mapa existe"],
  Magia: ["Sistema definido", "Quem usa", "Custo definido", "Proibido definido", "Relação magia-tecnologia", "Conecta com mitologia e geografia"],
  Raças: ["Ao menos 1 povo criado", "Relações entre povos mapeadas", "Cada povo conecta com outro pilar", "Conflito interno", "Mistério por povo"],
  Reinos: ["Ao menos 1 reino", "1 evento histórico", "1 ameaça ativa", "Relações entre reinos mapeadas"],
  Bestiário: ["Ao menos 1 criatura", "Papel narrativo definido", "Conecta com outro pilar", "Impacto econômico", "Lenda com distinção verdade/mito"],
};

const RISKS = ["Vida física", "Sanidade", "Reputação", "Recursos materiais", "Vínculos", "Poder mágico", "Liberdade", "Identidade", "Fé"];

function formatSheet(s: WorldSheet): string {
  const lines: string[] = [];
  const push = (k: string, v: string) => v && lines.push(`${k}: ${v}`);
  lines.push(`# ${s.world_name || "(sem nome)"}\n`);
  lines.push("## Identidade");
  push("Premissa", s.premise);
  push("Tipo de história", s.story_type);
  push("Tom", s.tone);
  push("Época", s.epoch);
  push("Conflito central", s.central_conflict);
  push("Método", s.method);
  lines.push("\n## Mitologia e Cosmologia");
  Object.entries(s.mythology).forEach(([k, v]) => push(k, v));
  lines.push("\n## Geografia e Mapa");
  Object.entries(s.geography).forEach(([k, v]) => push(k, v));
  lines.push("\n## Magia e Tecnologia");
  Object.entries(s.magic).forEach(([k, v]) => push(k, v));
  lines.push("\n## Povos");
  s.peoples.forEach((p) => lines.push(`- ${p.name}: ${p.race}; ${p.trait}; habita ${p.habitat}`));
  lines.push("\n## Reinos");
  s.kingdoms.forEach((k) => lines.push(`- ${k.name}: ${k.power}`));
  lines.push("\n## Eventos históricos");
  s.events.forEach((e) => lines.push(`- ${e.what}`));
  lines.push("\n## Ameaças");
  s.threats.forEach((t) => lines.push(`- ${t.what}`));
  lines.push("\n## Bestiário");
  s.bestiary.forEach((c) => lines.push(`- ${c.name} [${c.type}]: ${c.behavior}`));
  lines.push("\n## Sistema de RPG");
  push("Vertente", s.rpg_system.branch);
  push("Tom mecânico", s.rpg_system.tone_mechanic);
  push("Sistema de dados", s.rpg_system.dice_system);
  return lines.join("\n");
}

function download(filename: string, content: string, type = "text/plain") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function WorldSheetView({ sheet, setSheet }: Props) {
  const set: Setter = (next) => setSheet(next);
  const update = <K extends keyof WorldSheet>(key: K, value: WorldSheet[K]) => set({ ...sheet, [key]: value });
  const updateMyth = (k: keyof WorldSheet["mythology"], v: string) =>
    set({ ...sheet, mythology: { ...sheet.mythology, [k]: v } });
  const updateGeo = (k: keyof WorldSheet["geography"], v: string) =>
    set({ ...sheet, geography: { ...sheet.geography, [k]: v } });
  const updateMagic = (k: keyof WorldSheet["magic"], v: string) =>
    set({ ...sheet, magic: { ...sheet.magic, [k]: v } });
  const updateRpg = <K extends keyof WorldSheet["rpg_system"]>(k: K, v: WorldSheet["rpg_system"][K]) =>
    set({ ...sheet, rpg_system: { ...sheet.rpg_system, [k]: v } });

  const [aiOut, setAiOut] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");


  const [mobileTab, setMobileTab] = useState<"form" | "preview">("form");

  const preview = useMemo(() => formatSheet(sheet), [sheet]);

  // List helpers
  const addPeople = () => update("peoples", [...sheet.peoples, {
    id: uid(), name: "", race: "", trait: "", habitat: "", magic: "", habit: "",
    origin_belief: "", internal_conflict: "", relations: "", unanswered: "",
  } satisfies People]);
  const setPeople = (id: string, patch: Partial<People>) =>
    update("peoples", sheet.peoples.map((p) => p.id === id ? { ...p, ...patch } : p));
  const rmPeople = (id: string) => update("peoples", sheet.peoples.filter((p) => p.id !== id));

  const addKingdom = () => update("kingdoms", [...sheet.kingdoms, {
    id: uid(), name: "", power: "", resource: "", relations: "", secret: "",
  } satisfies Kingdom]);
  const setKingdom = (id: string, patch: Partial<Kingdom>) =>
    update("kingdoms", sheet.kingdoms.map((k) => k.id === id ? { ...k, ...patch } : k));
  const rmKingdom = (id: string) => update("kingdoms", sheet.kingdoms.filter((k) => k.id !== id));

  const addEvent = () => update("events", [...sheet.events, {
    id: uid(), what: "", who: "", affects: "", official_vs_real: "", unresolved: "",
  } satisfies HistEvent]);
  const setEvent = (id: string, patch: Partial<HistEvent>) =>
    update("events", sheet.events.map((e) => e.id === id ? { ...e, ...patch } : e));
  const rmEvent = (id: string) => update("events", sheet.events.filter((e) => e.id !== id));

  const addThreat = () => update("threats", [...sheet.threats, {
    id: uid(), what: "", who_knows: "", if_ignored: "", who_wants: "", magic_link: "",
  } satisfies Threat]);
  const setThreat = (id: string, patch: Partial<Threat>) =>
    update("threats", sheet.threats.map((t) => t.id === id ? { ...t, ...patch } : t));
  const rmThreat = (id: string) => update("threats", sheet.threats.filter((t) => t.id !== id));

  const addCreature = () => update("bestiary", [...sheet.bestiary, {
    id: uid(), name: "", type: "Ameaça", habitat: "", behavior: "",
    people_relation: "", magic_relation: "", economic: "", narrative: "", legend: "",
  } satisfies Creature]);
  const setCreature = (id: string, patch: Partial<Creature>) =>
    update("bestiary", sheet.bestiary.map((c) => c.id === id ? { ...c, ...patch } : c));
  const rmCreature = (id: string) => update("bestiary", sheet.bestiary.filter((c) => c.id !== id));

  const toggleCheckpoint = (key: string) => {
    const items = { ...sheet.checkpoint.items, [key]: !sheet.checkpoint.items[key] };
    update("checkpoint", { ...sheet.checkpoint, items });
  };

  const toggleRisk = (r: string) => {
    const risks = sheet.rpg_system.risks.includes(r)
      ? sheet.rpg_system.risks.filter((x) => x !== r)
      : [...sheet.rpg_system.risks, r];
    updateRpg("risks", risks);
  };

  const setVerb = (i: number, patch: Partial<WorldSheet["rpg_system"]["verbs"][number]>) => {
    const verbs = sheet.rpg_system.verbs.map((v, idx) => idx === i ? { ...v, ...patch } : v);
    updateRpg("verbs", verbs);
  };

  const generateAI = async () => {
    setAiError(""); setAiLoading(true); setAiOut("");
    try {
      // ATENÇÃO: uso local apenas — nunca commitar em repositório público
      const ANTHROPIC_API_KEY = "SUA_CHAVE_AQUI";
      const prompt = `Você é um assistente do framework STORIAverso de worldbuilding e RPG.
Com base nos dados do mundo abaixo, gere uma expansão narrativa com exatamente estas seções:

**Segredo oculto do mundo**
[1 parágrafo — algo que contradiz ou aprofunda o que foi construído]

**Dois locais icônicos**
1. [nome]: [descrição em 2-3 linhas — habitat, atmosfera, função narrativa]
2. [nome]: [descrição em 2-3 linhas]

**Mito fundador**
[1 parágrafo — uma lenda que os povos contam sobre a origem de algo]

**Dois ganchos de aventura**
1. [gancho — situação concreta que exige decisão dos personagens]
2. [gancho]

**Verbos centrais sugeridos para o sistema de RPG**
[3 a 5 verbos com justificativa breve de por que emergem desse mundo]

**Uma contradição potencial entre pilares**
[algo que pode ser um conflito narrativo interessante — não um erro]

Seja coerente com o tom e a mitologia definidos. Sem texto fora dessas seções.

Dados do mundo:
${preview}`;
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Erro da API (${res.status}): ${t.slice(0, 200)}`);
      }
      const data = await res.json();
      const text = data?.content?.[0]?.text ?? "(resposta vazia)";
      setAiOut(text);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : String(e));
    } finally {
      setAiLoading(false);
    }
  };

  const exportJSON = () => {
    const name = (sheet.world_name || "mundo").toLowerCase().replace(/\s+/g, "-");
    download(`${name}-ficha.json`, JSON.stringify(sheet, null, 2), "application/json");
  };
  const exportTXT = () => {
    const name = (sheet.world_name || "mundo").toLowerCase().replace(/\s+/g, "-");
    download(`${name}-ficha.txt`, preview);
  };
  const exportAI = () => {
    const name = (sheet.world_name || "mundo").toLowerCase().replace(/\s+/g, "-");
    download(`${name}-expansao.txt`, aiOut);
  };
  const importJSON = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        setSheet(data);
      } catch {
        alert("Arquivo JSON inválido.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-[color:var(--border)] pb-4">
        <Button onClick={exportJSON} variant="outline" size="sm"><Download size={14} />JSON</Button>
        <Button onClick={exportTXT} variant="outline" size="sm"><Download size={14} />TXT</Button>
        <label className="inline-flex">
          <input type="file" accept="application/json" className="hidden"
            onChange={(e) => e.target.files?.[0] && importJSON(e.target.files[0])} />
          <span className="inline-flex items-center gap-2 cursor-pointer text-xs px-3 h-8 rounded-md border border-[color:var(--border)] hover:bg-[color:var(--muted)]">
            <Upload size={14} />Importar JSON
          </span>
        </label>
        <div className="ml-auto md:hidden flex gap-1">
          <Button size="sm" variant={mobileTab === "form" ? "default" : "outline"} onClick={() => setMobileTab("form")}>Formulário</Button>
          <Button size="sm" variant={mobileTab === "preview" ? "default" : "outline"} onClick={() => setMobileTab("preview")}>Prévia</Button>
        </div>
      </div>

      <div className="grid md:grid-cols-[3fr_2fr] gap-6">
        {/* FORM */}
        <div className={`space-y-8 ${mobileTab === "preview" ? "hidden md:block" : ""}`}>
          {/* Identity */}
          <section>
            <SectionTitle>Identidade do Mundo</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Nome do mundo" value={sheet.world_name} onChange={(v) => update("world_name", v)} placeholder="Como esse mundo é chamado?" />
              <Field label="Tom / atmosfera" value={sheet.tone} onChange={(v) => update("tone", v)} placeholder="Épico sombrio, mítico melancólico, aventuresco..." />
              <Field label="Premissa central" value={sheet.premise} onChange={(v) => update("premise", v)} textarea placeholder="O que define esse mundo em uma frase?" />
              <Field label="Tipo de história" value={sheet.story_type} onChange={(v) => update("story_type", v)} textarea placeholder="Que tipo de história esse mundo deve ser capaz de contar?" />
              <Field label="Época / tecnologia" value={sheet.epoch} onChange={(v) => update("epoch", v)} placeholder="Era das Ruínas, pós-colapso mágico..." />
              <Select label="Método de construção" value={sheet.method} onChange={(v) => update("method", v as WorldSheet["method"])} options={["Top-down", "Bottom-up", "Híbrido"]} />
              <div className="md:col-span-2">
                <Field label="Conflito central" value={sheet.central_conflict} onChange={(v) => update("central_conflict", v)} textarea placeholder="A tensão estrutural que move o mundo inteiro" />
              </div>
            </div>
          </section>

          {/* Mythology */}
          <section>
            <SectionTitle>Pilar 1 — Mitologia e Cosmologia</SectionTitle>
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Como esse mundo foi criado" value={sheet.mythology.creation} onChange={(v) => updateMyth("creation", v)} textarea placeholder="Houve um criador, uma força, um evento primordial — ou o mundo sempre existiu?" />
              <Field label="O que existia antes" value={sheet.mythology.before} onChange={(v) => updateMyth("before", v)} textarea placeholder="Era anterior, civilização perdida, estado primordial..." />
              <Field label="Forças maiores que movem o mundo" value={sheet.mythology.forces} onChange={(v) => updateMyth("forces", v)} textarea placeholder="Divinas, cósmicas, naturais, ancestrais — ainda interferem?" />
              <Field label="Crenças sobre a origem" value={sheet.mythology.beliefs} onChange={(v) => updateMyth("beliefs", v)} textarea placeholder="Essa crença é unânime ou disputada? Quem guarda esse conhecimento?" />
              <Field label="O sagrado e o proibido" value={sheet.mythology.sacred} onChange={(v) => updateMyth("sacred", v)} textarea placeholder="O que a mitologia proíbe, teme ou considera sagrado — e que ainda afeta o presente?" />
              <Field label="Destino, ciclos e profecias" value={sheet.mythology.destiny} onChange={(v) => updateMyth("destiny", v)} textarea placeholder="Existe ideia de destino? Profecias, ciclos que se repetem?" />
              <Field label="O que acontece após a morte" value={sheet.mythology.afterlife} onChange={(v) => updateMyth("afterlife", v)} textarea placeholder="Existe algo além — e quem sabe disso?" />
              <Field label="Evento que ressoa no presente" value={sheet.mythology.echo_event} onChange={(v) => updateMyth("echo_event", v)} textarea placeholder="Guerra dos deuses, era de ouro perdida, grande catástrofe..." />
            </div>
          </section>

          {/* Geography */}
          <section>
            <SectionTitle>Pilar 2 — Geografia e Mapa</SectionTitle>
            <div className="grid md:grid-cols-2 gap-3">
              <Select label="Forma do mundo" value={sheet.geography.shape} onChange={(v) => updateGeo("shape", v)} options={["Esférico", "Plano", "Ilhas", "Flutuante", "Anel", "Outro"]} />
              <Field label="Regiões / biomas principais" value={sheet.geography.regions} onChange={(v) => updateGeo("regions", v)} textarea placeholder="Quantas massas de terra? Bioma de cada região?" />
              <Field label="O grande obstáculo físico" value={sheet.geography.obstacle} onChange={(v) => updateGeo("obstacle", v)} textarea placeholder="Cordilheira intransponível, mar em tempestade, abismo, zona mágica..." />
              <Field label="Recursos disputados" value={sheet.geography.resources} onChange={(v) => updateGeo("resources", v)} textarea placeholder="Água, minérios, especiarias, energia mágica, terras férteis..." />
              <Field label="O lugar que ninguém alcança" value={sheet.geography.inaccessible} onChange={(v) => updateGeo("inaccessible", v)} textarea placeholder="O que existe lá? Por que ninguém voltou?" />
              <Field label="Como as pessoas se movem" value={sheet.geography.movement} onChange={(v) => updateGeo("movement", v)} textarea placeholder="A pé, por mar, por ar, por magia, por túneis, portais..." />
              <div className="md:col-span-2">
                <Field label="Fenômenos que moldam o cotidiano" value={sheet.geography.phenomena} onChange={(v) => updateGeo("phenomena", v)} textarea placeholder="Tempestades sazonais, marés mágicas, migrações de criaturas..." />
              </div>
            </div>
          </section>

          {/* Magic */}
          <section>
            <SectionTitle>Pilar 3 — Magia e Tecnologia</SectionTitle>
            <div className="grid md:grid-cols-2 gap-3">
              <Select label="Tipo de sistema" value={sheet.magic.system_type} onChange={(v) => updateMagic("system_type", v)} options={["Magia dura", "Magia suave", "Tecnomagia", "Tecnologia avançada", "Outro"]} />
              <Select label="Relação magia-tecnologia" value={sheet.magic.magic_tech} onChange={(v) => updateMagic("magic_tech", v)} options={["Coexistem", "Competem", "Se fundem", "Uma substituiu a outra"]} />
              <Field label="Quem pode usar" value={sheet.magic.who} onChange={(v) => updateMagic("who", v)} textarea placeholder="Hereditário, aprendido, concedido, conquistado, aleatório — quem não pode?" />
              <Field label="O custo" value={sheet.magic.cost} onChange={(v) => updateMagic("cost", v)} textarea placeholder="Energia, saúde, tempo de vida, memória, alma, moralidade, sanidade..." />
              <Field label="O proibido e o limite" value={sheet.magic.forbidden} onChange={(v) => updateMagic("forbidden", v)} textarea placeholder="O que é absolutamente proibido — e o que acontece com quem ultrapassa?" />
              <Select label="Abundância ou escassez" value={sheet.magic.abundance} onChange={(v) => updateMagic("abundance", v)} options={["Abundante e democrática", "Escassa e de elite", "Segredo de poucos"]} />
              <Field label="Conexão com a mitologia" value={sheet.magic.mythology_link} onChange={(v) => updateMagic("mythology_link", v)} textarea placeholder="Os deuses criaram a magia? A tecnologia contradiz as crenças?" />
              <Field label="Elemento mais distintivo" value={sheet.magic.distinctive} onChange={(v) => updateMagic("distinctive", v)} textarea placeholder="O que torna esse sistema único entre todos os mundos possíveis?" />
            </div>
          </section>

          {/* Peoples */}
          <section>
            <div className="flex items-center justify-between">
              <SectionTitle>Pilar 4 — Raças e Povos</SectionTitle>
              <Button size="sm" variant="outline" onClick={addPeople}><Plus size={14} />Adicionar povo</Button>
            </div>
            <div className="space-y-2">
              {sheet.peoples.map((p) => (
                <Accordion key={p.id} title={p.name} onRemove={() => rmPeople(p.id)}>
                  <div className="grid md:grid-cols-2 gap-3">
                    <Field label="Nome do povo" value={p.name} onChange={(v) => setPeople(p.id, { name: v })} />
                    <Field label="Raça / tipo de ser" value={p.race} onChange={(v) => setPeople(p.id, { race: v })} placeholder="Humanoide, criatura, híbrido..." />
                    <Field label="Traço físico marcante" value={p.trait} onChange={(v) => setPeople(p.id, { trait: v })} placeholder="O que qualquer observador notaria primeiro" />
                    <Field label="Onde vive" value={p.habitat} onChange={(v) => setPeople(p.id, { habitat: v })} placeholder="Região, bioma, tipo de habitat" />
                    <Field label="Relação com a magia" value={p.magic} onChange={(v) => setPeople(p.id, { magic: v })} textarea />
                    <Field label="Hábito cultural único" value={p.habit} onChange={(v) => setPeople(p.id, { habit: v })} textarea />
                    <Field label="Crença sobre a origem do mundo" value={p.origin_belief} onChange={(v) => setPeople(p.id, { origin_belief: v })} textarea />
                    <Field label="Conflito interno do povo" value={p.internal_conflict} onChange={(v) => setPeople(p.id, { internal_conflict: v })} textarea />
                    <Field label="Relação com outros povos" value={p.relations} onChange={(v) => setPeople(p.id, { relations: v })} textarea />
                    <Field label="Pergunta nunca respondida" value={p.unanswered} onChange={(v) => setPeople(p.id, { unanswered: v })} textarea />
                  </div>
                </Accordion>
              ))}
            </div>
          </section>

          {/* Kingdoms / Events / Threats */}
          <section>
            <SectionTitle>Pilar 5 — Reinos, Política e História</SectionTitle>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-serif text-[color:var(--foreground)]">Reinos</h4>
                <Button size="sm" variant="outline" onClick={addKingdom}><Plus size={14} />Adicionar</Button>
              </div>
              <div className="space-y-2">
                {sheet.kingdoms.map((k) => (
                  <Accordion key={k.id} title={k.name} onRemove={() => rmKingdom(k.id)}>
                    <Field label="Nome e localização" value={k.name} onChange={(v) => setKingdom(k.id, { name: v })} />
                    <Field label="Estrutura de poder" value={k.power} onChange={(v) => setKingdom(k.id, { power: v })} textarea placeholder="Quem governa, como conquistou, como mantém" />
                    <Field label="Recurso mais valioso" value={k.resource} onChange={(v) => setKingdom(k.id, { resource: v })} textarea placeholder="O que o torna alvo?" />
                    <Field label="Relação com os povos" value={k.relations} onChange={(v) => setKingdom(k.id, { relations: v })} textarea />
                    <Field label="Segredo que esconde" value={k.secret} onChange={(v) => setKingdom(k.id, { secret: v })} textarea placeholder="O que, se revelado, mudaria tudo?" />
                  </Accordion>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-serif text-[color:var(--foreground)]">Eventos históricos</h4>
                <Button size="sm" variant="outline" onClick={addEvent}><Plus size={14} />Adicionar</Button>
              </div>
              <div className="space-y-2">
                {sheet.events.map((e) => (
                  <Accordion key={e.id} title={e.what.slice(0, 60)} onRemove={() => rmEvent(e.id)}>
                    <Field label="O que aconteceu" value={e.what} onChange={(v) => setEvent(e.id, { what: v })} textarea />
                    <Field label="Quem foi responsável" value={e.who} onChange={(v) => setEvent(e.id, { who: v })} textarea />
                    <Field label="Como ainda afeta o presente" value={e.affects} onChange={(v) => setEvent(e.id, { affects: v })} textarea />
                    <Field label="Versão oficial vs. versão real" value={e.official_vs_real} onChange={(v) => setEvent(e.id, { official_vs_real: v })} textarea />
                    <Field label="Quem não superou as consequências" value={e.unresolved} onChange={(v) => setEvent(e.id, { unresolved: v })} textarea />
                  </Accordion>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-serif text-[color:var(--foreground)]">Ameaças ativas</h4>
                <Button size="sm" variant="outline" onClick={addThreat}><Plus size={14} />Adicionar</Button>
              </div>
              <div className="space-y-2">
                {sheet.threats.map((t) => (
                  <Accordion key={t.id} title={t.what.slice(0, 60)} onRemove={() => rmThreat(t.id)}>
                    <Field label="O que é essa ameaça" value={t.what} onChange={(v) => setThreat(t.id, { what: v })} textarea placeholder="Império, desastre, revolução, profecia, entidade..." />
                    <Field label="Quem sabe — e quem está ignorando" value={t.who_knows} onChange={(v) => setThreat(t.id, { who_knows: v })} textarea />
                    <Field label="Se ninguém agir" value={t.if_ignored} onChange={(v) => setThreat(t.id, { if_ignored: v })} textarea />
                    <Field label="Quem quer que se concretize" value={t.who_wants} onChange={(v) => setThreat(t.id, { who_wants: v })} textarea />
                    <Field label="Conexão com magia/mitologia" value={t.magic_link} onChange={(v) => setThreat(t.id, { magic_link: v })} textarea />
                  </Accordion>
                ))}
              </div>
            </div>
          </section>

          {/* Bestiary */}
          <section>
            <div className="flex items-center justify-between">
              <SectionTitle>Pilar 6 — Bestiário</SectionTitle>
              <Button size="sm" variant="outline" onClick={addCreature}><Plus size={14} />Adicionar criatura</Button>
            </div>
            <div className="space-y-2">
              {sheet.bestiary.map((c) => (
                <Accordion key={c.id} title={c.name} onRemove={() => rmCreature(c.id)}>
                  <div className="grid md:grid-cols-2 gap-3">
                    <Field label="Nome" value={c.name} onChange={(v) => setCreature(c.id, { name: v })} />
                    <Select label="Tipo" value={c.type} onChange={(v) => setCreature(c.id, { type: v as Creature["type"] })} options={["Ameaça", "Recurso", "Símbolo", "Guardião", "Lendária"]} />
                    <Field label="Habitat" value={c.habitat} onChange={(v) => setCreature(c.id, { habitat: v })} placeholder="Onde vive — e por que ali" />
                    <Field label="Comportamento" value={c.behavior} onChange={(v) => setCreature(c.id, { behavior: v })} textarea placeholder="Predatória, territorial, migratória, social..." />
                    <Field label="Relação com os povos" value={c.people_relation} onChange={(v) => setCreature(c.id, { people_relation: v })} textarea />
                    <Field label="Relação com a magia" value={c.magic_relation} onChange={(v) => setCreature(c.id, { magic_relation: v })} textarea />
                    <Field label="Impacto econômico" value={c.economic} onChange={(v) => setCreature(c.id, { economic: v })} textarea />
                    <Field label="Papel narrativo" value={c.narrative} onChange={(v) => setCreature(c.id, { narrative: v })} textarea />
                    <div className="md:col-span-2">
                      <Field label="Lenda associada" value={c.legend} onChange={(v) => setCreature(c.id, { legend: v })} textarea placeholder="O que os povos contam — e qual parte é verdadeira?" />
                    </div>
                  </div>
                </Accordion>
              ))}
            </div>
          </section>

          {/* Checkpoint */}
          <section className="rounded-lg p-5" style={{ border: "1px solid var(--amber-accent)" }}>
            <h3 className="font-serif text-xl text-[color:var(--amber-accent)] mb-3">Checkpoint 1 — Coesão do Mundo</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {Object.entries(CHECKPOINT_ITEMS).map(([pillar, items]) => (
                <div key={pillar}>
                  <div className="text-xs uppercase tracking-wider text-[color:var(--muted-foreground)] mb-2">{pillar}</div>
                  <div className="space-y-1.5">
                    {items.map((item) => {
                      const key = `${pillar}:${item}`;
                      return (
                        <label key={key} className="flex items-start gap-2 text-sm cursor-pointer">
                          <input type="checkbox" checked={!!sheet.checkpoint.items[key]} onChange={() => toggleCheckpoint(key)} className="mt-1" />
                          <span>{item}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 space-y-3">
              <Field label="Contradições identificadas e como foram resolvidas" value={sheet.checkpoint.contradictions} onChange={(v) => update("checkpoint", { ...sheet.checkpoint, contradictions: v })} textarea />
              <Field label="Lacunas deixadas em aberto intencionalmente" value={sheet.checkpoint.gaps} onChange={(v) => update("checkpoint", { ...sheet.checkpoint, gaps: v })} textarea />
            </div>
          </section>

          {/* RPG */}
          <section>
            <SectionTitle>Sistema de RPG</SectionTitle>
            <div className="grid md:grid-cols-2 gap-3">
              <Select label="Vertente dominante" value={sheet.rpg_system.branch} onChange={(v) => updateRpg("branch", v)} options={["Gamista", "Simulacionista", "Narrativista", "Híbrido"]} />
              <Select label="Público-alvo" value={sheet.rpg_system.audience} onChange={(v) => updateRpg("audience", v)} options={["Iniciantes", "Experientes", "Publicação ampla"]} />
              <Field label="Tensão central do mundo" value={sheet.rpg_system.central_tension} onChange={(v) => updateRpg("central_tension", v)} textarea placeholder="O conflito estrutural que os personagens vão navegar" />
              <Field label="Tipo de personagem" value={sheet.rpg_system.character_type} onChange={(v) => updateRpg("character_type", v)} textarea placeholder="Heróis? Sobreviventes? Agentes políticos?" />
              <Select label="Tom mecânico" value={sheet.rpg_system.tone_mechanic} onChange={(v) => updateRpg("tone_mechanic", v)} options={["Épico", "Sombrio", "Investigativo", "Trágico", "Aventuresco", "Político"]} />
              <Select label="Papel do acaso" value={sheet.rpg_system.chance_role} onChange={(v) => updateRpg("chance_role", v)} options={["Mundo cruel e imprevisível", "Competência que triunfa", "Narrativa importa mais"]} />
              <Select label="Sistema de dados" value={sheet.rpg_system.dice_system} onChange={(v) => updateRpg("dice_system", v)} options={["D20", "D12", "D10", "D6", "2D6", "3D6", "Pool de dados", "D100", "Narrativo puro"]} />
              <Field label="Modelo de resolução" value={sheet.rpg_system.resolution} onChange={(v) => updateRpg("resolution", v)} textarea placeholder="Como uma ação é resolvida, sucesso com preço, quando rolar..." />
              <div className="md:col-span-2">
                <Field label="Notas de playtest" value={sheet.rpg_system.playtest_notes} onChange={(v) => updateRpg("playtest_notes", v)} textarea />
              </div>
            </div>

            <h4 className="font-serif mt-6 mb-2">5 Verbos Centrais</h4>
            <div className="space-y-3">
              {sheet.rpg_system.verbs.map((v, i) => (
                <div key={i} className="grid md:grid-cols-3 gap-2">
                  <Field label={`Verbo ${i + 1}`} value={v.verb} onChange={(x) => setVerb(i, { verb: x })} placeholder="combater, negociar, explorar..." />
                  <Field label="Representa" value={v.represents} onChange={(x) => setVerb(i, { represents: x })} />
                  <Field label="Mecânica que precisa" value={v.mechanic} onChange={(x) => setVerb(i, { mechanic: x })} />
                </div>
              ))}
            </div>

            <h4 className="font-serif mt-6 mb-2">O que está em risco</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {RISKS.map((r) => (
                <label key={r} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={sheet.rpg_system.risks.includes(r)} onChange={() => toggleRisk(r)} />
                  <span>{r}</span>
                </label>
              ))}
            </div>
            <div className="mt-3">
              <Field label="Outro" value={sheet.rpg_system.risks_other} onChange={(v) => updateRpg("risks_other", v)} />
            </div>

            <div className="flex items-center justify-between mt-6 mb-2">
              <h4 className="font-serif">Atributos do personagem</h4>
              <Button size="sm" variant="outline" onClick={() => updateRpg("attributes", [...sheet.rpg_system.attributes, { id: uid(), name: "", represents: "", verb: "" }])}>
                <Plus size={14} />Adicionar
              </Button>
            </div>
            <div className="space-y-2">
              {sheet.rpg_system.attributes.map((a) => (
                <div key={a.id} className="grid md:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                  <Field label="Nome" value={a.name} onChange={(v) => updateRpg("attributes", sheet.rpg_system.attributes.map((x) => x.id === a.id ? { ...x, name: v } : x))} />
                  <Field label="Representa" value={a.represents} onChange={(v) => updateRpg("attributes", sheet.rpg_system.attributes.map((x) => x.id === a.id ? { ...x, represents: v } : x))} />
                  <Field label="Verbo que testa" value={a.verb} onChange={(v) => updateRpg("attributes", sheet.rpg_system.attributes.map((x) => x.id === a.id ? { ...x, verb: v } : x))} />
                  <Button variant="ghost" size="icon" onClick={() => updateRpg("attributes", sheet.rpg_system.attributes.filter((x) => x.id !== a.id))}><Trash2 size={14} /></Button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mt-6 mb-2">
              <h4 className="font-serif">Recursos rastreados</h4>
              <Button size="sm" variant="outline" onClick={() => updateRpg("resources", [...sheet.rpg_system.resources, { id: uid(), name: "", represents: "", lethality: "Médio" }])}>
                <Plus size={14} />Adicionar
              </Button>
            </div>
            <div className="space-y-2">
              {sheet.rpg_system.resources.map((r) => (
                <div key={r.id} className="grid md:grid-cols-[1fr_1fr_140px_auto] gap-2 items-end">
                  <Field label="Nome" value={r.name} onChange={(v) => updateRpg("resources", sheet.rpg_system.resources.map((x) => x.id === r.id ? { ...x, name: v } : x))} />
                  <Field label="Representa" value={r.represents} onChange={(v) => updateRpg("resources", sheet.rpg_system.resources.map((x) => x.id === r.id ? { ...x, represents: v } : x))} />
                  <Select label="Letalidade" value={r.lethality} onChange={(v) => updateRpg("resources", sheet.rpg_system.resources.map((x) => x.id === r.id ? { ...x, lethality: v as RpgResource["lethality"] } : x))} options={["Alto", "Médio", "Baixo"]} />
                  <Button variant="ghost" size="icon" onClick={() => updateRpg("resources", sheet.rpg_system.resources.filter((x) => x.id !== r.id))}><Trash2 size={14} /></Button>
                </div>
              ))}
            </div>
          </section>

          {/* AI */}
          <section className="grimoire-card p-5">
            <h3 className="font-serif text-xl text-[color:var(--amber-accent)] mb-2">Expansão com IA</h3>
            <p className="text-xs text-[color:var(--muted-foreground)] mb-3">
              Requer chave da Anthropic (claude-sonnet-4-5). A chave é salva apenas no seu navegador.
            </p>
            <div className="flex gap-2 items-end mb-3">
              <label className="flex-1">
                <span className="text-xs uppercase tracking-wider text-[color:var(--muted-foreground)]">Anthropic API Key</span>
                <input
                  type={showKey ? "text" : "password"}
                  className="field-input"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-ant-..."
                />
              </label>
              <Button size="sm" variant="outline" onClick={() => setShowKey(!showKey)}>{showKey ? "Ocultar" : "Mostrar"}</Button>
            </div>
            <div className="flex gap-2">
              <Button onClick={generateAI} disabled={aiLoading}>
                <Sparkles size={14} />{aiLoading ? "Gerando..." : "Gerar expansão"}
              </Button>
              {aiOut && <Button variant="outline" onClick={exportAI}><Download size={14} />Baixar TXT</Button>}
            </div>
            {aiError && <p className="text-sm text-[color:var(--destructive)] mt-3">{aiError}</p>}
            {aiOut && (
              <pre className="whitespace-pre-wrap text-sm mt-4 p-4 bg-[color:var(--muted)] rounded-md font-sans leading-relaxed">{aiOut}</pre>
            )}
          </section>
        </div>

        {/* PREVIEW */}
        <aside className={`${mobileTab === "form" ? "hidden md:block" : ""}`}>
          <div className="grimoire-card p-5 md:sticky md:top-4 max-h-[calc(100vh-6rem)] overflow-auto">
            <h3 className="font-serif text-lg text-[color:var(--amber-accent)] mb-3 border-b border-[color:var(--border)] pb-2">Prévia</h3>
            <pre className="whitespace-pre-wrap text-xs leading-relaxed font-sans text-[color:var(--foreground)]">{preview}</pre>
          </div>
        </aside>
      </div>
    </div>
  );
}

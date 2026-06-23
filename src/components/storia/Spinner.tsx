import { useEffect, useRef, useState } from "react";
import { Plus, X, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePersistedState, uid, pushLog } from "@/lib/storia/storage";
import { STORAGE_KEYS, type SpinnerList, type LogEntry } from "@/lib/storia/types";

interface Props {
  onSaved: () => void;
}

const COLORS = ["#1a3a5c", "#c4843a", "#3b5f7d", "#8b5a2b", "#2d4e6e", "#a06b2e", "#4a6f8a", "#6d4520", "#5d7a94"];

const DEFAULT_LISTS: SpinnerList[] = [
  { id: uid(), name: "Pilares", options: ["Mitologia", "Geografia", "Magia", "Raças", "Reinos", "Bestiário"] },
  { id: uid(), name: "Verbos RPG", options: ["Combater", "Negociar", "Investigar", "Explorar", "Sobreviver", "Conjurar"] },
  { id: uid(), name: "Tom de cena", options: ["Épico", "Sombrio", "Tenso", "Melancólico", "Esperançoso", "Brutal"] },
];

export default function Spinner({ onSaved }: Props) {
  const [lists, setLists] = usePersistedState<SpinnerList[]>(STORAGE_KEYS.spinnerLists, () => DEFAULT_LISTS, onSaved);
  const [log, setLog] = usePersistedState<LogEntry[]>(STORAGE_KEYS.spinnerLog, () => [], onSaved);
  const [options, setOptions] = useState<string[]>(DEFAULT_LISTS[0].options);
  const [input, setInput] = useState("");
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [listName, setListName] = useState("");
  const [selectedListId, setSelectedListId] = useState<string>("");
  const rafRef = useRef<number | null>(null);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  const addOption = () => {
    if (!input.trim() || options.length >= 12) return;
    setOptions([...options, input.trim()]);
    setInput("");
  };

  const spin = () => {
    if (spinning || options.length < 2) return;
    setSpinning(true); setResult(null);
    const turns = 5 + Math.random() * 3;
    const finalAngle = angle + turns * 360 + Math.random() * 360;
    const duration = 4000;
    const start = performance.now();
    const startAngle = angle;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const cur = startAngle + (finalAngle - startAngle) * eased;
      setAngle(cur);
      if (t < 1) rafRef.current = requestAnimationFrame(step);
      else {
        const slice = 360 / options.length;
        // pointer at top (12 o'clock). The slice currently under the pointer:
        const normalized = ((cur % 360) + 360) % 360;
        const idx = Math.floor(((360 - normalized) % 360) / slice);
        const r = options[idx % options.length];
        setResult(r);
        setSpinning(false);
        setLog(pushLog(log, { id: uid(), ts: Date.now(), text: `Roleta → ${r}` }));
      }
    };
    rafRef.current = requestAnimationFrame(step);
  };

  const saveList = () => {
    if (!listName.trim() || options.length === 0) return;
    const newList: SpinnerList = { id: uid(), name: listName.trim(), options: [...options] };
    setLists([...lists, newList]);
    setListName("");
  };
  const loadList = (id: string) => {
    setSelectedListId(id);
    const l = lists.find((x) => x.id === id);
    if (l) setOptions([...l.options]);
  };
  const deleteList = () => {
    if (!selectedListId) return;
    setLists(lists.filter((l) => l.id !== selectedListId));
    setSelectedListId("");
  };

  const size = 360;
  const r = size / 2;

  return (
    <div className="grid md:grid-cols-[1fr_360px] gap-6">
      <div className="grimoire-card p-6 flex flex-col items-center">
        <div className="relative" style={{ width: size, height: size }}>
          {/* pointer */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-2 z-10" style={{
            width: 0, height: 0, borderLeft: "12px solid transparent", borderRight: "12px solid transparent",
            borderTop: "20px solid var(--amber-accent)",
          }} />
          <svg width={size} height={size} style={{ transform: `rotate(${angle}deg)`, transition: spinning ? "none" : undefined }}>
            <g transform={`translate(${r},${r})`}>
              {options.length === 0 && <circle r={r - 4} fill="var(--muted)" />}
              {options.map((opt, i) => {
                const slice = (2 * Math.PI) / options.length;
                const a0 = -Math.PI / 2 + i * slice;
                const a1 = a0 + slice;
                const x0 = (r - 4) * Math.cos(a0), y0 = (r - 4) * Math.sin(a0);
                const x1 = (r - 4) * Math.cos(a1), y1 = (r - 4) * Math.sin(a1);
                const large = slice > Math.PI ? 1 : 0;
                const path = `M0,0 L${x0},${y0} A${r - 4},${r - 4} 0 ${large} 1 ${x1},${y1} Z`;
                let colorIdx = i % COLORS.length;
                if (i > 0 && colorIdx === (i - 1) % COLORS.length) colorIdx = (colorIdx + 1) % COLORS.length;
                const mid = a0 + slice / 2;
                const tx = (r * 0.62) * Math.cos(mid), ty = (r * 0.62) * Math.sin(mid);
                return (
                  <g key={i}>
                    <path d={path} fill={COLORS[colorIdx]} stroke="rgba(0,0,0,0.35)" strokeWidth={0.5} />
                    <text x={tx} y={ty} fontSize={12} fill="#f1e9d2" textAnchor="middle" dominantBaseline="middle"
                      transform={`rotate(${(mid * 180) / Math.PI + 90} ${tx} ${ty})`} style={{ fontFamily: "var(--font-serif)" }}>
                      {opt.length > 14 ? opt.slice(0, 13) + "…" : opt}
                    </text>
                  </g>
                );
              })}
              <circle r={20} fill="var(--amber-accent)" stroke="rgba(0,0,0,0.4)" />
            </g>
          </svg>
        </div>

        <Button onClick={spin} size="lg" disabled={spinning || options.length < 2} className="mt-6 w-48">
          {spinning ? "Girando..." : "Girar"}
        </Button>
        {result && !spinning && (
          <div className="mt-6 text-center">
            <div className="text-xs uppercase tracking-wider text-[color:var(--muted-foreground)]">Resultado</div>
            <div className="font-serif text-3xl text-[color:var(--amber-accent)] mt-1">{result}</div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="grimoire-card p-4">
          <h4 className="font-serif text-[color:var(--amber-accent)] mb-3">Opções ({options.length}/12)</h4>
          <div className="flex gap-2 mb-3">
            <input className="field-input" value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addOption()} placeholder="Nova opção" />
            <Button onClick={addOption} size="icon" disabled={options.length >= 12}><Plus size={14} /></Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {options.map((o, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-xs bg-[color:var(--muted)] px-2 py-1 rounded">
                {o}
                <button onClick={() => setOptions(options.filter((_, j) => j !== i))} className="text-[color:var(--muted-foreground)] hover:text-[color:var(--destructive)]">
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="grimoire-card p-4 space-y-3">
          <h4 className="font-serif text-[color:var(--amber-accent)]">Listas salvas</h4>
          <div className="flex gap-2">
            <input className="field-input" placeholder="Nome da lista" value={listName} onChange={(e) => setListName(e.target.value)} />
            <Button onClick={saveList} size="icon"><Save size={14} /></Button>
          </div>
          <div className="flex gap-2">
            <select className="field-input flex-1" value={selectedListId} onChange={(e) => loadList(e.target.value)}>
              <option value="">Carregar lista...</option>
              {lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <Button onClick={deleteList} size="icon" variant="outline" disabled={!selectedListId}><Trash2 size={14} /></Button>
          </div>
        </div>

        <div className="grimoire-card p-4 max-h-72 overflow-auto">
          <h4 className="font-serif text-[color:var(--amber-accent)] mb-2">Histórico</h4>
          {log.length === 0 ? (
            <p className="text-xs text-[color:var(--muted-foreground)]">Nada ainda.</p>
          ) : (
            <ul className="space-y-1 text-xs">
              {log.map((e) => (
                <li key={e.id}>
                  <span className="text-[color:var(--muted-foreground)] mr-2">
                    {new Date(e.ts).toLocaleTimeString("pt-BR", { hour12: false })}
                  </span>
                  {e.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

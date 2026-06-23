import { useState, useRef } from "react";
import { Dice5, Plus, Trash2, Minus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePersistedState, uid, pushLog } from "@/lib/storia/storage";
import { STORAGE_KEYS, type DicelessResource, type LogEntry } from "@/lib/storia/types";

type Mode = "dice" | "table" | "diceless";

interface Props {
  onSaved: () => void;
}

const fmtTime = (ts: number) => new Date(ts).toLocaleTimeString("pt-BR", { hour12: false });

export default function DiceResources({ onSaved }: Props) {
  const [mode, setMode] = useState<Mode>("dice");

  return (
    <div>
      <div className="flex items-center gap-3 mb-6 border-b border-[color:var(--border)] pb-4">
        <span className="text-xs uppercase tracking-wider text-[color:var(--muted-foreground)]">Modo</span>
        <select className="field-input max-w-xs" value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
          <option value="dice">Dados numéricos</option>
          <option value="table">Tabela de opções</option>
          <option value="diceless">Diceless / Recursos</option>
        </select>
      </div>

      {mode === "dice" && <DiceMode onSaved={onSaved} />}
      {mode === "table" && <TableMode onSaved={onSaved} />}
      {mode === "diceless" && <DicelessMode onSaved={onSaved} />}
    </div>
  );
}

function playDiceSound() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(150, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.15);
  } catch {
    /* noop */
  }
}

function DicePips({ value }: { value: number }) {
  const faces: Record<number, number[]> = {
    1: [5],
    2: [1, 9],
    3: [1, 5, 9],
    4: [1, 3, 7, 9],
    5: [1, 3, 5, 7, 9],
    6: [1, 3, 4, 6, 7, 9],
  };
  const active = new Set(faces[value] || []);
  return (
    <div className="dice-pips">
      {Array.from({ length: 9 }, (_, i) => {
        const n = i + 1;
        return <span key={n} className={`dice-pip ${active.has(n) ? "dice-pip-active" : ""}`} />;
      })}
    </div>
  );
}

function Dice3D({ rolling, type, result }: { rolling: boolean; type: string; result: string }) {
  const isD6 = type === "D6";
  const typeMark = <span className="dice-type-mark">{type}</span>;
  return (
    <div className="dice-container">
      <div className={`dice-cube${rolling ? " dice-rolling" : ""}`}>
        <div className="dice-face face-front">
          <div className="dice-face-content">
            {isD6
              ? rolling
                ? <DicePips value={6} />
                : <span className="result-number">{result || type}</span>
              : rolling
                ? typeMark
                : <span className="result-number">{result || type}</span>}
          </div>
        </div>
        <div className="dice-face face-back">
          <div className="dice-face-content">{isD6 ? <DicePips value={1} /> : typeMark}</div>
        </div>
        <div className="dice-face face-left">
          <div className="dice-face-content">{isD6 ? <DicePips value={2} /> : typeMark}</div>
        </div>
        <div className="dice-face face-right">
          <div className="dice-face-content">{isD6 ? <DicePips value={5} /> : typeMark}</div>
        </div>
        <div className="dice-face face-top">
          <div className="dice-face-content">{isD6 ? <DicePips value={3} /> : typeMark}</div>
        </div>
        <div className="dice-face face-bottom">
          <div className="dice-face-content">{isD6 ? <DicePips value={4} /> : typeMark}</div>
        </div>
      </div>
    </div>
  );
}

function DiceMode({ onSaved }: Props) {
  const [type, setType] = useState("D6");
  const [qty, setQty] = useState(1);
  const [mod, setMod] = useState(0);
  const [result, setResult] = useState<{ total: number; rolls: number[]; mod: number; type: string; qty: number } | null>(null);
  const [rolling, setRolling] = useState(false);
  const [log, setLog] = usePersistedState<LogEntry[]>(STORAGE_KEYS.diceLog, () => [], onSaved);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const roll = () => {
    if (rolling) return;
    const sides = parseInt(type.replace("D", ""), 10);
    const rolls = Array.from({ length: qty }, () => 1 + Math.floor(Math.random() * sides));
    const total = rolls.reduce((a, b) => a + b, 0) + mod;

    playDiceSound();
    setResult(null);
    setRolling(true);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setRolling(false);
      setResult({ total, rolls, mod, type, qty });
      const text = `${qty}${type}${mod ? (mod > 0 ? `+${mod}` : mod) : ""} → ${total} [${rolls.join(", ")}]${mod ? ` ${mod > 0 ? "+" : ""}${mod}` : ""}`;
      setLog(pushLog(log, { id: uid(), ts: Date.now(), text }));
    }, 1200);
  };

  const faceResult = result ? String(result.rolls[0]) : "";

  return (
    <div className="grid md:grid-cols-[1fr_320px] gap-6">
      <div>
        <div className="grimoire-card p-6">
          <div className="grid grid-cols-3 gap-3 mb-6">
            <label>
              <span className="text-xs uppercase tracking-wider text-[color:var(--muted-foreground)]">Tipo</span>
              <select className="field-input" value={type} onChange={(e) => setType(e.target.value)} disabled={rolling}>
                {["D4", "D6", "D8", "D10", "D12", "D20", "D100"].map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
            <label>
              <span className="text-xs uppercase tracking-wider text-[color:var(--muted-foreground)]">Quantidade</span>
              <input type="number" min={1} max={10} className="field-input" value={qty} onChange={(e) => setQty(Math.max(1, Math.min(10, +e.target.value || 1)))} disabled={rolling} />
            </label>
            <label>
              <span className="text-xs uppercase tracking-wider text-[color:var(--muted-foreground)]">Modificador</span>
              <input type="number" className="field-input" value={mod} onChange={(e) => setMod(+e.target.value || 0)} disabled={rolling} />
            </label>
          </div>
          <Button type="button" onClick={roll} size="lg" className="w-full" disabled={rolling}>
            <Dice5 size={16} />{rolling ? "Rolando..." : "Rolar"}
          </Button>

          <div className="mt-8 min-h-[120px] flex items-center justify-center">
            {(rolling || result) && <Dice3D rolling={rolling} type={type} result={faceResult} />}
          </div>

          {!rolling && result && (
            <div className="mt-4 text-center dice-result-in">
              <div className="font-serif text-[64px] leading-none text-[color:var(--amber-accent)]">{result.total}</div>
              <div className="mt-3 text-sm text-[color:var(--muted-foreground)]">
                {result.qty}{result.type}{result.mod ? (result.mod > 0 ? `+${result.mod}` : result.mod) : ""} → [{result.rolls.join(", ")}]{result.mod ? ` ${result.mod > 0 ? "+" : ""}${result.mod}` : ""}
              </div>
            </div>
          )}
        </div>
      </div>
      <DiceLog log={log} onClear={() => setLog([])} />
    </div>
  );
}

function TableMode({ onSaved }: Props) {
  const [options, setOptions] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [log, setLog] = usePersistedState<LogEntry[]>(STORAGE_KEYS.diceLog + ":table", () => [], onSaved);

  const draw = () => {
    const list = options.split("\n").map((x) => x.trim()).filter(Boolean);
    if (list.length === 0) return;
    const r = list[Math.floor(Math.random() * list.length)];
    setResult(r);
    setLog(pushLog(log, { id: uid(), ts: Date.now(), text: `Sorteio (${list.length} opções) → ${r}` }));
  };

  return (
    <div className="grid md:grid-cols-[1fr_320px] gap-6">
      <div className="grimoire-card p-6">
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-[color:var(--muted-foreground)]">Opções (uma por linha)</span>
          <textarea className="field-input min-h-[220px] resize-y mt-1.5" value={options} onChange={(e) => setOptions(e.target.value)} />
        </label>
        <Button onClick={draw} size="lg" className="mt-4 w-full"><Dice5 size={16} />Sortear</Button>
        {result && (
          <div className="mt-8 text-center">
            <div className="font-serif text-3xl text-[color:var(--amber-accent)]">{result}</div>
          </div>
        )}
      </div>
      <DiceLog log={log} onClear={() => setLog([])} />
    </div>
  );
}

function DicelessMode({ onSaved }: Props) {
  const [resources, setResources] = usePersistedState<DicelessResource[]>(STORAGE_KEYS.resources, () => [], onSaved);
  const [log, setLog] = usePersistedState<LogEntry[]>(STORAGE_KEYS.diceLog + ":diceless", () => [], onSaved);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMax, setNewMax] = useState(10);

  const change = (id: string, delta: number) => {
    setResources(resources.map((r) => r.id === id ? { ...r, current: Math.max(0, Math.min(r.max, r.current + delta)) } : r));
    const r = resources.find((x) => x.id === id);
    if (r) setLog(pushLog(log, { id: uid(), ts: Date.now(), text: `${r.name}: ${delta > 0 ? "+" : ""}${delta} (${Math.max(0, Math.min(r.max, r.current + delta))}/${r.max})` }));
  };
  const reset = (id: string) => {
    setResources(resources.map((r) => r.id === id ? { ...r, current: r.max } : r));
    const r = resources.find((x) => x.id === id);
    if (r) setLog(pushLog(log, { id: uid(), ts: Date.now(), text: `${r.name}: reset (${r.max}/${r.max})` }));
  };
  const remove = (id: string) => setResources(resources.filter((r) => r.id !== id));
  const add = () => {
    if (!newName.trim()) return;
    setResources([...resources, { id: uid(), name: newName, current: newMax, max: newMax }]);
    setNewName(""); setNewMax(10); setAdding(false);
  };
  const drawRandom = () => {
    const pool = resources.filter((r) => r.current > 0);
    if (!pool.length) return;
    const r = pool[Math.floor(Math.random() * pool.length)];
    setLog(pushLog(log, { id: uid(), ts: Date.now(), text: `Sorteio de recurso → ${r.name}` }));
    alert(`Sorteado: ${r.name}`);
  };

  return (
    <div className="grid md:grid-cols-[1fr_320px] gap-6">
      <div className="space-y-3">
        <div className="flex gap-2">
          <Button onClick={() => setAdding(true)} variant="outline"><Plus size={14} />Adicionar recurso</Button>
          <Button onClick={drawRandom} variant="outline"><Dice5 size={14} />Sortear recurso</Button>
        </div>

        {adding && (
          <div className="grimoire-card p-4 flex gap-2 items-end">
            <label className="flex-1">
              <span className="text-xs uppercase tracking-wider text-[color:var(--muted-foreground)]">Nome</span>
              <input className="field-input" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </label>
            <label className="w-24">
              <span className="text-xs uppercase tracking-wider text-[color:var(--muted-foreground)]">Máximo</span>
              <input type="number" min={1} className="field-input" value={newMax} onChange={(e) => setNewMax(+e.target.value || 1)} />
            </label>
            <Button onClick={add}>Criar</Button>
            <Button onClick={() => setAdding(false)} variant="ghost">Cancelar</Button>
          </div>
        )}

        {resources.length === 0 && <p className="text-sm text-[color:var(--muted-foreground)] grimoire-card p-6 text-center">Nenhum recurso. Adicione um para começar.</p>}

        {resources.map((r) => {
          const pct = r.max > 0 ? (r.current / r.max) * 100 : 0;
          return (
            <div key={r.id} className="grimoire-card p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-serif text-lg">{r.name}</div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[color:var(--muted-foreground)]">{r.current} / {r.max}</span>
                  <Button variant="ghost" size="icon" onClick={() => remove(r.id)}><Trash2 size={14} /></Button>
                </div>
              </div>
              <div className="h-2 bg-[color:var(--muted)] rounded-full overflow-hidden mb-3">
                <div className="h-full transition-all" style={{ width: `${pct}%`, background: "var(--amber-accent)" }} />
              </div>
              <div className="flex gap-1.5 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => change(r.id, -3)}>−3</Button>
                <Button variant="outline" size="sm" onClick={() => change(r.id, -1)}><Minus size={12} />1</Button>
                <Button variant="outline" size="sm" onClick={() => change(r.id, +1)}><Plus size={12} />1</Button>
                <Button variant="outline" size="sm" onClick={() => change(r.id, +3)}>+3</Button>
                <Button variant="outline" size="sm" onClick={() => reset(r.id)}><RotateCcw size={12} />Reset</Button>
              </div>
            </div>
          );
        })}
      </div>
      <DiceLog log={log} onClear={() => setLog([])} />
    </div>
  );
}

function DiceLog({ log, onClear }: { log: LogEntry[]; onClear: () => void }) {
  return (
    <aside className="grimoire-card p-4 md:sticky md:top-4 self-start max-h-[calc(100vh-6rem)] overflow-auto">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-serif text-[color:var(--amber-accent)]">Histórico</h4>
        {log.length > 0 && <Button variant="ghost" size="sm" onClick={onClear}>Limpar</Button>}
      </div>
      {log.length === 0 ? (
        <p className="text-xs text-[color:var(--muted-foreground)]">Nada ainda.</p>
      ) : (
        <ul className="space-y-1.5 text-xs">
          {log.map((e) => (
            <li key={e.id} className="border-b border-[color:var(--border)] pb-1.5">
              <span className="text-[color:var(--muted-foreground)] mr-2">{fmtTime(e.ts)}</span>
              {e.text}
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

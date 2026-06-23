import { useEffect, useRef, useState } from "react";
import { Plus, X, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePersistedState, uid, pushLog } from "@/lib/storia/storage";
import { STORAGE_KEYS, type SpinnerList, type LogEntry } from "@/lib/storia/types";

interface Props {
  onSaved: () => void;
}

const COLORS = [
  "#1a3a5c", "#c4843a", "#2d5a8e", "#8b5e2a", "#0f2744",
  "#e09b4e", "#3a6fa0", "#6b4420", "#1e4976", "#d4893c",
];

const DEFAULT_OPTIONS = ["Fantasia", "Ficção Científica", "Terror", "Romance", "Thriller", "Aventura"];

const DEFAULT_LISTS: SpinnerList[] = [
  { id: uid(), name: "Pilares STORIAverso", options: ["Mitologia", "Geografia", "Magia", "Raças", "Reinos", "Bestiário"] },
  { id: uid(), name: "Gêneros narrativos", options: ["Fantasia", "Ficção Científica", "Terror", "Romance", "Thriller", "Aventura"] },
  { id: uid(), name: "Verbos RPG", options: ["Combater", "Negociar", "Investigar", "Explorar", "Sobreviver", "Conjurar"] },
  { id: uid(), name: "Tom de cena", options: ["Épico", "Sombrio", "Tenso", "Melancólico", "Esperançoso", "Brutal"] },
];

const CANVAS_SIZE = 320;
const CENTER = CANVAS_SIZE / 2;
const RADIUS = 148;

function pickColor(index: number, total: number): string {
  let idx = index % COLORS.length;
  if (index > 0 && idx === (index - 1) % COLORS.length) idx = (idx + 1) % COLORS.length;
  // ensure last slice doesn't match first
  if (index === total - 1 && idx === 0 % COLORS.length) idx = (idx + 1) % COLORS.length;
  return COLORS[idx];
}

function drawSliceLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  startAngle: number,
  sliceAngle: number,
) {
  const midAngle = startAngle + sliceAngle / 2;
  const textRadius = RADIUS * 0.62;
  const display = text.length > 16 ? text.slice(0, 15) + "…" : text;

  ctx.save();
  ctx.translate(CENTER, CENTER);

  const normalized = ((midAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const isBottomHalf = normalized > Math.PI / 2 && normalized < Math.PI * 1.5;

  ctx.font = "italic 13px Georgia, serif";
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 3;

  if (isBottomHalf) {
    ctx.rotate(midAngle + Math.PI);
    ctx.fillText(display, -textRadius, 0);
  } else {
    ctx.rotate(midAngle);
    ctx.fillText(display, textRadius, 0);
  }

  ctx.restore();
}

function drawWheel(ctx: CanvasRenderingContext2D, options: string[], angleDeg: number) {
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  if (options.length === 0) {
    ctx.beginPath();
    ctx.arc(CENTER, CENTER, RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = "#1e293b";
    ctx.fill();
    return;
  }

  const rotation = (angleDeg * Math.PI) / 180;
  const slice = (Math.PI * 2) / options.length;

  options.forEach((opt, i) => {
    const a0 = -Math.PI / 2 + i * slice + rotation;
    const a1 = a0 + slice;
    ctx.beginPath();
    ctx.moveTo(CENTER, CENTER);
    ctx.arc(CENTER, CENTER, RADIUS, a0, a1);
    ctx.closePath();
    ctx.fillStyle = pickColor(i, options.length);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 0.5;
    ctx.stroke();
    drawSliceLabel(ctx, opt, a0, slice);
  });

  // hub
  ctx.beginPath();
  ctx.arc(CENTER, CENTER, 18, 0, Math.PI * 2);
  ctx.fillStyle = "#c4843a";
  ctx.fill();
  ctx.strokeStyle = "#0a0f1a";
  ctx.lineWidth = 2;
  ctx.stroke();
}

export default function Spinner({ onSaved }: Props) {
  const [lists, setLists] = usePersistedState<SpinnerList[]>(STORAGE_KEYS.spinnerLists, () => DEFAULT_LISTS, onSaved);
  const [log, setLog] = usePersistedState<LogEntry[]>(STORAGE_KEYS.spinnerLog, () => [], onSaved);
  const [options, setOptions] = useState<string[]>(DEFAULT_OPTIONS);
  const [input, setInput] = useState("");
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [listName, setListName] = useState("");
  const [selectedListId, setSelectedListId] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== CANVAS_SIZE * dpr) {
      canvas.width = CANVAS_SIZE * dpr;
      canvas.height = CANVAS_SIZE * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    drawWheel(ctx, options, angle);
  }, [options, angle]);

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
        const normalized = ((cur % 360) + 360) % 360;
        const idx = Math.floor(((360 - normalized) % 360) / slice);
        const r = options[idx % options.length];
        setResult(r);
        setSpinning(false);
        setLog(pushLog(log, { id: uid(), ts: Date.now(), text: r }));
      }
    };
    rafRef.current = requestAnimationFrame(step);
  };

  const saveList = () => {
    if (!listName.trim() || options.length === 0) return;
    setLists([...lists, { id: uid(), name: listName.trim(), options: [...options] }]);
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

  const counterColor = options.length >= 12 ? "#c4843a" : options.length < 10 ? "#86efac" : "#cbd5e1";

  return (
    <div className="grid md:grid-cols-[45%_55%] gap-6">
      {/* LEFT: wheel */}
      <div className="grimoire-card p-6 flex flex-col items-center">
        <div className="relative" style={{ width: CANVAS_SIZE }}>
          <div
            className="absolute left-1/2 -translate-x-1/2 z-10"
            style={{
              top: -4,
              width: 0, height: 0,
              borderLeft: "8px solid transparent",
              borderRight: "8px solid transparent",
              borderTop: "20px solid #c4843a",
            }}
          />
          <canvas
            ref={canvasRef}
            style={{ width: CANVAS_SIZE, height: CANVAS_SIZE, display: "block" }}
          />
        </div>

        <div
          key={result ?? "empty"}
          className="mt-5 text-center"
          style={{
            minHeight: 32,
            fontFamily: "Georgia, serif",
            fontWeight: 700,
            fontSize: 22,
            color: "#c4843a",
            animation: result && !spinning ? "fadeInResult 0.3s ease-out" : undefined,
          }}
        >
          {result && !spinning ? result : ""}
        </div>

        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); spin(); }}
          disabled={spinning || options.length < 2}
          className="mt-3 transition-colors"
          style={{
            width: 200, height: 44,
            background: "#c4843a",
            color: "#0a0f1a",
            fontSize: 15, fontWeight: 500,
            borderRadius: 8,
            cursor: spinning ? "not-allowed" : "pointer",
            opacity: spinning || options.length < 2 ? 0.6 : 1,
          }}
          onMouseEnter={(e) => { if (!spinning) (e.currentTarget.style.background = "#8b5e2a"); }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "#c4843a"; }}
        >
          {spinning ? "Girando..." : "Girar"}
        </button>
      </div>

      {/* RIGHT panel */}
      <div className="space-y-4">
        {/* Card 1 — Options */}
        <div className="grimoire-card p-4">
          <h4 className="mb-3" style={{ color: "#c4843a", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Opções <span style={{ color: counterColor }}>({options.length}/12)</span>
          </h4>
          <div className="flex gap-2 mb-3">
            <input
              className="field-input flex-1"
              style={{ height: 36 }}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addOption()}
              placeholder="Nova opção..."
            />
            <button
              type="button"
              onClick={addOption}
              disabled={options.length >= 12 || !input.trim()}
              style={{
                width: 36, height: 36, borderRadius: 6,
                background: "#c4843a", color: "#0a0f1a",
                display: "grid", placeItems: "center",
                opacity: options.length >= 12 || !input.trim() ? 0.5 : 1,
                cursor: options.length >= 12 || !input.trim() ? "not-allowed" : "pointer",
              }}
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {options.map((o, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5"
                style={{
                  fontSize: 12,
                  background: "#1e293b",
                  color: "#e2e8f0",
                  border: "0.5px solid #475569",
                  padding: "4px 8px",
                  borderRadius: 999,
                }}
              >
                {o}
                <button
                  onClick={() => setOptions(options.filter((_, j) => j !== i))}
                  style={{ color: "#94a3b8" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#e2e8f0")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
                >
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Card 2 — Saved lists */}
        <div className="grimoire-card p-4 space-y-2">
          <h4 style={{ color: "#c4843a", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Listas salvas
          </h4>
          <div className="flex gap-2">
            <input
              className="field-input flex-1"
              style={{ height: 36 }}
              placeholder="Nome da lista"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
            />
            <Button onClick={saveList} size="icon" disabled={!listName.trim()}><Save size={14} /></Button>
          </div>
          <div className="flex gap-2">
            <select
              className="field-input flex-1"
              style={{ height: 36 }}
              value={selectedListId}
              onChange={(e) => loadList(e.target.value)}
            >
              <option value="">Carregar lista...</option>
              {lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <Button onClick={deleteList} size="icon" variant="outline" disabled={!selectedListId}><Trash2 size={14} /></Button>
          </div>
        </div>

        {/* Card 3 — History */}
        <div className="grimoire-card p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 style={{ color: "#c4843a", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Histórico
            </h4>
            {log.length > 0 && (
              <button
                onClick={() => setLog([])}
                style={{ fontSize: 11, color: "#64748b" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#cbd5e1")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#64748b")}
              >
                Limpar
              </button>
            )}
          </div>
          {log.length === 0 ? (
            <p style={{ fontSize: 13, color: "#64748b" }}>Nada ainda.</p>
          ) : (
            <ul
              className="space-y-1"
              style={{ maxHeight: 8 * 22, overflowY: "auto", fontSize: 13 }}
            >
              {log.slice(0, 50).map((e) => (
                <li key={e.id} className="flex gap-2">
                  <span style={{ color: "#64748b" }}>
                    {new Date(e.ts).toLocaleTimeString("pt-BR", { hour12: false, hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span style={{ color: "#e2e8f0" }}>— {e.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

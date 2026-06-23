import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { BookOpen, Dice5, Disc, Map } from "lucide-react";
import { usePersistedState } from "@/lib/storia/storage";
import { STORAGE_KEYS, emptySheet, type WorldSheet } from "@/lib/storia/types";
import WorldSheetView from "@/components/storia/WorldSheetView";
import DiceResources from "@/components/storia/DiceResources";
import Spinner from "@/components/storia/Spinner";
import MapSketch from "@/components/storia/MapSketch";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "STORIAverso Kit" },
      { name: "description", content: "Ferramenta de facilitação ao vivo para imersões de worldbuilding e RPG no framework STORIAverso." },
    ],
  }),
  component: Index,
});

type Tab = "ficha" | "dados" | "roleta" | "mapa";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: "ficha", label: "Ficha do Mundo", icon: BookOpen },
  { id: "dados", label: "Dados & Recursos", icon: Dice5 },
  { id: "roleta", label: "Roleta", icon: Disc },
  { id: "mapa", label: "Mapa", icon: Map },
];

function Index() {
  const [tab, setTab] = useState<Tab>("ficha");
  const [lastSaved, setLastSaved] = useState<number | null>(null);

  const onSaved = useCallback(() => setLastSaved(Date.now()), []);

  const [sheet, setSheet] = usePersistedState<WorldSheet>(
    STORAGE_KEYS.worldSheet,
    () => emptySheet(),
    onSaved,
  );

  // hydrate last saved from storage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ts = window.localStorage.getItem(STORAGE_KEYS.lastSaved);
    if (ts) setLastSaved(parseInt(ts, 10));
  }, []);

  useEffect(() => {
    if (lastSaved && typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEYS.lastSaved, String(lastSaved));
    }
  }, [lastSaved]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 backdrop-blur bg-[color:var(--background)]/85 border-b border-[color:var(--border)]">
        <div className="max-w-7xl mx-auto px-5 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: "var(--prussian)", border: "0.5px solid var(--amber-accent)" }}>
              <BookOpen size={16} color="#c4843a" />
            </div>
            <h1 className="font-serif text-lg md:text-xl tracking-wide">
              STORIAverso <span className="text-[color:var(--amber-accent)]">Kit</span>
            </h1>
          </div>
          <div className="text-xs text-[color:var(--muted-foreground)]">
            {lastSaved ? `Salvo às ${new Date(lastSaved).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "Sem alterações"}
          </div>
        </div>
        <nav className="max-w-7xl mx-auto px-5 flex gap-1 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`relative flex items-center gap-2 px-4 py-2.5 text-sm whitespace-nowrap transition-colors font-serif ${
                  active ? "text-[color:var(--amber-accent)]" : "text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
                }`}
              >
                <Icon size={14} />
                {label}
                {active && <span className="absolute left-2 right-2 bottom-0 h-px" style={{ background: "var(--amber-accent)" }} />}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-5 py-6">
        {tab === "ficha" && <WorldSheetView sheet={sheet} setSheet={setSheet} />}
        {tab === "dados" && <DiceResources onSaved={onSaved} />}
        {tab === "roleta" && <Spinner onSaved={onSaved} />}
        {tab === "mapa" && <MapSketch sheet={sheet} />}
      </main>
    </div>
  );
}

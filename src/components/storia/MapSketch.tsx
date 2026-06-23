import { useRef, useState } from "react";
import { Download, Map as MapIcon, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WorldSheet } from "@/lib/storia/types";

interface Props {
  sheet: WorldSheet;
}

const W = 580, H = 300;

export default function MapSketch({ sheet }: Props) {
  const [desc, setDesc] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const useFromSheet = () => {
    const parts = [sheet.geography.regions, sheet.geography.obstacle, sheet.geography.phenomena, sheet.geography.inaccessible]
      .filter(Boolean).join(". ");
    setDesc(parts);
  };

  const generate = () => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const d = desc.toLowerCase();
    // seedable rng
    let seed = 0; for (let i = 0; i < d.length; i++) seed = (seed * 31 + d.charCodeAt(i)) >>> 0;
    if (!seed) seed = 1234567;
    const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0xffffffff; };

    // ocean background
    ctx.fillStyle = "#1a3a5c";
    ctx.fillRect(0, 0, W, H);

    // grid
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // landmass(es)
    const islands: { cx: number; cy: number; r: number; pts: { x: number; y: number }[] }[] = [];
    const hasIslands = /ilha|arquipél/.test(d);
    const count = hasIslands ? 3 + Math.floor(rng() * 3) : 1;
    for (let i = 0; i < count; i++) {
      const cx = hasIslands ? 80 + rng() * (W - 160) : W / 2 + (rng() - 0.5) * 60;
      const cy = hasIslands ? 60 + rng() * (H - 120) : H / 2 + (rng() - 0.5) * 30;
      const baseR = hasIslands ? 40 + rng() * 30 : 110 + rng() * 30;
      const pts: { x: number; y: number }[] = [];
      const steps = 36;
      for (let s = 0; s < steps; s++) {
        const a = (s / steps) * Math.PI * 2;
        const r = baseR * (0.7 + rng() * 0.5);
        pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
      }
      islands.push({ cx, cy, r: baseR, pts });
    }

    const isFrozen = /gelo|glacial/.test(d);
    const isDesert = /desert|cin|areia/.test(d);
    const isSwamp = /pântano|brej/.test(d);

    const landColor = isFrozen ? "#a8b9c4" : isDesert ? "#c2a878" : isSwamp ? "#3d4a35" : "#5e7547";

    for (const isl of islands) {
      // shadow
      ctx.beginPath();
      ctx.moveTo(isl.pts[0].x + 3, isl.pts[0].y + 3);
      for (const p of isl.pts) ctx.lineTo(p.x + 3, p.y + 3);
      ctx.closePath();
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fill();

      // land
      ctx.beginPath();
      ctx.moveTo(isl.pts[0].x, isl.pts[0].y);
      for (const p of isl.pts) ctx.lineTo(p.x, p.y);
      ctx.closePath();
      ctx.fillStyle = landColor;
      ctx.fill();
      ctx.strokeStyle = "#c4843a";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    // features per island
    for (const isl of islands) {
      const featureCount = Math.floor(3 + rng() * 5);
      for (let i = 0; i < featureCount; i++) {
        const a = rng() * Math.PI * 2;
        const dist = rng() * (isl.r * 0.6);
        const x = isl.cx + Math.cos(a) * dist;
        const y = isl.cy + Math.sin(a) * dist;
        if (/vulc|lava/.test(d) && rng() < 0.3) drawVolcano(ctx, x, y);
        else if (/mont|serra|pico/.test(d) && rng() < 0.4) drawMountain(ctx, x, y, true);
        else if (/floresta negra/.test(d)) drawTree(ctx, x, y, "#1a2818");
        else if (/flor|árvor|arvore/.test(d)) drawTree(ctx, x, y, "#2d4a22");
        else if (/ruí|antiq|esquec/.test(d) && rng() < 0.25) drawRuin(ctx, x, y);
        else if (isSwamp) drawSwamp(ctx, x, y);
        else drawMountain(ctx, x, y, false);
      }
    }

    // parchment border
    ctx.strokeStyle = "rgba(200,180,130,0.4)";
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, W - 8, H - 8);
    ctx.strokeStyle = "rgba(200,180,130,0.7)";
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, W - 20, H - 20);

    // compass
    drawCompass(ctx, W - 40, H - 40);
  };

  const download = () => {
    const c = canvasRef.current; if (!c) return;
    const url = c.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url; a.download = `${(sheet.world_name || "mapa").toLowerCase().replace(/\s+/g, "-")}.png`;
    a.click();
  };

  return (
    <div className="grid md:grid-cols-[1fr_auto] gap-6">
      <div className="space-y-4">
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-[color:var(--muted-foreground)]">Descrição do mundo (palavras-chave geram elementos)</span>
          <textarea className="field-input min-h-[180px] resize-y mt-1.5" value={desc} onChange={(e) => setDesc(e.target.value)}
            placeholder="Ex: arquipélago vulcânico cercado por florestas e ruínas antigas..." />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button onClick={useFromSheet} variant="outline"><MapIcon size={14} />Usar dados da ficha</Button>
          <Button onClick={generate}><Wand2 size={14} />Gerar mapa</Button>
          <Button onClick={download} variant="outline"><Download size={14} />Baixar PNG</Button>
        </div>
        <p className="text-xs text-[color:var(--muted-foreground)]">
          Palavras-chave reconhecidas: vulcão / lava, floresta / árvore, deserto / cinza / areia, ilha / arquipélago, ruína / antigo, montanha / serra, pântano, gelo / glacial.
        </p>
      </div>
      <div className="grimoire-card p-3 inline-block">
        <canvas ref={canvasRef} width={W} height={H} style={{ display: "block", borderRadius: 4 }} />
      </div>
    </div>
  );
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - 8);
  ctx.lineTo(x + 5, y + 2);
  ctx.lineTo(x - 5, y + 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#3a2818";
  ctx.fillRect(x - 1, y + 1, 2, 3);
}

function drawMountain(ctx: CanvasRenderingContext2D, x: number, y: number, snow: boolean) {
  ctx.fillStyle = "#4a4034";
  ctx.beginPath();
  ctx.moveTo(x, y - 10);
  ctx.lineTo(x + 8, y + 4);
  ctx.lineTo(x - 8, y + 4);
  ctx.closePath();
  ctx.fill();
  if (snow) {
    ctx.fillStyle = "#e8e4dc";
    ctx.beginPath();
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x + 3, y - 4);
    ctx.lineTo(x - 3, y - 4);
    ctx.closePath();
    ctx.fill();
  }
}

function drawVolcano(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#3a2018";
  ctx.beginPath();
  ctx.moveTo(x, y - 12);
  ctx.lineTo(x + 12, y + 6);
  ctx.lineTo(x - 12, y + 6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ff6020";
  ctx.beginPath();
  ctx.ellipse(x, y - 10, 4, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffb030";
  ctx.beginPath();
  ctx.arc(x, y - 11, 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawRuin(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#8a8270";
  ctx.fillRect(x - 4, y - 2, 2, 6);
  ctx.fillRect(x, y - 5, 2, 9);
  ctx.fillRect(x + 3, y - 1, 2, 5);
}

function drawSwamp(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#2a3826";
  ctx.beginPath();
  ctx.ellipse(x, y, 8, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(120,140,100,0.4)";
  ctx.beginPath();
  ctx.ellipse(x - 2, y - 1, 3, 1, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawCompass(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.strokeStyle = "rgba(200,180,130,0.7)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y, 18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#c4843a";
  ctx.font = "10px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("N", x, y - 12);
  ctx.fillText("S", x, y + 12);
  ctx.fillText("L", x + 12, y);
  ctx.fillText("O", x - 12, y);
  ctx.beginPath();
  ctx.moveTo(x, y - 8); ctx.lineTo(x + 3, y); ctx.lineTo(x, y + 8); ctx.lineTo(x - 3, y); ctx.closePath();
  ctx.fillStyle = "rgba(200,180,130,0.5)";
  ctx.fill();
}

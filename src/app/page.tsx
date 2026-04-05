"use client";

import { useState, useRef, useEffect, useCallback } from "react";

/* ───────── Color palette ───────── */
const PALETTE = [
  { color: "#FF6B6B", name: "coral" },
  { color: "#FF8E53", name: "tangerine" },
  { color: "#FECA57", name: "sunshine" },
  { color: "#A3CB38", name: "lime" },
  { color: "#01A66F", name: "emerald" },
  { color: "#48DBFB", name: "sky" },
  { color: "#54A0FF", name: "ocean" },
  { color: "#6B5CE7", name: "iris" },
  { color: "#FF9FF3", name: "bubblegum" },
  { color: "#F368E0", name: "magenta" },
  { color: "#EE5A24", name: "rust" },
  { color: "#6D214F", name: "plum" },
  { color: "#2D3436", name: "charcoal" },
  { color: "#FFFFFF", name: "white" },
];

const BRUSH_SIZES = [
  { size: 3, label: "Fine" },
  { size: 8, label: "Medium" },
  { size: 16, label: "Thick" },
  { size: 28, label: "Chunky" },
];

type PlantedFlower = {
  dataUrl: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  id: number;
};

/* ───────── Drawing Canvas ───────── */
function DrawingCanvas({
  onPlant,
  onCancel,
}: {
  onPlant: (dataUrl: string, w: number, h: number) => void;
  onCancel: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#FF6B6B");
  const [brushSize, setBrushSize] = useState(8);
  const [hasDrawn, setHasDrawn] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#FFFEF5";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const getPos = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const touch = "touches" in e ? e.touches[0] : e;
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    },
    []
  );

  const startDraw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      setIsDrawing(true);
      setHasDrawn(true);
      const pos = getPos(e);
      lastPos.current = pos;
      const ctx = canvasRef.current!.getContext("2d")!;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    },
    [getPos, color, brushSize]
  );

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      if (!isDrawing || !lastPos.current) return;
      const pos = getPos(e);
      const ctx = canvasRef.current!.getContext("2d")!;
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
      lastPos.current = pos;
    },
    [isDrawing, getPos, color, brushSize]
  );

  const stopDraw = useCallback(() => {
    setIsDrawing(false);
    lastPos.current = null;
  }, []);

  const clearCanvas = () => {
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.fillStyle = "#FFFEF5";
    ctx.fillRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
    setHasDrawn(false);
  };

  const handlePlant = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4;
        if (!(data[i] >= 254 && data[i + 1] >= 253 && data[i + 2] >= 244)) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }
    if (maxX <= minX || maxY <= minY) return;

    const pad = 6;
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(canvas.width, maxX + pad);
    maxY = Math.min(canvas.height, maxY + pad);
    const cropW = maxX - minX;
    const cropH = maxY - minY;

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = cropW;
    tempCanvas.height = cropH;
    const tempCtx = tempCanvas.getContext("2d")!;
    const cropped = ctx.getImageData(minX, minY, cropW, cropH);
    const cd = cropped.data;
    for (let i = 0; i < cd.length; i += 4) {
      if (cd[i] >= 254 && cd[i + 1] >= 253 && cd[i + 2] >= 244) {
        cd[i + 3] = 0;
      }
    }
    tempCtx.putImageData(cropped, 0, 0);
    onPlant(tempCanvas.toDataURL("image/png"), cropW, cropH);
  };

  return (
    <div className="flex flex-col items-center gap-5 px-4 py-6 w-full max-w-lg mx-auto"
      style={{ animation: "fadeInUp 0.5s cubic-bezier(0.25, 1, 0.5, 1) both" }}>
      <div className="text-center">
        <h2 style={{ fontFamily: "'Caveat', cursive", color: "#6B5CE7", fontSize: "1.85rem", fontWeight: 700 }}>
          Draw your flower
        </h2>
        <p className="text-sm mt-1" style={{ color: "#636E72" }}>
          Use your finger or mouse — any shape, any style!
        </p>
      </div>

      <div
        className="w-full rounded-2xl overflow-hidden"
        style={{
          border: "3px dashed #D4CCF7",
          aspectRatio: "1",
          maxWidth: "400px",
          boxShadow: "0 8px 32px rgba(107, 92, 231, 0.08)",
          touchAction: "none",
          WebkitUserSelect: "none",
          userSelect: "none",
        }}
      >
        <canvas
          ref={canvasRef}
          width={500}
          height={500}
          style={{ width: "100%", height: "100%", display: "block", cursor: "crosshair" }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
      </div>

      {/* Color palette */}
      <div className="flex gap-1.5 flex-wrap justify-center px-4 py-3 rounded-xl" style={{ background: "#E8E4FF" }}>
        {PALETTE.map((c) => (
          <button
            key={c.color}
            onClick={() => setColor(c.color)}
            title={c.name}
            className="rounded-full transition-all duration-150"
            style={{
              width: "30px", height: "30px",
              backgroundColor: c.color,
              border: color === c.color ? "3px solid #2D3436" : "2px solid rgba(0,0,0,0.08)",
              transform: color === c.color ? "scale(1.2)" : "scale(1)",
              boxShadow: c.color === "#FFFFFF" ? "inset 0 0 0 1px rgba(0,0,0,0.12)" : "none",
              cursor: "pointer",
            }}
          />
        ))}
      </div>

      {/* Brush sizes */}
      <div className="flex gap-3 items-center">
        {BRUSH_SIZES.map((b) => (
          <button
            key={b.size}
            onClick={() => setBrushSize(b.size)}
            className="flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-all duration-150"
            style={{
              background: brushSize === b.size ? "#6B5CE7" : "#E8E4FF",
              cursor: "pointer",
            }}
          >
            <div className="rounded-full" style={{
              width: `${b.size + 6}px`, height: `${b.size + 6}px`,
              backgroundColor: brushSize === b.size ? "#fff" : "#6B5CE7",
            }} />
            <span className="text-xs" style={{ color: brushSize === b.size ? "#fff" : "#636E72" }}>
              {b.label}
            </span>
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3 w-full max-w-sm">
        <button onClick={onCancel}
          className="flex-1 py-3 rounded-full text-base transition-all duration-200"
          style={{ border: "2px solid #E0E0E0", background: "white", color: "#636E72", cursor: "pointer" }}>
          Back
        </button>
        <button onClick={clearCanvas}
          className="flex-1 py-3 rounded-full text-base transition-all duration-200"
          style={{ border: "2px solid #FECA57", background: "#FFFDE7", color: "#E67E22", cursor: "pointer" }}>
          Start over
        </button>
        <button onClick={handlePlant} disabled={!hasDrawn}
          className="py-3 rounded-full text-base font-semibold transition-all duration-200"
          style={{
            flex: "1.3", border: "none",
            background: hasDrawn ? "linear-gradient(135deg, #4A9E3B, #2D7A1E)" : "#E0E0E0",
            color: hasDrawn ? "white" : "#aaa",
            boxShadow: hasDrawn ? "0 4px 16px rgba(74, 158, 59, 0.3)" : "none",
            cursor: hasDrawn ? "pointer" : "default",
          }}>
          Plant it!
        </button>
      </div>
    </div>
  );
}

/* ───────── Garden Scene ───────── */
function GardenScene({ flowers, onDrawNew }: { flowers: PlantedFlower[]; onDrawNew: () => void }) {
  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-3xl mx-auto px-4 py-6"
      style={{ animation: "fadeInUp 0.5s cubic-bezier(0.25, 1, 0.5, 1) both" }}>
      <div className="text-center">
        <h1 style={{
          fontFamily: "'Caveat', cursive", color: "#2D7A1E",
          fontSize: "clamp(2rem, 6vw, 3rem)", lineHeight: 1.1, fontWeight: 700,
        }}>
          Mansi&apos;s Flower Garden
        </h1>
        <p className="mt-2 text-lg" style={{ color: "#636E72" }}>
          {flowers.length === 0
            ? "No flowers yet \u2014 be the first to plant one!"
            : `${flowers.length} flower${flowers.length === 1 ? "" : "s"} planted and growing`}
        </p>
      </div>

      {/* Garden */}
      <div className="w-full rounded-3xl overflow-hidden relative" style={{
        height: "clamp(320px, 55vw, 480px)",
        border: "3px solid #4A9E3B",
        boxShadow: "0 12px 40px rgba(45, 122, 30, 0.12), inset 0 0 80px rgba(255,255,255,0.1)",
        background: "linear-gradient(180deg, #7EC8E3 0%, #B5E8F7 32%, #90D26D 32%, #6BBF4A 50%, #4A9E3B 70%, #3D8B2F 100%)",
      }}>
        {/* Sun */}
        <div className="absolute" style={{
          top: "16px", left: "24px", width: "48px", height: "48px", borderRadius: "50%",
          background: "radial-gradient(circle, #FECA57 30%, #F39C12 100%)",
          boxShadow: "0 0 40px 8px rgba(254, 202, 87, 0.4)",
        }} />

        {/* Clouds */}
        {[
          { left: "18%", top: "6%", delay: "0s", s: 1 },
          { left: "52%", top: "4%", delay: "2s", s: 1.15 },
          { left: "76%", top: "10%", delay: "4s", s: 0.85 },
        ].map((c, i) => (
          <div key={i} className="absolute" style={{
            left: c.left, top: c.top,
            width: `${70 * c.s}px`, height: `${26 * c.s}px`, borderRadius: "20px",
            background: "rgba(255,255,255,0.85)",
            boxShadow: `${18 * c.s}px -4px 0 4px rgba(255,255,255,0.75), ${-8 * c.s}px 0 0 2px rgba(255,255,255,0.65)`,
            animation: `drift ${6 + i * 2}s ease-in-out infinite`, animationDelay: c.delay,
          }} />
        ))}

        {/* Grass detail */}
        <svg className="absolute bottom-0 left-0 w-full pointer-events-none" style={{ height: "50px" }} preserveAspectRatio="none">
          {Array.from({ length: 60 }, (_, i) => {
            const x = (i / 60) * 100;
            const h = 12 + ((i * 7 + 13) % 30);
            const sway = ((i * 3 + 5) % 11) - 5;
            return (
              <path key={i}
                d={`M ${x}% 100% Q ${x + sway}% ${100 - h}% ${x + sway / 2}% ${100 - h - 4}%`}
                stroke="#2D7A1E" strokeWidth="2" fill="none" opacity={0.3 + ((i * 7) % 5) / 10}
              />
            );
          })}
        </svg>

        {/* Empty state */}
        {flowers.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ paddingBottom: "15%" }}>
            <p style={{
              color: "rgba(255,255,255,0.6)", fontFamily: "'Caveat', cursive",
              fontSize: "1.5rem", textShadow: "0 1px 4px rgba(0,0,0,0.15)",
            }}>
              Your garden awaits...
            </p>
          </div>
        )}

        {/* Flowers */}
        {flowers.map((f) => {
          const depthFactor = f.y;
          const baseSize = Math.min(100, Math.max(45, 75 * f.scale));
          const finalSize = baseSize * (0.45 + depthFactor * 0.55);
          return (
            <div key={f.id} className="absolute" style={{
              left: `${f.x * 100}%`, top: `${30 + f.y * 52}%`,
              width: `${finalSize}px`, zIndex: Math.floor(f.y * 100),
              animation: "flowerGrow 0.6s cubic-bezier(0.25, 1, 0.5, 1) both",
            }}>
              <div className="absolute rounded-sm" style={{
                bottom: "-18px", left: "50%", width: "3px", height: "22px",
                background: "#2D7A1E", transform: "translateX(-50%)", opacity: 0.7,
              }} />
              <img src={f.dataUrl} alt="A hand-drawn flower" draggable={false} style={{
                width: "100%", height: "auto",
                filter: `drop-shadow(1px 2px 4px rgba(0,0,0,0.12)) brightness(${0.88 + depthFactor * 0.12})`,
              }} />
            </div>
          );
        })}
      </div>

      {/* Draw button */}
      <button onClick={onDrawNew}
        className="py-4 px-10 rounded-full font-bold transition-all duration-200"
        style={{
          fontFamily: "'Caveat', cursive", fontSize: "1.35rem",
          border: "none",
          background: "linear-gradient(135deg, #FF6B6B, #FF9FF3, #FECA57)",
          color: "white", cursor: "pointer",
          boxShadow: "0 6px 24px rgba(255, 107, 107, 0.3)",
          letterSpacing: "0.02em",
        }}
        onMouseEnter={(e) => {
          (e.target as HTMLElement).style.transform = "scale(1.04)";
          (e.target as HTMLElement).style.boxShadow = "0 8px 28px rgba(255, 107, 107, 0.4)";
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLElement).style.transform = "scale(1)";
          (e.target as HTMLElement).style.boxShadow = "0 6px 24px rgba(255, 107, 107, 0.3)";
        }}>
        Draw a flower
      </button>

      <p className="text-sm mt-2" style={{ color: "#636E72", opacity: 0.6 }}>
        a little experiment by{" "}
        <span style={{ color: "#6B5CE7", fontWeight: 600 }}>Mansi&apos;s Musings</span>
      </p>
    </div>
  );
}

/* ───────── Main App ───────── */
export default function FlowerGarden() {
  const [screen, setScreen] = useState<"garden" | "draw">("garden");
  const [flowers, setFlowers] = useState<PlantedFlower[]>([]);
  const nextId = useRef(0);

  const handlePlant = (dataUrl: string, w: number, h: number) => {
    const newFlower: PlantedFlower = {
      dataUrl,
      x: 0.08 + Math.random() * 0.84,
      y: Math.random(),
      scale: Math.min(w, h) / 220,
      rotation: (Math.random() - 0.5) * 18,
      id: nextId.current++,
    };
    setFlowers((prev) => [...prev, newFlower]);
    setScreen("garden");
  };

  return (
    <main className="min-h-screen flex items-start justify-center" style={{
      background: "linear-gradient(180deg, #FFFEF5 0%, #FFF9F0 40%, #F0FFF0 100%)",
      paddingTop: "clamp(16px, 4vw, 40px)", paddingBottom: "32px",
    }}>
      {screen === "garden" ? (
        <GardenScene flowers={flowers} onDrawNew={() => setScreen("draw")} />
      ) : (
        <DrawingCanvas onPlant={handlePlant} onCancel={() => setScreen("garden")} />
      )}
    </main>
  );
}

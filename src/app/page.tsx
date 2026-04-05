"use client";

import { useState, useRef, useEffect, useCallback } from "react";

/* ───────── Color palette ───────── */
const PALETTE = [
  { color: "#D4654A", name: "terracotta" },
  { color: "#E88B3A", name: "amber" },
  { color: "#F5C542", name: "sunshine" },
  { color: "#A3CB38", name: "lime" },
  { color: "#2B6E1A", name: "forest" },
  { color: "#48DBFB", name: "sky" },
  { color: "#3D7BCC", name: "ocean" },
  { color: "#8B5CF6", name: "violet" },
  { color: "#EC4899", name: "rose" },
  { color: "#F472B6", name: "pink" },
  { color: "#92400E", name: "earth" },
  { color: "#2A2F2A", name: "charcoal" },
  { color: "#FFFFFF", name: "white" },
];

const BRUSH_SIZES = [
  { size: 3, label: "Fine" },
  { size: 8, label: "Med" },
  { size: 16, label: "Thick" },
  { size: 28, label: "Big" },
];

type PlantedFlower = {
  dataUrl: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  id: number;
  swayDelay: number;
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
  const [color, setColor] = useState("#D4654A");
  const [brushSize, setBrushSize] = useState(8);
  const [hasDrawn, setHasDrawn] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#FBF8F1";
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
    ctx.fillStyle = "#FBF8F1";
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
        if (!(data[i] >= 250 && data[i + 1] >= 246 && data[i + 2] >= 238)) {
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
      if (cd[i] >= 250 && cd[i + 1] >= 246 && cd[i + 2] >= 238) {
        cd[i + 3] = 0;
      }
    }
    tempCtx.putImageData(cropped, 0, 0);
    onPlant(tempCanvas.toDataURL("image/png"), cropW, cropH);
  };

  return (
    <div
      className="flex flex-col items-center w-full max-w-lg mx-auto px-4"
      style={{
        animation: "fadeInUp 0.4s cubic-bezier(0.25, 1, 0.5, 1) both",
        paddingTop: "clamp(16px, 3vw, 32px)",
        paddingBottom: "32px",
        gap: "var(--space-lg)",
      }}
    >
      <div className="text-center">
        <h2
          style={{
            fontFamily: "'Fredoka', sans-serif",
            color: "var(--deep-green)",
            fontSize: "var(--text-2xl)",
            fontWeight: 600,
            letterSpacing: "-0.01em",
            lineHeight: 1.1,
          }}
        >
          Draw your flower
        </h2>
        <p
          style={{
            color: "var(--ink-muted)",
            fontSize: "var(--text-sm)",
            marginTop: "var(--space-sm)",
            fontWeight: 500,
          }}
        >
          Use your finger or mouse — any shape goes
        </p>
      </div>

      {/* Canvas */}
      <div
        className="w-full rounded-2xl overflow-hidden"
        style={{
          border: "2px solid rgba(43, 110, 26, 0.15)",
          aspectRatio: "1",
          maxWidth: "400px",
          boxShadow: "0 4px 24px rgba(43, 110, 26, 0.06)",
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
      <div
        className="flex gap-1.5 flex-wrap justify-center rounded-xl"
        style={{
          padding: "10px 14px",
          background: "rgba(43, 110, 26, 0.04)",
          border: "1px solid rgba(43, 110, 26, 0.08)",
        }}
      >
        {PALETTE.map((c) => (
          <button
            key={c.color}
            onClick={() => setColor(c.color)}
            title={c.name}
            className="rounded-full"
            style={{
              width: "28px",
              height: "28px",
              backgroundColor: c.color,
              border: color === c.color ? "3px solid var(--ink)" : "2px solid rgba(0,0,0,0.06)",
              transform: color === c.color ? "scale(1.18)" : "scale(1)",
              transition: "transform 0.15s cubic-bezier(0.25, 1, 0.5, 1), border 0.15s ease",
              boxShadow: c.color === "#FFFFFF" ? "inset 0 0 0 1px rgba(0,0,0,0.1)" : "none",
              cursor: "pointer",
            }}
          />
        ))}
      </div>

      {/* Brush sizes */}
      <div className="flex gap-2 items-center">
        {BRUSH_SIZES.map((b) => (
          <button
            key={b.size}
            onClick={() => setBrushSize(b.size)}
            className="flex flex-col items-center gap-1 rounded-lg px-3 py-2"
            style={{
              background: brushSize === b.size ? "var(--deep-green)" : "rgba(43, 110, 26, 0.06)",
              border: brushSize === b.size ? "none" : "1px solid rgba(43, 110, 26, 0.1)",
              cursor: "pointer",
              transition: "all 0.15s cubic-bezier(0.25, 1, 0.5, 1)",
            }}
          >
            <div
              className="rounded-full"
              style={{
                width: `${b.size + 4}px`,
                height: `${b.size + 4}px`,
                backgroundColor: brushSize === b.size ? "#fff" : "var(--deep-green)",
              }}
            />
            <span
              style={{
                fontSize: "var(--text-xs)",
                color: brushSize === b.size ? "rgba(255,255,255,0.9)" : "var(--ink-muted)",
                fontWeight: 600,
              }}
            >
              {b.label}
            </span>
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3 w-full" style={{ maxWidth: "400px" }}>
        <button
          onClick={onCancel}
          className="btn-press"
          style={{
            flex: 1,
            padding: "12px 0",
            borderRadius: "12px",
            fontSize: "var(--text-base)",
            fontWeight: 600,
            border: "1.5px solid rgba(0,0,0,0.08)",
            background: "white",
            color: "var(--ink-soft)",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          Back
        </button>
        <button
          onClick={clearCanvas}
          className="btn-press"
          style={{
            flex: 1,
            padding: "12px 0",
            borderRadius: "12px",
            fontSize: "var(--text-base)",
            fontWeight: 600,
            border: "1.5px solid rgba(212, 101, 74, 0.2)",
            background: "var(--terracotta-light)",
            color: "var(--terracotta)",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          Clear
        </button>
        <button
          onClick={handlePlant}
          disabled={!hasDrawn}
          className="btn-press"
          style={{
            flex: 1.4,
            padding: "12px 0",
            borderRadius: "12px",
            fontSize: "var(--text-base)",
            fontWeight: 700,
            border: "none",
            background: hasDrawn ? "var(--deep-green)" : "#ddd",
            color: hasDrawn ? "white" : "#aaa",
            boxShadow: hasDrawn ? "0 4px 16px rgba(43, 110, 26, 0.25)" : "none",
            cursor: hasDrawn ? "pointer" : "default",
            transition: "all 0.2s cubic-bezier(0.25, 1, 0.5, 1)",
          }}
        >
          Plant it
        </button>
      </div>
    </div>
  );
}

/* ───────── Garden Scene ───────── */
function GardenScene({
  flowers,
  onDrawNew,
}: {
  flowers: PlantedFlower[];
  onDrawNew: () => void;
}) {
  return (
    <div
      className="flex flex-col items-center w-full max-w-3xl mx-auto px-4"
      style={{
        animation: "fadeInUp 0.5s cubic-bezier(0.25, 1, 0.5, 1) both",
        paddingTop: "clamp(16px, 4vw, 48px)",
        paddingBottom: "32px",
        gap: "var(--space-lg)",
      }}
    >
      {/* Title — big, bold, distinctive */}
      <div className="text-center">
        <h1
          style={{
            fontFamily: "'Fredoka', sans-serif",
            color: "var(--deep-green)",
            fontSize: "var(--text-hero)",
            lineHeight: 1,
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          Mansi&apos;s Flower Garden
        </h1>
        <p
          style={{
            marginTop: "var(--space-sm)",
            fontSize: "var(--text-base)",
            color: "var(--ink-muted)",
            fontWeight: 500,
          }}
        >
          {flowers.length === 0
            ? "No flowers yet — be the first to plant one"
            : `${flowers.length} flower${flowers.length === 1 ? "" : "s"} planted and growing`}
        </p>
      </div>

      {/* Garden viewport */}
      <div
        className="w-full rounded-2xl overflow-hidden relative"
        style={{
          height: "clamp(320px, 55vw, 500px)",
          border: "2px solid rgba(43, 110, 26, 0.2)",
          boxShadow: "0 8px 40px rgba(43, 110, 26, 0.08)",
          background:
            "linear-gradient(180deg, #7EC8E3 0%, #A8DDF0 30%, #6BBF4A 30%, #5AAE39 50%, #4A9E2E 70%, #3D8B24 100%)",
        }}
      >
        {/* Sun — warm, glowing */}
        <div
          className="absolute"
          style={{
            top: "14px",
            left: "22px",
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            background: "radial-gradient(circle, #F5C542 40%, #E8A925 100%)",
            boxShadow: "0 0 32px 10px rgba(245, 197, 66, 0.3)",
          }}
        />

        {/* Clouds */}
        {[
          { left: "18%", top: "5%", delay: "0s", s: 1 },
          { left: "50%", top: "3%", delay: "2.5s", s: 1.2 },
          { left: "78%", top: "8%", delay: "5s", s: 0.8 },
        ].map((c, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              left: c.left,
              top: c.top,
              width: `${65 * c.s}px`,
              height: `${22 * c.s}px`,
              borderRadius: "20px",
              background: "rgba(255,255,255,0.8)",
              boxShadow: `${16 * c.s}px -3px 0 3px rgba(255,255,255,0.7), ${-7 * c.s}px 0 0 2px rgba(255,255,255,0.6)`,
              animation: `drift ${7 + i * 2}s ease-in-out infinite`,
              animationDelay: c.delay,
            }}
          />
        ))}

        {/* Grass blades — subtle depth */}
        <svg
          className="absolute bottom-0 left-0 w-full pointer-events-none"
          style={{ height: "45px" }}
          preserveAspectRatio="none"
        >
          {Array.from({ length: 50 }, (_, i) => {
            const x = (i / 50) * 100;
            const h = 10 + ((i * 7 + 13) % 25);
            const sway = ((i * 3 + 5) % 9) - 4;
            return (
              <path
                key={i}
                d={`M ${x}% 100% Q ${x + sway}% ${100 - h}% ${x + sway / 2}% ${100 - h - 3}%`}
                stroke="#1E4D12"
                strokeWidth="1.5"
                fill="none"
                opacity={0.2 + ((i * 7) % 5) / 14}
              />
            );
          })}
        </svg>

        {/* Empty state */}
        {flowers.length === 0 && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ paddingBottom: "12%" }}
          >
            <p
              style={{
                fontFamily: "'Fredoka', sans-serif",
                color: "rgba(255,255,255,0.5)",
                fontSize: "var(--text-xl)",
                fontWeight: 500,
                textShadow: "0 1px 4px rgba(0,0,0,0.1)",
              }}
            >
              Your garden awaits...
            </p>
          </div>
        )}

        {/* Planted flowers */}
        {flowers.map((f) => {
          const depthFactor = f.y;
          const baseSize = Math.min(100, Math.max(45, 75 * f.scale));
          const finalSize = baseSize * (0.45 + depthFactor * 0.55);
          return (
            <div
              key={f.id}
              className="absolute"
              style={{
                left: `${f.x * 100}%`,
                top: `${30 + f.y * 52}%`,
                width: `${finalSize}px`,
                zIndex: Math.floor(f.y * 100),
                transform: "translateX(-50%)",
                animation: "flowerGrow 0.6s cubic-bezier(0.25, 1, 0.5, 1) both",
              }}
            >
              {/* Stem */}
              <div
                className="absolute rounded-sm"
                style={{
                  bottom: "-16px",
                  left: "50%",
                  width: "2.5px",
                  height: "20px",
                  background: "var(--forest)",
                  transform: "translateX(-50%)",
                  opacity: 0.5,
                }}
              />
              {/* Flower with gentle sway */}
              <div
                style={{
                  animation: `gentleSway ${3.5 + f.swayDelay}s ease-in-out infinite`,
                  animationDelay: `${f.swayDelay}s`,
                  transformOrigin: "bottom center",
                }}
              >
                <img
                  src={f.dataUrl}
                  alt="A hand-drawn flower"
                  draggable={false}
                  style={{
                    width: "100%",
                    height: "auto",
                    filter: `drop-shadow(1px 2px 3px rgba(0,0,0,0.1)) brightness(${0.9 + depthFactor * 0.1})`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Draw button — bold, single color, confident */}
      <button
        onClick={onDrawNew}
        className="btn-press"
        style={{
          fontFamily: "'Fredoka', sans-serif",
          fontSize: "var(--text-xl)",
          fontWeight: 600,
          padding: "16px 48px",
          borderRadius: "16px",
          border: "none",
          background: "var(--terracotta)",
          color: "white",
          cursor: "pointer",
          boxShadow: "0 6px 20px rgba(212, 101, 74, 0.25)",
          transition: "all 0.2s cubic-bezier(0.25, 1, 0.5, 1)",
          letterSpacing: "0.01em",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget;
          el.style.transform = "translateY(-2px) scale(1.02)";
          el.style.boxShadow = "0 8px 28px rgba(212, 101, 74, 0.35)";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget;
          el.style.transform = "translateY(0) scale(1)";
          el.style.boxShadow = "0 6px 20px rgba(212, 101, 74, 0.25)";
        }}
      >
        Draw a flower
      </button>

      <p
        style={{
          fontSize: "var(--text-xs)",
          color: "var(--ink-muted)",
          marginTop: "var(--space-sm)",
          opacity: 0.7,
        }}
      >
        a little experiment by{" "}
        <span style={{ color: "var(--terracotta)", fontWeight: 700 }}>
          Mansi&apos;s Musings
        </span>
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
      swayDelay: Math.random() * 2,
    };
    setFlowers((prev) => [...prev, newFlower]);
    setScreen("garden");
  };

  return (
    <main
      className="min-h-screen flex items-start justify-center"
      style={{
        background: "linear-gradient(180deg, var(--cream) 0%, var(--warm-white) 50%, #F0F7EC 100%)",
        paddingBottom: "32px",
      }}
    >
      {screen === "garden" ? (
        <GardenScene flowers={flowers} onDrawNew={() => setScreen("draw")} />
      ) : (
        <DrawingCanvas onPlant={handlePlant} onCancel={() => setScreen("garden")} />
      )}
    </main>
  );
}

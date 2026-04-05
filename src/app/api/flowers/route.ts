import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

export const runtime = "edge";

type StoredFlower = {
  id: string;
  dataUrl: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  swayDelay: number;
  plantedAt: number;
};

/* GET — return the most recent 80 flowers */
export async function GET() {
  try {
    const raw = await kv.lrange<string>("flowers", 0, 79);
    const flowers: StoredFlower[] = (raw || []).map((item) =>
      typeof item === "string" ? JSON.parse(item) : item
    );
    return NextResponse.json({ flowers });
  } catch (err) {
    console.error("GET /api/flowers error:", err);
    return NextResponse.json({ flowers: [] });
  }
}

/* POST — plant a new flower */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { dataUrl, x, y, scale, rotation, swayDelay } = body;

    if (!dataUrl || typeof x !== "number" || typeof y !== "number") {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Cap base64 size to ~200KB to prevent abuse
    if (dataUrl.length > 200_000) {
      return NextResponse.json({ error: "Image too large" }, { status: 413 });
    }

    const flower: StoredFlower = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      dataUrl,
      x,
      y,
      scale: scale ?? 1,
      rotation: rotation ?? 0,
      swayDelay: swayDelay ?? 0,
      plantedAt: Date.now(),
    };

    // Prepend so newest are first
    await kv.lpush("flowers", JSON.stringify(flower));

    // Keep garden from growing forever — trim to 200 flowers
    await kv.ltrim("flowers", 0, 199);

    return NextResponse.json({ success: true, flower });
  } catch (err) {
    console.error("POST /api/flowers error:", err);
    return NextResponse.json({ error: "Failed to plant" }, { status: 500 });
  }
}

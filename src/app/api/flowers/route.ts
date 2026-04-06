import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

/*
 * Connect to Upstash Redis.
 * Handles both "KV_" and "STORAGE_" env var prefixes —
 * Vercel's integration UI defaults to "STORAGE" but docs show "KV".
 */
function getRedis() {
  const url =
    process.env.KV_REST_API_URL ||
    process.env.STORAGE_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    "";
  const token =
    process.env.KV_REST_API_TOKEN ||
    process.env.STORAGE_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    "";

  if (!url || !token) {
    console.error("Missing Redis credentials. Available env vars:",
      Object.keys(process.env).filter(k =>
        k.includes("KV") || k.includes("STORAGE") || k.includes("UPSTASH") || k.includes("REDIS")
      )
    );
    return null;
  }

  return new Redis({ url, token });
}

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
    const redis = getRedis();
    if (!redis) {
      return NextResponse.json({ flowers: [], error: "no_redis" });
    }

    const raw = await redis.lrange<StoredFlower>("flowers", 0, 79);
    const flowers: StoredFlower[] = (raw || []).map((item) =>
      typeof item === "string" ? JSON.parse(item) : item
    );
    return NextResponse.json({ flowers });
  } catch (err) {
    console.error("GET /api/flowers error:", err);
    return NextResponse.json({ flowers: [], error: String(err) });
  }
}

/* POST — plant a new flower */
export async function POST(request: Request) {
  try {
    const redis = getRedis();
    if (!redis) {
      return NextResponse.json({ error: "Redis not configured" }, { status: 500 });
    }

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
    await redis.lpush("flowers", JSON.stringify(flower));

    // Keep garden from growing forever — trim to 200 flowers
    await redis.ltrim("flowers", 0, 199);

    return NextResponse.json({ success: true, flower });
  } catch (err) {
    console.error("POST /api/flowers error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

import { db } from "@/lib/db";

// Health check for Cloud Run probes and uptime monitoring.
// Intentionally unauthenticated: it exposes no data beyond up/down.
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok" });
  } catch (error) {
    console.error("Health check failed", error);
    return Response.json({ status: "error" }, { status: 503 });
  }
}

/**
 * GET /api/warmup
 *
 * A lightweight server-side probe that pings the Render backend /health
 * endpoint. Called from the login page on mount so the backend starts
 * warming up before the user finishes watching the intro video and types
 * their credentials.
 *
 * This is purely a fire-and-forget keep-alive — it never returns sensitive
 * data and has a 10-second timeout so it never blocks the response.
 */
import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET() {
  const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const res = await fetch(`${backendUrl}/health`, {
      signal: controller.signal,
      cache: 'no-store',
    }).finally(() => clearTimeout(timeout));

    return NextResponse.json({ status: res.status, alive: res.ok });
  } catch {
    // Ignore — warmup is best-effort
    return NextResponse.json({ status: 0, alive: false });
  }
}

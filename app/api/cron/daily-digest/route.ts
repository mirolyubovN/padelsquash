import { runDailyDigest } from "@/src/lib/notifications/daily-digest";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { force?: boolean } | null;
  const result = await runDailyDigest(new Date(), { force: body?.force === true });
  return Response.json({ ok: true, result });
}

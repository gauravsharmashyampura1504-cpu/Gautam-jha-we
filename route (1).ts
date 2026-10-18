import { Redis } from "@upstash/redis";

export const runtime = "nodejs";
const redis = Redis.fromEnv();

export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const suppliedSecret = request.headers.get("x-telegram-bot-api-secret-token");

  if (!secret || suppliedSecret !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  let update: any;
  try {
    update = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const joinRequest = update?.chat_join_request;
  if (!joinRequest || !Number.isInteger(update?.update_id)) {
    return Response.json({ ok: true, ignored: true });
  }

  if (String(joinRequest.chat?.id) !== String(process.env.TELEGRAM_CHAT_ID)) {
    return Response.json({ ok: true, ignored: true });
  }

  const inviteUrl = joinRequest.invite_link?.invite_link;
  if (!inviteUrl) {
    // Telegram requests without an invite link cannot be tied to a landing-page click.
    return Response.json({ ok: true, attributed: false });
  }

  const raw = await redis.get<string>(`invite:${inviteUrl}`);
  if (!raw) {
    return Response.json({ ok: true, attributed: false });
  }

  const attribution = typeof raw === "string" ? JSON.parse(raw) : raw;
  const eventId = `tg_join_request_${update.update_id}`;
  const eventTime = Number(joinRequest.date) || Math.floor(Date.now() / 1000);

  // Durable idempotency: record the job before attempting Meta delivery.
  const queued = await redis.set(
    `join-event:${eventId}`,
    JSON.stringify({ eventId, eventTime, attribution, status: "pending" }),
    { nx: true, ex: 60 * 60 * 24 * 30 }
  );

  if (!queued) {
    return Response.json({ ok: true, duplicate: true });
  }

  const siteUrl = process.env.SITE_URL;
  if (!siteUrl) return new Response("Missing site URL", { status: 500 });

  const result = await fetch(`${siteUrl}/api/meta-join-request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-webhook-secret": secret
    },
    body: JSON.stringify({ eventId, eventTime, attribution }),
    cache: "no-store"
  });

  if (!result.ok) {
    // Remove the idempotency key so a Telegram retry can try again.
    await redis.del(`join-event:${eventId}`);
    return new Response("Meta forwarding failed", { status: 500 });
  }

  await redis.set(`join-event:${eventId}`, JSON.stringify({
    eventId, eventTime, attribution, status: "sent"
  }), { ex: 60 * 60 * 24 * 30 });

  return Response.json({ ok: true, attributed: true });
}

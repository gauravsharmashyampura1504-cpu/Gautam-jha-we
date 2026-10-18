import { Redis } from "@upstash/redis";

export const runtime = "nodejs";
const redis = Redis.fromEnv();

export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || request.headers.get("x-internal-webhook-secret") !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const eventId = String(body?.eventId || "");
  const eventTime = Number(body?.eventTime);
  if (!/^tg_join_request_\d+$/.test(eventId) || !Number.isFinite(eventTime)) {
    return new Response("Invalid event", { status: 400 });
  }

  const alreadySent = await redis.get(`meta-sent:${eventId}`);
  if (alreadySent) return Response.json({ ok: true, duplicate: true });

  const pixelId = process.env.META_PIXEL_ID;
  const token = process.env.META_CAPI_TOKEN;
  const version = process.env.META_GRAPH_VERSION;

  if (!pixelId || !token || !version || version.includes("X")) {
    return Response.json({ error: "Meta CAPI environment variables incomplete" }, { status: 500 });
  }

  const attribution = body.attribution || {};
  const userData: Record<string, string> = {};
  if (typeof attribution.fbp === "string" && attribution.fbp.startsWith("fb.")) userData.fbp = attribution.fbp;
  if (typeof attribution.fbc === "string" && attribution.fbc.startsWith("fb.")) userData.fbc = attribution.fbc;

  // fbclid by itself is not sent as a CAPI user_data field; _fbc is preferred.
  const payload = {
    data: [{
      event_name: "JoinRequest",
      event_time: Math.floor(eventTime),
      event_id: eventId,
      action_source: "other",
      user_data: userData,
      custom_data: {
        content_name: "Stock Learners Telegram Join Request",
        campaign: typeof attribution.utmCampaign === "string" ? attribution.utmCampaign.slice(0, 200) : ""
      }
    }]
  };

  const response = await fetch(
    `https://graph.facebook.com/${version}/${pixelId}/events?access_token=${encodeURIComponent(token)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store"
    }
  );

  const result = await response.json();
  if (!response.ok || result?.error || Number(result?.events_received) < 1) {
    console.error("Meta CAPI rejected event", result?.error?.message || response.status);
    return new Response("Meta event failed", { status: 502 });
  }

  await redis.set(`meta-sent:${eventId}`, "1", { nx: true, ex: 60 * 60 * 24 * 30 });
  return Response.json({ ok: true, events_received: result.events_received });
}

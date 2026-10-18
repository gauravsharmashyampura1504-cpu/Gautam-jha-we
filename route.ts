import { Redis } from "@upstash/redis";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";
const redis = Redis.fromEnv();

function safeString(value: unknown, max = 200): string | null {
  return typeof value === "string" && value.length > 0 ? value.slice(0, max) : null;
}

export async function POST(request: Request) {
  try {
    const siteUrl = process.env.SITE_URL;
    const origin = request.headers.get("origin");
    if (!siteUrl || !origin || new URL(origin).origin !== new URL(siteUrl).origin) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!botToken || !chatId) {
      return Response.json({ error: "Server configuration incomplete" }, { status: 500 });
    }

    const requestId = randomUUID();
    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/createChatInviteLink`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          creates_join_request: true,
          name: `sl-${requestId.slice(0, 12)}`
        }),
        cache: "no-store"
      }
    );
    const telegramData = await telegramResponse.json();

    if (!telegramResponse.ok || !telegramData.ok || !telegramData.result?.invite_link) {
      console.error("Telegram invite creation failed", telegramData?.description || telegramResponse.status);
      return Response.json({ error: "Invite creation failed" }, { status: 502 });
    }

    const inviteUrl: string = telegramData.result.invite_link;
    const attribution = {
      requestId,
      fbp: safeString(body.fbp, 300),
      fbc: safeString(body.fbc, 300),
      fbclid: safeString(body.fbclid, 500),
      utmSource: safeString(body.utm_source, 100),
      utmCampaign: safeString(body.utm_campaign, 200),
      createdAt: Math.floor(Date.now() / 1000)
    };

    await redis.set(`invite:${inviteUrl}`, JSON.stringify(attribution), { ex: 60 * 60 * 24 * 30 });
    return Response.json({ inviteUrl });
  } catch (error) {
    console.error("Invite endpoint error", error instanceof Error ? error.message : "unknown");
    return Response.json({ error: "Could not create invite link" }, { status: 500 });
  }
}


import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { createHmac, timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!botToken || !webhookSecret || !redisUrl || !redisToken) {
      return NextResponse.json({ error: "Server configuration missing" }, { status: 500 });
    }

    const receivedSecret = request.headers.get("x-telegram-bot-api-secret-token") || "";

    const a = Buffer.from(receivedSecret);
    const b = Buffer.from(webhookSecret);

    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const update = await request.json();
    const joinRequest = update.chat_join_request;

    if (!joinRequest) {
      return NextResponse.json({ ok: true });
    }

    const chatId = String(joinRequest.chat?.id ?? "");
    const userId = String(joinRequest.from?.id ?? "");
    const inviteUrl = joinRequest.invite_link?.invite_link;

    if (!chatId || !userId || !inviteUrl) {
      return NextResponse.json({ ok: true });
    }

    const redis = new Redis({ url: redisUrl, token: redisToken });
    const inviteHash = inviteUrl.split("+").pop();

    if (!inviteHash) {
      return NextResponse.json({ ok: true });
    }

    const raw = await redis.get<string>(`invite:${inviteHash}`);

    if (!raw) {
      return NextResponse.json({ ok: true });
    }

    const attribution = typeof raw === "string" ? JSON.parse(raw) : raw;
    const eventId = `join_request_${chatId}_${userId}`;

    await redis.set(
      `event:${eventId}`,
      JSON.stringify({ chatId, userId, receivedAt: new Date().toISOString() }),
      { nx: true, ex: 60 * 60 * 24 * 90 }
    );

    const metaToken = process.env.META_CAPI_ACCESS_TOKEN;
    const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID || "1757564198848437";
    const graphVersion = process.env.META_GRAPH_API_VERSION;

    if (metaToken && graphVersion) {
      const event = {
        data: [
          {
            event_name: "JoinRequest",
            event_time: Math.floor(Date.now() / 1000),
            event_id: eventId,
            action_source: "website",
            event_source_url: process.env.SITE_URL || "",
            user_data: {
              client_ip_address: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
              client_user_agent: request.headers.get("user-agent") || undefined,
              fbp: attribution.fbp || undefined,
              fbc: attribution.fbc || undefined,
            },
            custom_data: {
              channel_id: chatId,
              source: attribution.utm_source || "website",
            },
          },
        ],
      };

      const signature = createHmac("sha256", metaToken).update("").digest("hex");

      const metaResponse = await fetch(
        `https://graph.facebook.com/${graphVersion}/${pixelId}/events?access_token=${encodeURIComponent(metaToken)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(event),
        }
      );

      if (!metaResponse.ok) {
        console.error("Meta CAPI event failed", await metaResponse.text());
      }

      void signature;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
  

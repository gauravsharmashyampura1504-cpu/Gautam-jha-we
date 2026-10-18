
import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { createHash, timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";

const redis = Redis.fromEnv();

type TelegramJoinRequest = {
  invite_link?: {
    invite_link?: string;
  };
  from?: {
    id?: number;
  };
  chat?: {
    id?: number;
  };
  date?: number;
};

type TelegramUpdate = {
  chat_join_request?: TelegramJoinRequest;
};

type Attribution = {
  fbp?: string;
  fbc?: string;
};

type MetaResponse = {
  events_received?: number;
  error?: {
    message?: string;
  };
};

function safeEqual(a: string, b: string): boolean {
  const first = Buffer.from(a);
  const second = Buffer.from(b);

  return (
    first.length === second.length &&
    timingSafeEqual(first, second)
  );
}

export async function POST(request: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const suppliedSecret =
    request.headers.get("x-telegram-bot-api-secret-token") ?? "";

  if (!secret || !safeEqual(secret, suppliedSecret)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  const apiVersion =
    process.env.META_GRAPH_API_VERSION || "v22.0";

  if (!botToken || !pixelId || !accessToken) {
    return NextResponse.json(
      { error: "Server configuration missing" },
      { status: 500 }
    );
  }

  let update: TelegramUpdate;

  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400 }
    );
  }

  const joinRequest = update.chat_join_request;

  if (!joinRequest) {
    return NextResponse.json({ ok: true });
  }

  const inviteUrl = joinRequest.invite_link?.invite_link;
  const inviteHash =
    typeof inviteUrl === "string"
      ? inviteUrl.split("+").pop()
      : null;

  if (!inviteHash) {
    return NextResponse.json({
      ok: true,
      skipped: "No tracked invite",
    });
  }

  const attribution = await redis.get<Attribution>(
    `invite:${inviteHash}`
  );

  if (!attribution) {
    return NextResponse.json({
      ok: true,
      skipped: "No attribution",
    });
  }

  const userId = String(joinRequest.from?.id ?? "");
  const chatId = String(joinRequest.chat?.id ?? "");
  const requestDate = Number(joinRequest.date ?? 0);

  if (!userId || !chatId || !requestDate) {
    return NextResponse.json(
      { error: "Incomplete join request" },
      { status: 400 }
    );
  }

  const eventId = createHash("sha256")
    .update(
      `${chatId}:${userId}:${requestDate}:${inviteHash}`
    )
    .digest("hex");

  const lockKey = `meta-event:${eventId}`;

  const lock = await redis.set(lockKey, "processing", {
    nx: true,
    ex: 300,
  });

  if (lock !== "OK") {
    return NextResponse.json({
      ok: true,
      duplicate: true,
    });
  }

  const userData: Record<string, string> = {};

  if (attribution.fbp) {
    userData.fbp = attribution.fbp;
  }

  if (attribution.fbc) {
    userData.fbc = attribution.fbc;
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${apiVersion}/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: [
            {
              event_name: "Subscribe",
              event_time: requestDate,
              event_id: eventId,
              action_source: "other",
              user_data: userData,
              custom_data: {
                channel: "Stock Learners",
                conversion_type: "telegram_join_request",
              },
            },
          ],
        }),
      }
    );

    const result =
      (await response.json()) as MetaResponse;

    if (
      !response.ok ||
      Number(result.events_received ?? 0) < 1
    ) {
      await redis.del(lockKey);

      console.error("Meta CAPI error:", result);

      return NextResponse.json(
        { error: "Meta event was not accepted" },
        { status: 502 }
      );
    }

    await redis.set(lockKey, "sent", {
      ex: 60 * 60 * 24 * 30,
    });

    return NextResponse.json({
      ok: true,
      events_received: result.events_received,
    });
  } catch (error) {
    await redis.del(lockKey);

    console.error("Meta CAPI request failed:", error);

    return NextResponse.json(
      { error: "Event delivery failed" },
      { status: 502 }
    );
  }
}


import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const runtime = "nodejs";
export const preferredRegion = "bom1";

type InviteRequestBody = {
  mode?: "prepare" | "track";
  inviteUrl?: string;
  fbp?: string | null;
  fbc?: string | null;
  fbclid?: string | null;
  utm_source?: string | null;
  utm_campaign?: string | null;
  consent?: boolean;
};

export async function POST(request: Request) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!botToken || !chatId || !redisUrl || !redisToken) {
      console.error("Invite API: Missing environment variables");

      return NextResponse.json(
        { error: "Server configuration missing" },
        { status: 500 }
      );
    }

    let body: InviteRequestBody;

    try {
      body = (await request.json()) as InviteRequestBody;
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });

    // Save attribution only after an explicit tracking opt-in.
    if (body.mode === "track") {
      if (body.consent !== true || !body.inviteUrl) {
        return NextResponse.json(
          { error: "Tracking consent or invite missing" },
          { status: 400 }
        );
      }

      let parsed: URL;

      try {
        parsed = new URL(body.inviteUrl);
      } catch {
        return NextResponse.json(
          { error: "Invalid invite URL" },
          { status: 400 }
        );
      }

      if (
        parsed.protocol !== "https:" ||
        parsed.hostname !== "t.me" ||
        !parsed.pathname.startsWith("/+")
      ) {
        return NextResponse.json(
          { error: "Invalid Telegram invite URL" },
          { status: 400 }
        );
      }

      const inviteHash = parsed.pathname.slice(2);

      if (!inviteHash || inviteHash.includes("/")) {
        return NextResponse.json(
          { error: "Invalid invite reference" },
          { status: 400 }
        );
      }

      await redis.set(
        `invite:${inviteHash}`,
        {
          fbp: body.fbp ?? null,
          fbc: body.fbc ?? null,
          fbclid: body.fbclid ?? null,
          utm_source: body.utm_source ?? null,
          utm_campaign: body.utm_campaign ?? null,
          consent: true,
          createdAt: new Date().toISOString(),
        },
        { ex: 60 * 60 * 24 * 30 }
      );

      return NextResponse.json({ ok: true });
    }

    if (body.mode !== "prepare") {
      return NextResponse.json(
        { error: "Invalid request mode" },
        { status: 400 }
      );
    }

    // Prepare a unique join-request invite before the button is tapped.
    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/createChatInviteLink`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          creates_join_request: true,
        }),
        cache: "no-store",
      }
    );

    const telegramData = await telegramResponse.json();

    if (
      !telegramResponse.ok ||
      !telegramData.ok ||
      !telegramData.result?.invite_link
    ) {
      console.error("Telegram invite creation failed:", {
        status: telegramResponse.status,
        description: telegramData.description,
      });

      return NextResponse.json(
        { error: "Telegram invite creation failed" },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { inviteUrl: telegramData.result.invite_link },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Invite API failed:", error);

    return NextResponse.json(
      { error: "Could not process invite" },
      { status: 500 }
    );
  }
}

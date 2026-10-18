
import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const runtime = "nodejs";

type InviteRequestBody = {
  fbp?: string | null;
  fbc?: string | null;
  fbclid?: string | null;
  utm_source?: string | null;
  utm_campaign?: string | null;
  consent?: string;
};

export async function POST(request: Request) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!botToken || !chatId || !redisUrl || !redisToken) {
      console.error("Invite API: Required environment variable missing");

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

    const inviteResponse = await fetch(
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

    const inviteData = await inviteResponse.json();

    if (
      !inviteResponse.ok ||
      !inviteData.ok ||
      !inviteData.result?.invite_link
    ) {
      console.error("Telegram invite creation failed:", {
        status: inviteResponse.status,
        description: inviteData.description,
        error_code: inviteData.error_code,
      });

      return NextResponse.json(
        { error: "Telegram invite creation failed" },
        { status: 502 }
      );
    }

    const inviteUrl: string = inviteData.result.invite_link;
    const inviteHash = inviteUrl.split("+").pop();

    if (!inviteHash) {
      return NextResponse.json(
        { error: "Invite reference missing" },
        { status: 500 }
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
        createdAt: new Date().toISOString(),
      },
      { ex: 60 * 60 * 24 * 30 }
    );

    return NextResponse.json({ inviteUrl });
  } catch (error) {
    console.error("Invite API failed:", error);

    return NextResponse.json(
      { error: "Could not create invite link" },
      { status: 500 }
    );
  }
}

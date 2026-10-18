
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const html = `<!doctype html>
<html>
<head><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Webhook Setup</title></head>
<body style="font-family:Arial;max-width:420px;margin:40px auto;padding:16px">
<h2>Telegram Webhook Setup</h2>
<form method="POST">
<label>Setup key</label><br>
<input name="setupKey" type="password" required
style="width:100%;padding:12px;margin:12px 0;box-sizing:border-box">
<button style="padding:12px 18px">Set webhook</button>
</form></body></html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: NextRequest) {
  const setupKey = process.env.WEBHOOK_SETUP_KEY;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!setupKey || !botToken || !webhookSecret) {
    return NextResponse.json(
      { error: "Required environment variables missing" },
      { status: 500 }
    );
  }

  const form = await request.formData();
  const submittedKey = form.get("setupKey");

  if (
    typeof submittedKey !== "string" ||
    submittedKey.length !== setupKey.length ||
    submittedKey !== setupKey
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/setWebhook`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: "https://gautam-jha-we.vercel.app/api/telegram",
          secret_token: webhookSecret,
          allowed_updates: ["chat_join_request"],
        }),
        cache: "no-store",
      }
    );

    const result = await response.json();

    if (!response.ok || result.ok !== true) {
      console.error("Telegram webhook setup failed:", result);
      return NextResponse.json(
        { error: "Telegram rejected webhook setup" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Telegram webhook successfully configured",
    });
  } catch {
    return NextResponse.json(
      { error: "Could not contact Telegram API" },
      { status: 502 }
    );
  }
}

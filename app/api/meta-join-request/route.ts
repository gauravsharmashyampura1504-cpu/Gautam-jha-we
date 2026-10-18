
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Join requests are verified by the Telegram webhook. This endpoint does not record or send a conversion."
    },
    { status: 501 }
  );
}

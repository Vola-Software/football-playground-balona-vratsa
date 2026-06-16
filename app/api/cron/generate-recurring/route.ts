import { NextRequest, NextResponse } from "next/server";
import { generateUpcomingOccurrences } from "@/lib/recurring";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Неоторизиран достъп" }, { status: 401 });
  }

  try {
    const result = await generateUpcomingOccurrences();
    console.log("[cron/generate-recurring]", result);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/generate-recurring]", err);
    return NextResponse.json({ error: "Вътрешна грешка на сървъра" }, { status: 500 });
  }
}

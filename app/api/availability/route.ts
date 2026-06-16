import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { getSlotGrid } from "@/lib/availability";

const TZ = "Europe/Sofia";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const date = searchParams.get("date");

  const dateStr =
    date ?? format(toZonedTime(new Date(), TZ), "yyyy-MM-dd");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return NextResponse.json({ error: "Невалидна дата" }, { status: 400 });
  }

  try {
    const data = await getSlotGrid(dateStr);
    return NextResponse.json(data, {
      headers: {
        // Cache for 60 seconds; revalidate in background
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
      },
    });
  } catch (err) {
    console.error("[availability]", err);
    return NextResponse.json(
      { error: "Грешка при зареждане на наличността" },
      { status: 500 }
    );
  }
}

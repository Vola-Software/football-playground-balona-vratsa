import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createRecurringSeries, RecurringError } from "@/lib/recurring";
import { createRecurringSeriesSchema } from "@/lib/validation";
import { requireAdminApi } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  const auth = await requireAdminApi(req);
  if (!auth.ok) return auth.response;

  const series = await prisma.recurringBooking.findMany({
    include: {
      field: { select: { id: true, name: true } },
      user: { select: { id: true, email: true, phone: true, firstName: true, lastName: true } },
      generatedBookings: {
        where: { status: { in: ["PENDING", "CONFIRMED"] } },
        select: { id: true, date: true, startTime: true, status: true, teamAName: true, teamBName: true, isRecurrenceOverride: true },
        orderBy: { startTime: "asc" },
        take: 50,
      },
    },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(series);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminApi(req);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Невалиден формат" }, { status: 400 });
  }

  const parsed = createRecurringSeriesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Невалидни данни", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { targetUserId, guestName, guestPhone, ...rest } = parsed.data;

  let resolvedUserId: string | undefined;
  let resolvedGuestName: string | undefined;
  let resolvedGuestPhone: string | undefined;

  if (guestName && guestPhone) {
    resolvedGuestName = guestName;
    resolvedGuestPhone = guestPhone;
  } else if (targetUserId) {
    resolvedUserId = targetUserId;
  }

  try {
    const result = await createRecurringSeries({
      ...rest,
      userId: resolvedUserId,
      guestName: resolvedGuestName,
      guestPhone: resolvedGuestPhone,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof RecurringError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("[POST /api/recurring]", err);
    return NextResponse.json({ error: "Вътрешна грешка на сървъра" }, { status: 500 });
  }
}

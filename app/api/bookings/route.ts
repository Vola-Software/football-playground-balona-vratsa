import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createBooking, BookingError } from "@/lib/bookings";
import { createBookingSchema } from "@/lib/validation";
import { requireAuthApi } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  const auth = await requireAuthApi();
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status");

  const bookings = await prisma.booking.findMany({
    where: {
      ...(user.role === "ADMIN" ? {} : { userId: user.id }),
      ...(status ? { status: status as never } : {}),
    },
    include: {
      field: { select: { id: true, name: true } },
      ...(user.role === "ADMIN"
        ? { user: { select: { id: true, email: true, phone: true, teamName: true } } }
        : {}),
    },
    orderBy: { startTime: "asc" },
    take: 200,
  });

  return NextResponse.json(bookings);
}

export async function POST(req: NextRequest) {
  const auth = await requireAuthApi();
  if (!auth.ok) return auth.response;
  const { user } = auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Невалиден формат" }, { status: 400 });
  }

  const parsed = createBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Невалидни данни", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const { targetUserId, guestName, guestPhone, ...bookingFields } = parsed.data;

    // Admin can book on behalf of a registered user or as a guest
    let resolvedUserId: string | undefined = user.id;
    let resolvedGuestName: string | undefined;
    let resolvedGuestPhone: string | undefined;
    let resolvedCanBookDirectly = user.canBookDirectly;

    if (user.role === "ADMIN") {
      if (guestName && guestPhone) {
        resolvedUserId = undefined;
        resolvedGuestName = guestName;
        resolvedGuestPhone = guestPhone;
      } else if (targetUserId) {
        resolvedUserId = targetUserId;
        // Fetch that user's canBookDirectly (admin booking overrides anyway)
        resolvedCanBookDirectly = true;
      }
    }

    const result = await createBooking({
      ...bookingFields,
      userId: resolvedUserId,
      guestName: resolvedGuestName,
      guestPhone: resolvedGuestPhone,
      canBookDirectly: resolvedCanBookDirectly,
      isAdmin: user.role === "ADMIN",
    });
    return NextResponse.json(
      { booking: result.booking, status: result.status },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof BookingError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("[POST /api/bookings]", err);
    return NextResponse.json({ error: "Вътрешна грешка на сървъра" }, { status: 500 });
  }
}

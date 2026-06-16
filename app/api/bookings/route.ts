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
    const result = await createBooking({
      ...parsed.data,
      userId: user.id,
      canBookDirectly: user.canBookDirectly,
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

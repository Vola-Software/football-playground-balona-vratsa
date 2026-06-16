import { NextRequest, NextResponse } from "next/server";
import { rejectBooking, BookingError } from "@/lib/bookings";
import { rejectBookingSchema } from "@/lib/validation";
import { requireAdminApi } from "@/lib/auth-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminApi(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Невалиден формат" }, { status: 400 });
  }

  const parsed = rejectBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Причината е задължителна" },
      { status: 400 }
    );
  }

  try {
    const booking = await rejectBooking(id, auth.user.id, parsed.data.reason);
    return NextResponse.json(booking);
  } catch (err) {
    if (err instanceof BookingError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("[reject]", err);
    return NextResponse.json({ error: "Вътрешна грешка" }, { status: 500 });
  }
}

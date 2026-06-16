import { NextRequest, NextResponse } from "next/server";
import { approveBooking, BookingError } from "@/lib/bookings";
import { requireAdminApi } from "@/lib/auth-helpers";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminApi(_req);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const booking = await approveBooking(id, auth.user.id);
    return NextResponse.json(booking);
  } catch (err) {
    if (err instanceof BookingError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("[approve]", err);
    return NextResponse.json({ error: "Вътрешна грешка" }, { status: 500 });
  }
}

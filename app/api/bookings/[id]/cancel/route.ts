import { NextRequest, NextResponse } from "next/server";
import { cancelBooking, BookingError } from "@/lib/bookings";
import { requireAdminApi } from "@/lib/auth-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminApi(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const booking = await cancelBooking(id, auth.user.id);
    return NextResponse.json(booking);
  } catch (err) {
    if (err instanceof BookingError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("[cancel]", err);
    return NextResponse.json({ error: "Вътрешна грешка" }, { status: 500 });
  }
}

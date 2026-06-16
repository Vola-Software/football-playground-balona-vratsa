import { NextRequest, NextResponse } from "next/server";
import { updateOccurrence, RecurringError } from "@/lib/recurring";
import { updateOccurrenceSchema } from "@/lib/validation";
import { requireAdminApi } from "@/lib/auth-helpers";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; bookingId: string }> }
) {
  const auth = await requireAdminApi(req);
  if (!auth.ok) return auth.response;

  const { id, bookingId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Невалиден формат" }, { status: 400 });
  }

  const parsed = updateOccurrenceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Невалидни данни", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const booking = await updateOccurrence(bookingId, id, parsed.data.action, {
      teamAName: parsed.data.teamAName,
      teamBName: parsed.data.teamBName,
    });
    return NextResponse.json(booking);
  } catch (err) {
    if (err instanceof RecurringError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("[PATCH /api/recurring/[id]/occurrences/[bookingId]]", err);
    return NextResponse.json({ error: "Вътрешна грешка на сървъра" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { updateRecurringSeries, RecurringError } from "@/lib/recurring";
import { updateRecurringSeriesSchema } from "@/lib/validation";
import { requireAdminApi } from "@/lib/auth-helpers";

export async function PATCH(
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

  const parsed = updateRecurringSeriesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Невалидни данни", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const series = await updateRecurringSeries(id, parsed.data);
    return NextResponse.json(series);
  } catch (err) {
    if (err instanceof RecurringError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("[PATCH /api/recurring/[id]]", err);
    return NextResponse.json({ error: "Вътрешна грешка на сървъра" }, { status: 500 });
  }
}

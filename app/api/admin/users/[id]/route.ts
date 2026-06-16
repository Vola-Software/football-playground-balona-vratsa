import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth-helpers";
import { z } from "zod";

const patchSchema = z.object({
  canBookDirectly: z.boolean().optional(),
  isActive: z.boolean().optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
});

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

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Невалидни данни" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!target) {
    return NextResponse.json({ error: "Потребителят не е намерен" }, { status: 404 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: parsed.data,
    select: {
      id: true,
      email: true,
      phone: true,
      teamName: true,
      role: true,
      canBookDirectly: true,
      isActive: true,
    },
  });

  return NextResponse.json(updated);
}

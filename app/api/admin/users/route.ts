import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  const auth = await requireAdminApi(req);
  if (!auth.ok) return auth.response;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      phone: true,
      firstName: true,
      lastName: true,
      username: true,
      teamName: true,
      role: true,
      canBookDirectly: true,
      isActive: true,
      createdAt: true,
      _count: { select: { bookings: true } },
    },
  });

  return NextResponse.json(users);
}

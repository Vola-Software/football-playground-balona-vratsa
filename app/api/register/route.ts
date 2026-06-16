import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Невалиден формат на заявката" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Невалидни данни", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { firstName, lastName, email, password, phone, username, teamName } = parsed.data;

  const normalizedUsername = username || null;

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { email },
        { phone },
        ...(normalizedUsername ? [{ username: normalizedUsername }] : []),
      ],
    },
    select: { email: true, phone: true, username: true },
  });

  if (existing) {
    if (existing.email === email) {
      return NextResponse.json(
        { error: "Имейл адресът вече е регистриран." },
        { status: 409 }
      );
    }
    if (existing.phone === phone) {
      return NextResponse.json(
        { error: "Телефонният номер вече е регистриран." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Псевдонимът вече е зает." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      passwordHash,
      phone,
      username: normalizedUsername,
      teamName: teamName || null,
    },
    select: { id: true, email: true },
  });

  return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
}

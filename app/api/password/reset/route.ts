import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { CODE_RE, MAX_ATTEMPTS, verifyCode } from "@/lib/codes";

const schema = z.object({
  email: z.email(),
  code: z.string().regex(CODE_RE),
  password: z.string().min(8).max(200),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "badCode" }, { status: 400 });

  const email = parsed.data.email.toLowerCase();
  const reset = await prisma.passwordReset.findFirst({
    where: { email, usedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!reset || reset.expiresAt < new Date()) {
    return NextResponse.json({ error: "expired" }, { status: 400 });
  }
  if (reset.attempts >= MAX_ATTEMPTS) {
    await prisma.passwordReset.delete({ where: { id: reset.id } });
    return NextResponse.json({ error: "expired" }, { status: 400 });
  }

  if (!(await verifyCode(parsed.data.code, reset.codeHash))) {
    await prisma.passwordReset.update({
      where: { id: reset.id },
      data: { attempts: { increment: 1 } },
    });
    return NextResponse.json({ error: "badCode" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  await prisma.$transaction([
    prisma.user.update({ where: { email }, data: { passwordHash } }),
    // Burn the code as it is spent, and drop any others for this address.
    prisma.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
    prisma.passwordReset.deleteMany({ where: { email, usedAt: null } }),
  ]);

  return NextResponse.json({ ok: true });
}

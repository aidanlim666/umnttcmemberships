import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { CODE_RE, MAX_ATTEMPTS, verifyCode } from "@/lib/codes";
import { appendAccount } from "@/lib/sheets";

const schema = z.object({ email: z.email(), code: z.string().regex(CODE_RE) });

/**
 * Step two of signup: the code proves the address is theirs, so now the account exists.
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "badCode" }, { status: 400 });

  const email = parsed.data.email.toLowerCase();
  const pending = await prisma.pendingSignup.findUnique({ where: { email } });

  if (!pending || pending.expiresAt < new Date()) {
    return NextResponse.json({ error: "expired" }, { status: 400 });
  }
  // Without a ceiling, six digits is only a million guesses away from being brute-forced.
  if (pending.attempts >= MAX_ATTEMPTS) {
    await prisma.pendingSignup.delete({ where: { email } });
    return NextResponse.json({ error: "expired" }, { status: 400 });
  }

  if (!(await verifyCode(parsed.data.code, pending.codeHash))) {
    await prisma.pendingSignup.update({
      where: { email },
      data: { attempts: { increment: 1 } },
    });
    return NextResponse.json({ error: "badCode" }, { status: 400 });
  }

  // One transaction: the pending record is consumed exactly as the account appears.
  let created = false;
  await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { email } });
    if (existing) {
      // Someone who signed in with Google first is adding a password.
      await tx.user.update({
        where: { id: existing.id },
        data: {
          passwordHash: pending.passwordHash,
          name: existing.name ?? pending.name,
          emailVerified: existing.emailVerified ?? new Date(),
        },
      });
    } else {
      await tx.user.create({
        data: {
          email,
          name: pending.name,
          passwordHash: pending.passwordHash,
          emailVerified: new Date(),
        },
      });
      created = true;
    }
    await tx.pendingSignup.delete({ where: { email } });
  });

  // Outside the transaction, and only for a genuinely new account — someone adding a
  // password to an existing Google account is not a new member.
  if (created) {
    await appendAccount({
      createdAt: new Date(),
      name: pending.name,
      email,
      method: "Password",
    });
  }

  return NextResponse.json({ ok: true });
}

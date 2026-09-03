import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { codeEmail, sendMail } from "@/lib/mail";
import { CODE_TTL_MINUTES, codeExpiry, generateCode, hashCode } from "@/lib/codes";

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.email(),
  password: z.string().min(8).max(200),
  lang: z.enum(["en", "zh"]).optional(),
});

/**
 * Step one of signup: hold the details, email a code, create nothing yet.
 *
 * The User row is only written once the code comes back (see ./verify), so an address
 * nobody controls can never end up on the club roster.
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "badRequest" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const zh = parsed.data.lang === "zh";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing?.passwordHash) {
    return NextResponse.json({ error: "exists" }, { status: 409 });
  }

  const code = generateCode();
  const [passwordHash, codeHash] = await Promise.all([
    bcrypt.hash(parsed.data.password, 12),
    hashCode(code),
  ]);

  // Starting again replaces any earlier attempt, which also resets the attempt counter.
  await prisma.pendingSignup.upsert({
    where: { email },
    update: { name: parsed.data.name, passwordHash, codeHash, expiresAt: codeExpiry(), attempts: 0 },
    create: {
      email,
      name: parsed.data.name,
      passwordHash,
      codeHash,
      expiresAt: codeExpiry(),
    },
  });

  const { text, html } = codeEmail({
    heading: zh ? "确认你的邮箱" : "Confirm your email",
    body: zh
      ? `请输入以下验证码完成注册。验证码 ${CODE_TTL_MINUTES} 分钟内有效。`
      : `Enter this code to finish creating your account. It expires in ${CODE_TTL_MINUTES} minutes.`,
    code,
    footer: zh
      ? "如果这不是你本人的操作，可以忽略此邮件。"
      : "If you did not request this, you can safely ignore this email.",
  });

  await sendMail({
    to: email,
    subject: zh ? "明大乒乓球俱乐部 — 邮箱验证码" : "UMN Table Tennis Club — your confirmation code",
    text,
    html,
  });

  return NextResponse.json({ ok: true });
}

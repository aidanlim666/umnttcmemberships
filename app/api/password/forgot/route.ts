import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { codeEmail, sendMail } from "@/lib/mail";
import { CODE_TTL_MINUTES, codeExpiry, generateCode, hashCode } from "@/lib/codes";

const schema = z.object({ email: z.email(), lang: z.enum(["en", "zh"]).optional() });

/**
 * Requests a reset code.
 *
 * Always answers "ok", whether or not the address has an account. Reporting "no such
 * user" would turn this endpoint into a way to discover who is a member.
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "badRequest" }, { status: 400 });

  const email = parsed.data.email.toLowerCase();
  const zh = parsed.data.lang === "zh";
  const user = await prisma.user.findUnique({ where: { email } });

  // A Google-only account has no password to reset; stay silent about that too.
  if (user?.passwordHash) {
    const code = generateCode();

    // Only the newest code should work, so clear any earlier ones.
    await prisma.passwordReset.deleteMany({ where: { email, usedAt: null } });
    await prisma.passwordReset.create({
      data: { email, codeHash: await hashCode(code), expiresAt: codeExpiry() },
    });

    const { text, html } = codeEmail({
      heading: zh ? "重置密码" : "Reset your password",
      body: zh
        ? `请输入以下验证码来设置新密码。验证码 ${CODE_TTL_MINUTES} 分钟内有效。`
        : `Enter this code to set a new password. It expires in ${CODE_TTL_MINUTES} minutes.`,
      code,
      footer: zh
        ? "如果这不是你本人的操作，你的密码不会有任何变化。"
        : "If you did not request this, your password has not changed.",
    });

    await sendMail({
      to: email,
      subject: zh ? "明大乒乓球俱乐部 — 密码重置码" : "UMN Table Tennis Club — password reset code",
      text,
      html,
    });
  }

  return NextResponse.json({ ok: true });
}

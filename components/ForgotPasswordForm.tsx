"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLang } from "@/i18n/LangProvider";
import { CodeInput } from "@/components/CodeInput";
import { ErrorNote } from "@/components/AuthForm";

type Step = "email" | "reset" | "done";

export function ForgotPasswordForm() {
  const { t, lang } = useLang();
  const router = useRouter();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const value = String(new FormData(e.currentTarget).get("email") ?? "");
    try {
      await fetch("/api/password/forgot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: value, lang }),
      });
      // Always advances, whether or not that address has an account — the response
      // deliberately does not say, so this page cannot be used to find members.
      setEmail(value);
      setStep("reset");
    } catch {
      setError(t("auth.errorGeneric"));
    } finally {
      setBusy(false);
    }
  }

  async function submitReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const data = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/password/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          code: String(data.get("code") ?? "").trim(),
          password: String(data.get("password") ?? ""),
        }),
      });
      if (!res.ok) {
        const { error: reason } = (await res.json()) as { error?: string };
        setError(t(reason === "expired" ? "auth.errorExpiredCode" : "auth.errorBadCode"));
        return;
      }
      setStep("done");
    } catch {
      setError(t("auth.errorGeneric"));
    } finally {
      setBusy(false);
    }
  }

  if (step === "done") {
    return (
      <div className="space-y-4 text-center">
        <p className="rounded-lg bg-[var(--gold-wash)] px-3 py-3 text-[13px] font-bold text-[#7a5200]">
          {t("auth.resetDone")}
        </p>
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="btn btn-primary w-full py-2.5 text-[15px]"
        >
          {t("auth.submitLogin")}
        </button>
      </div>
    );
  }

  if (step === "reset") {
    return (
      <form onSubmit={submitReset} className="space-y-3">
        <p className="text-[13px] leading-relaxed text-[var(--ink-2)]">
          {t("auth.resetSub").replace("{email}", email)}
        </p>

        <CodeInput label={t("auth.code")} />

        <label className="block">
          <span className="mb-1 block text-[12.5px] font-bold">{t("auth.newPassword")}</span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="field"
          />
          <span className="mt-1 block text-[11px] text-[var(--ink-3)]">
            {t("auth.passwordHint")}
          </span>
        </label>

        {error && <ErrorNote>{error}</ErrorNote>}

        <button type="submit" disabled={busy} className="btn btn-primary w-full py-2.5 text-[15px]">
          {t("auth.submitReset")}
        </button>

        <p className="text-center text-[12.5px]">
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setError(null);
            }}
            className="focus-ring rounded text-[var(--ink-3)] hover:underline"
          >
            {t("auth.changeEmail")}
          </button>
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={requestCode} className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-[12.5px] font-bold">{t("auth.email")}</span>
        <input name="email" type="email" required autoComplete="email" className="field" />
      </label>

      {error && <ErrorNote>{error}</ErrorNote>}

      <button type="submit" disabled={busy} className="btn btn-primary w-full py-2.5 text-[15px]">
        {t("auth.sendResetCode")}
      </button>

      <p className="text-center text-[12.5px]">
        <Link href="/login" className="focus-ring rounded font-bold text-[var(--maroon)] hover:underline">
          {t("auth.backToLogin")}
        </Link>
      </p>
    </form>
  );
}

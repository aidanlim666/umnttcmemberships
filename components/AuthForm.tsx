"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useLang } from "@/i18n/LangProvider";
import { GoogleButton } from "@/components/GoogleButton";
import { CodeInput } from "@/components/CodeInput";

type Step = "details" | "code";

export function AuthForm({
  mode,
  next,
  googleEnabled,
}: {
  mode: "login" | "register";
  next: string;
  googleEnabled: boolean;
}) {
  const { t, lang } = useLang();
  const router = useRouter();

  const [step, setStep] = useState<Step>("details");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Held so the account can be signed in automatically the moment the code checks out.
  const [pending, setPending] = useState({ name: "", email: "", password: "" });

  async function signInWithPassword(email: string, password: string) {
    const result = await signIn("credentials", { email, password, redirect: false });
    if (!result || result.error) {
      setError(t("auth.errorCredentials"));
      return;
    }
    router.push(next);
    router.refresh();
  }

  async function onDetails(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") ?? "");
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");

    try {
      if (mode === "login") {
        await signInWithPassword(email, password);
        return;
      }

      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, password, lang }),
      });
      if (res.status === 409) {
        setError(t("auth.errorExists"));
        return;
      }
      if (!res.ok) {
        setError(t("auth.errorGeneric"));
        return;
      }

      setPending({ name, email, password });
      setStep("code");
    } catch {
      setError(t("auth.errorGeneric"));
    } finally {
      setBusy(false);
    }
  }

  async function onCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    const code = String(new FormData(e.currentTarget).get("code") ?? "").trim();

    try {
      const res = await fetch("/api/register/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: pending.email, code }),
      });
      if (!res.ok) {
        const { error: reason } = (await res.json()) as { error?: string };
        setError(t(reason === "expired" ? "auth.errorExpiredCode" : "auth.errorBadCode"));
        return;
      }
      await signInWithPassword(pending.email, pending.password);
    } catch {
      setError(t("auth.errorGeneric"));
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setBusy(true);
    setError(null);
    try {
      await fetch("/api/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...pending, lang }),
      });
      setNotice(t("auth.resent"));
    } finally {
      setBusy(false);
    }
  }

  /* ------------------------------------------------------------ code step */

  if (step === "code") {
    return (
      <form onSubmit={onCode} className="space-y-3">
        <p className="text-[13px] leading-relaxed text-[var(--ink-2)]">
          {t("auth.verifySub").replace("{email}", pending.email)}
        </p>

        <CodeInput label={t("auth.code")} />

        {error && <ErrorNote>{error}</ErrorNote>}
        {notice && (
          <p className="rounded-lg bg-[var(--gold-wash)] px-3 py-2 text-[12.5px] font-semibold text-[#7a5200]">
            {notice}
          </p>
        )}

        <button type="submit" disabled={busy} className="btn btn-primary w-full py-2.5 text-[15px]">
          {t("auth.submitVerify")}
        </button>

        <div className="flex items-center justify-between text-[12.5px]">
          <button
            type="button"
            onClick={resend}
            disabled={busy}
            className="focus-ring rounded font-bold text-[var(--maroon)] hover:underline"
          >
            {t("auth.resend")}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("details");
              setError(null);
              setNotice(null);
            }}
            className="focus-ring rounded text-[var(--ink-3)] hover:underline"
          >
            {t("auth.changeEmail")}
          </button>
        </div>
      </form>
    );
  }

  /* --------------------------------------------------------- details step */

  return (
    <div className="space-y-4">
      {googleEnabled && (
        <>
          <GoogleButton label={t("auth.google")} callbackUrl={next} />
          <Divider label={t("auth.or")} />
        </>
      )}

      <form onSubmit={onDetails} className="space-y-3">
        {mode === "register" && (
          <label className="block">
            <span className="mb-1 block text-[12.5px] font-bold">{t("auth.name")}</span>
            <input name="name" required autoComplete="name" className="field" />
            <span className="mt-1 block text-[11px] text-[var(--ink-3)]">{t("auth.nameHint")}</span>
          </label>
        )}

        <label className="block">
          <span className="mb-1 block text-[12.5px] font-bold">{t("auth.email")}</span>
          <input name="email" type="email" required autoComplete="email" className="field" />
        </label>

        <label className="block">
          <span className="mb-1 block text-[12.5px] font-bold">{t("auth.password")}</span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            className="field"
          />
          {mode === "register" && (
            <span className="mt-1 block text-[11px] text-[var(--ink-3)]">
              {t("auth.passwordHint")}
            </span>
          )}
        </label>

        {error && <ErrorNote>{error}</ErrorNote>}

        <button type="submit" disabled={busy} className="btn btn-primary w-full py-2.5 text-[15px]">
          {t(mode === "register" ? "auth.submitRegister" : "auth.submitLogin")}
        </button>
      </form>

      <div className="space-y-1.5 text-center text-[12.5px]">
        {mode === "login" && (
          <p>
            <Link
              href="/forgot-password"
              className="focus-ring rounded text-[var(--ink-3)] hover:underline"
            >
              {t("auth.forgot")}
            </Link>
          </p>
        )}
        <p>
          <Link
            href={`${mode === "register" ? "/login" : "/register"}?next=${encodeURIComponent(next)}`}
            className="focus-ring rounded font-bold text-[var(--maroon)] hover:underline"
          >
            {t(mode === "register" ? "auth.toLogin" : "auth.toRegister")}
          </Link>
        </p>
      </div>
    </div>
  );
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg bg-[#fff1f1] px-3 py-2 text-[12.5px] font-semibold text-[var(--price-deep)]">
      {children}
    </p>
  );
}

export function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 text-[11px] font-semibold uppercase text-[var(--ink-3)]">
      <span className="h-px flex-1 bg-[var(--line)]" />
      {label}
      <span className="h-px flex-1 bg-[var(--line)]" />
    </div>
  );
}

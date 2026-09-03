"use client";

import { signIn } from "next-auth/react";

export function GoogleButton({ label, callbackUrl }: { label: string; callbackUrl: string }) {
  return (
    <button
      type="button"
      onClick={() => signIn("google", { callbackUrl })}
      className="btn btn-ghost w-full gap-2 py-2.5 text-[14px]"
    >
      <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden>
        <path fill="#4285F4" d="M45 24c0-1.6-.1-2.7-.4-4H24v7.5h12c-.2 2-1.6 5-4.5 7l6.9 5.3C42.5 36.3 45 30.7 45 24z" />
        <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-6.9-5.3c-1.9 1.3-4.4 2.2-7.6 2.2-5.8 0-10.7-3.9-12.5-9.1l-7.1 5.5C7.9 41 15.4 46 24 46z" />
        <path fill="#FBBC05" d="M11.5 28.5c-.5-1.4-.7-2.9-.7-4.5s.3-3.1.7-4.5l-7.1-5.5C2.9 17 2 20.4 2 24s.9 7 2.4 10z" />
        <path fill="#EA4335" d="M24 10.2c3.3 0 5.5 1.4 6.8 2.6l5.9-5.8C33 3.6 29.9 2 24 2 15.4 2 7.9 7 4.4 14l7.1 5.5c1.8-5.2 6.7-9.3 12.5-9.3z" />
      </svg>
      {label}
    </button>
  );
}

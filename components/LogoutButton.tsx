"use client";

import { signOut } from "next-auth/react";

export function LogoutButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={() => signOut({ callbackUrl: "/" })}
      className="focus-ring grid h-7 w-7 place-items-center rounded-full text-white/70 hover:bg-white/15 hover:text-white"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
      </svg>
    </button>
  );
}

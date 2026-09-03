"use client";

/** The six-digit code field, styled so the digits are easy to read back off an email. */
export function CodeInput({ label }: { label: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12.5px] font-bold">{label}</span>
      <input
        name="code"
        required
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d{6}"
        maxLength={6}
        placeholder="000000"
        // Codes are copied by eye from an email, so give them room to breathe.
        className="field num text-center text-[22px] font-extrabold tracking-[0.4em]"
      />
    </label>
  );
}

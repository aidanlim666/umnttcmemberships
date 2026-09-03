import { Logo } from "@/components/Logo";

export function Footer({ club, rights }: { club: string; rights: string }) {
  return (
    <footer className="mt-10 border-t border-[var(--line)] bg-[var(--maroon-deep)] text-white/80">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-4 py-7 sm:flex-row sm:items-center sm:px-5">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/95 p-1.5">
          <Logo size={38} />
        </span>
        <div className="text-[13px] leading-relaxed">
          <p className="display font-bold text-white">{club}</p>
          <p className="text-white/60">{rights}</p>
        </div>
      </div>
    </footer>
  );
}

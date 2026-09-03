import { Logo } from "@/components/Logo";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-8 sm:py-12">
      <div className="mb-4 flex flex-col items-center text-center">
        <span className="grid h-20 w-20 place-items-center rounded-2xl bg-white p-2 shadow-[var(--shadow-card)]">
          <Logo size={64} priority />
        </span>
        <h1 className="display mt-3 text-xl font-extrabold">{title}</h1>
        <p className="mt-1 text-[13px] text-[var(--ink-3)]">{subtitle}</p>
      </div>
      <div className="card p-5">{children}</div>
    </div>
  );
}

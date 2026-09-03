import { redirect } from "next/navigation";
import { getT } from "@/i18n/server";
import { googleEnabled } from "@/lib/auth";
import { getViewer } from "@/lib/session";
import { AuthShell } from "@/components/AuthShell";
import { AuthForm } from "@/components/AuthForm";
import { safeNext } from "@/lib/redirects";

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const viewer = await getViewer();
  const { next } = await searchParams;
  const target = safeNext(next);

  // Checked against the database, not just the token — otherwise a stale session
  // bounces the visitor straight back out of the page they are trying to reach.
  if (viewer) redirect(target);

  const { t } = await getT();
  return (
    <AuthShell title={t("auth.registerTitle")} subtitle={t("auth.registerSub")}>
      <AuthForm mode="register" next={target} googleEnabled={googleEnabled} />
    </AuthShell>
  );
}

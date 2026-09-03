import { redirect } from "next/navigation";
import { getT } from "@/i18n/server";
import { getViewer } from "@/lib/session";
import { AuthShell } from "@/components/AuthShell";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

export default async function ForgotPasswordPage() {
  if (await getViewer()) redirect("/account");

  const { t } = await getT();
  return (
    <AuthShell title={t("auth.forgotTitle")} subtitle={t("auth.forgotSub")}>
      <ForgotPasswordForm />
    </AuthShell>
  );
}

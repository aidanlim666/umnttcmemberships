import type { Metadata } from "next";
import "./globals.css";
import { LangProvider } from "@/i18n/LangProvider";
import { getT } from "@/i18n/server";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { logoSrc } from "@/lib/logo";

export const metadata: Metadata = {
  title: "UMN Table Tennis Club — Membership",
  description:
    "Buy a 2026–27 membership, semester pass, drop-in, or coached training session with the University of Minnesota Table Tennis Club.",
  icons: { icon: logoSrc() },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { lang, t } = await getT();

  // No height class on <html>: pinning it to the viewport while the content overflows
  // breaks fragment links and scrollIntoView. The document is the one scroll container.
  return (
    <html lang={lang === "zh" ? "zh-CN" : "en"}>
      <body className="flex min-h-screen flex-col antialiased">
        <LangProvider lang={lang}>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer club={t("footer.club")} rights={t("footer.rights")} />
        </LangProvider>
      </body>
    </html>
  );
}

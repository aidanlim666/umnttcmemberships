import { getT } from "@/i18n/server";
import { getViewer } from "@/lib/session";
import { listProducts, CATEGORY_OF } from "@/lib/products";
import { checkEligibility } from "@/lib/eligibility";
import { ProductCard } from "@/components/ProductCard";

const CATEGORIES = [
  { id: "memberships", labelKey: "cat.memberships" },
  { id: "dropins", labelKey: "cat.dropins" },
  { id: "training", labelKey: "cat.training" },
] as const;

export default async function HomePage() {
  const [{ lang, t }, viewer] = await Promise.all([getT(), getViewer()]);
  const products = await listProducts(lang);
  const memberships = viewer?.memberships ?? [];

  const grouped = {
    memberships: products.filter((p) => CATEGORY_OF[p.kind] === "memberships"),
    dropins: products.filter((p) => CATEGORY_OF[p.kind] === "dropins"),
    training: products.filter((p) => CATEGORY_OF[p.kind] === "training"),
  };

  return (
    <div className="mx-auto max-w-5xl px-3 pb-8 pt-4 sm:px-5 sm:pt-6">
      {CATEGORIES.map((c) => (
        <section key={c.id} id={c.id} className="mb-6 scroll-mt-28">
          <h2 className="display mb-2 flex items-center gap-2 text-[13.5px] font-bold text-[var(--ink-2)]">
            <span className="h-3.5 w-1 rounded-full bg-[var(--maroon)]" />
            {t(c.labelKey)}
          </h2>
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3">
            {grouped[c.id].map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                eligibility={checkEligibility(memberships, p)}
                lang={lang}
                featured={p.kind === "YEAR_MEMBERSHIP"}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

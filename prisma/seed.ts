import "dotenv/config";
import { prisma } from "../lib/db";
import { SEED_PRODUCTS } from "../lib/catalog";

async function main() {
  for (const p of SEED_PRODUCTS) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      // Re-seeding refreshes copy and pricing but leaves existing orders untouched.
      update: p,
      create: p,
    });
  }
  console.log(`Seeded ${SEED_PRODUCTS.length} products.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

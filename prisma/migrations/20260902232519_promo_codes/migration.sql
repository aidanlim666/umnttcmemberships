-- Promo codes: record the code used and the amount it took off, and allow an order to be
-- settled by a code alone when the discount brings the total to zero.
ALTER TYPE "PaymentProvider" ADD VALUE 'PROMO';

ALTER TABLE "Order" ADD COLUMN "promoCode" TEXT;
ALTER TABLE "Order" ADD COLUMN "discountCents" INTEGER NOT NULL DEFAULT 0;

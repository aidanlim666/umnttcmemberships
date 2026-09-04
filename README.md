# UMN Table Tennis Club — Membership Site

Membership and session-pass sales for the University of Minnesota Table Tennis Club.
Members sign in (email or Google), buy a season membership or a single session, pay with
PayPal, Venmo, Apple Pay, or card, and every completed purchase is appended to the
officers' Google Sheet automatically.

Bilingual English / 中文, English by default, with a toggle in the top-right of the header.

---

## Quick start

```bash
# 1. Local Postgres
docker run -d --name umnttc-pg \
  -e POSTGRES_PASSWORD=umnttc -e POSTGRES_USER=umnttc -e POSTGRES_DB=umnttc \
  -p 5433:5432 postgres:16

# 2. Environment
cp .env.example .env          # the defaults already point at the container above
openssl rand -base64 32       # paste into AUTH_SECRET

# 3. Database + catalogue
npm install
npx prisma migrate dev
npm run db:seed

# 4. Run
npm run dev                   # http://localhost:3000
```

The site is fully usable at this point: browse, register, log in, pick a drop-in date, and
create an order. Checkout shows "this payment method is not configured yet" until you add
provider keys — everything else works, including the Google Sheet path (it logs the row to
the server console when Sheets is not configured).

---

## What's sold

| Product | Price | Notes |
| --- | --- | --- |
| 2026–27 Full Year Membership | $50 | Runs to 31 Aug 2027 |
| Fall 2026 Semester Membership | $30 | Runs to 31 Dec 2026 |
| Friday League Drop-In | $5 | Requires a session date |
| Open Play Drop-In | $3 | Requires a session date |
| Coached Training Session | TBD | Not purchasable until a price is set |

### No accounts

Anyone can buy without signing up. The buyer types a name and email on the product page,
and day passes also ask for a self-assessed level. Those details are for the club's records
only — nothing is verified and nothing gates access.

There is no membership check: every priced product is buyable by anyone. **The promo code
is how members get free entry** — hand a full-value code to known members and they register
for league nights at no charge. See [Promo codes](#promo-codes).

An order id is the only thing guarding a checkout page, the way a hosted payment link works.
Ids are cuids and unguessable.

### Setting the training price

```sql
UPDATE "Product" SET "priceCents" = 2000 WHERE slug = 'training-session';
```

or edit `SEED_PRODUCTS` in `lib/catalog.ts` and re-run `npm run db:seed`. The card stops
saying "Price TBD" and becomes purchasable immediately.

### Promo codes

Codes live in `lib/promos.ts` — a small in-code registry rather than a table, since a code
is a decision an officer makes, not data members create. Add an entry and it works
everywhere at once:

```ts
{ code: "WELCOME25", percentOff: 25, labelEn: "Welcome — 25% off", labelZh: "..." }
```

Matching ignores case and surrounding whitespace. The active code today is
**`TESTINGTESTING`** (100% off), used for testing the purchase flow end to end.

A code worth the full price leaves nothing to charge, so the order is granted immediately
and the buyer skips checkout entirely — the entitlement, the membership row, and the
spreadsheet line all happen exactly as they would after a real payment, recorded against
the `PROMO` payment provider with the code in its own spreadsheet column.

The browser only ever sends a **code**, never an amount. `/api/promos/validate` is a
preview for the buyer; the order API looks the code up again and recomputes the price from
the product's own row, so a forged preview response discounts nothing.

### Changing which dates are bookable

Drop-in dates are clamped to the season opening (1 September 2026) and to today, whichever
is later — see `SEASON_START_ISO` in `lib/dates.ts`.

---

## Configuration

Every integration is optional. The app degrades cleanly when a key is missing rather than
failing, so you can turn them on one at a time.

### Google sign-in

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → Create
   Credentials → OAuth client ID → Web application.
2. Authorised redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://<your-domain>/api/auth/callback/google`
3. Set `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`.

Without these the Google button is simply not rendered; email/password still works.

### Email (not currently used)

Nothing on the site sends email any more — signup codes and password resets went away with
the accounts. `lib/mail.ts` and the Brevo credentials are left in place and working, so
purchase receipts would be a small change rather than a fresh setup.

Two things worth remembering if you ever wire it back up: **serverless hosts commonly block
outbound SMTP ports** (Railway did, and Netlify Functions are not a safe bet either), so mail
should go over the HTTPS API (`BREVO_API_KEY`), and `umn.edu` publishes DMARC
`p=reject`, so mail claiming to come from a @umn.edu address through any third party is
rejected outright. That is why the sender is a plain Gmail address.

### PayPal and Venmo

Venmo is only reachable through PayPal's SDK — one set of credentials covers both. Venmo
appears for US buyers on supported devices, and does **not** show up in the sandbox on
desktop, so test it on a phone.

1. [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/applications/sandbox)
   → create a sandbox app.
2. Set `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, and `NEXT_PUBLIC_PAYPAL_CLIENT_ID`
   (the public one is the same client id).
3. Add a webhook pointing at `https://<your-domain>/api/paypal/webhook` subscribed to
   **PAYMENT.CAPTURE.COMPLETED**, then set `PAYPAL_WEBHOOK_ID`.
4. Going live: set `PAYPAL_ENV=live` and swap in live credentials.

### Stripe (Apple Pay and cards)

1. [Stripe test API keys](https://dashboard.stripe.com/test/apikeys) → set
   `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
2. Local webhooks: `stripe listen --forward-to localhost:3000/api/stripe/webhook`, then
   set `STRIPE_WEBHOOK_SECRET` from its output.
3. Apple Pay additionally requires
   [domain verification](https://dashboard.stripe.com/settings/payment_method_domains) for
   your deployed domain, and only renders in Safari. Cards work everywhere as the fallback.

Test card: `4242 4242 4242 4242`, any future expiry, any CVC.

### Google Sheets purchase log

1. [Google Cloud Console](https://console.cloud.google.com/) → enable the **Google Sheets
   API** → create a **service account** → create a JSON key.
2. Create a spreadsheet. Do not build the tabs by hand — `npm run sheets:init` creates all
   four with the right headers, and re-running it repairs a header that has drifted.

3. **Share the spreadsheet with the service account's email address** (Editor). This is the
   step people miss — the service account is a separate identity and cannot see your files
   otherwise.
4. Set `GOOGLE_SHEET_ID` (from the sheet URL), `GOOGLE_SERVICE_ACCOUNT_EMAIL`, and
   `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (paste the JSON key's `private_key` value verbatim,
   `\n` escapes and all — `lib/sheets.ts` unescapes it).

### What lands where

| Tab | One row per | Written when |
| --- | --- | --- |
| `Full-Year Memberships` | season member | a full-year membership is paid for |
| `Semester Memberships` | fall member | a fall membership is paid for |
| `Purchases` | transaction | any purchase completes |

A membership purchase appears **twice on purpose**: once in `Purchases` as a transaction,
and once on its own tab as a roster entry an officer can read at a glance.

| Command | Does |
| --- | --- |
| `npm run sheets:setup -- <key.json> <sheet-id>` | writes the credentials into `.env` |
| `npm run sheets:init` | creates the three tabs, writes and freezes headers |
| `npm run sheets:check` | appends a visible test row to prove the connection |
| `npm run sheets:backfill` | writes existing database records into the tabs |

`sheets:backfill` is idempotent — rows already present (matched on order id) are skipped, so it is safe to re-run and is the way to recover a tab
after any gap in writing.

Appending is deliberately best-effort: a Sheets outage logs the row and moves on rather
than failing a payment that has already been captured. Look for `[sheets]` in the server
logs if a row is missing.

---

## How a purchase works

```
product page ──▶ POST /api/orders ──▶ PENDING order (price read from the DB)
                                            │
                    ┌───────────────────────┴────────────────────────┐
                    ▼                                                ▼
          PayPal / Venmo                                   Apple Pay / card
    create-order ▶ approve ▶ capture                 create-intent ▶ confirm
                    │                                                │
                    └──────────────▶ fulfillOrder() ◀────────────────┘
                                            │
                         PAID · membership granted · row appended to the Sheet
```

`fulfillOrder()` in `lib/fulfill.ts` is the single fulfilment path and is **idempotent**.
Both the browser's capture call and the provider's webhook race to call it for the same
payment; a `fulfilledAt` guard inside the transaction means the second one is a no-op. A
member can never be granted two memberships, and the spreadsheet can never gain a
duplicate row.

Prices are always read from the `Product` table server-side. The client never sends an
amount.

---

## Design notes

The visual target is the dominant look of the modern Chinese consumer internet — Taobao /
Meituan / Xiaohongshu: warm, dense, modular — rendered in UMN maroon (`#7a0019`) and gold
(`#ffcc33`) on a warm off-white ground. Tokens live at the top of `app/globals.css`; the
component classes below them sit inside `@layer components` so Tailwind utilities still win.

### Typography

- **Body** uses the system stack (`system-ui`, `PingFang SC`, `Microsoft YaHei`, …) — zero
  bytes, renders natively on every platform.
- **Display** uses HarmonyOS Sans SC, self-hosted and subsetted by
  `scripts/subset-font.sh` (`pyftsubset --flavor=woff2`, driven by the actual dictionary
  contents). A full SC face is ~4.3 MB; the subset lands in the tens of KB. The font file
  is optional — without it the stack falls through to the system faces.
- Chinese is **never italicised** — synthesised obliques look broken. Emphasis uses weight.
- Chinese body text gets `letter-spacing: .02em`; large display Chinese gets `-.01em`.
- All prices and numerals use `font-variant-numeric: tabular-nums` so they do not jitter.

### Imagery

- **The crest** lives at `public/logo.png` — the official club mark with its white
  background knocked out so it sits cleanly on the warm card gradients. `lib/logo.ts`
  resolves it at runtime and it drives the header, every product card, the auth pages, and
  the favicon. Replace that one file to change the mark everywhere;
  `public/logo-placeholder.svg` is the fallback if it is ever missing.
- **The background** is an aerial of the Twin Cities campus (`public/campus.jpg`, resized
  to 2000px and compressed since it sits under a heavy scrim). It is painted by a fixed
  `body::before` layer rather than `background-attachment: fixed`, which iOS Safari
  ignores. Adjust the scrim opacities in `app/globals.css` to bring the photo forward or
  push it back — they are tuned so the dense white cards stay legible on top.

---

## Live deployment

Hosted on Netlify: **https://umn-ttc-membership.netlify.app**

Netlify project `umn-ttc-membership` (team `aidanlim`, Starter plan) serves the app; the
database is Neon project `polished-frost-62345290`, branch `production`, in AWS
`us-east-2`. That region is deliberate — Netlify Functions default to Ohio, so the database
sits in the same AWS region as the functions querying it.

Deploy from this directory:

```bash
npx netlify-cli deploy --build --prod
```

The production build runs `prisma migrate deploy` before `next build`, so migrations ship
with the release. `neon link` keeps `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED`
(direct) current in `.env`; both are also set in the Netlify dashboard.

Note that `neon link` overwrites `DATABASE_URL` in `.env` with the production value, so
after running it `npm run dev` talks to production until you point it back at the local
container from step 1 above.

Previously hosted on Railway, dropped because its free credit lasts about a month — see
`## Deploying to Netlify + Neon` for why Vercel's Hobby plan is not an option either.

### Writing migrations by hand

Prisma names migrations in **UTC**; `date +%Y%m%d%H%M%S` gives **local time**. Mixing the
two produced folder names that sorted *before* the initial migration, which worked locally
(where earlier migrations had already been applied) and failed on the first real deploy,
because the rename ran before the type it renames existed. Always generate the timestamp
with `date -u +%Y%m%d%H%M%S`, and check `ls prisma/migrations | sort` puts them in the
order you intend.

## Deploying to Netlify + Neon

Both tiers are free with no expiry, and both permit commercial use — which matters here,
because the site sells memberships. (Vercel's Hobby plan does not: its fair-use terms name
"a paid membership" as commercial.)

1. **Neon.** Create a project, then copy *two* connection strings from the dashboard:
   - `DATABASE_URL` — the **pooled** one (host contains `-pooler`). Serverless functions
     open a connection per invocation, so the app must go through the pooler.
   - `DIRECT_URL` — the **unpooled** one. Only `prisma migrate deploy` uses it; the pooled
     endpoint cannot hold the advisory lock Prisma takes while migrating.
2. **Env vars.** Set every key from `.env.example` in Netlify → Site configuration →
   Environment variables, plus `DIRECT_URL`.
3. **Schema.** `npx prisma migrate deploy` then `npm run db:seed` once, run locally with
   `DIRECT_URL` pointed at Neon. Afterwards production deploys migrate themselves — see
   the `[context.production]` build command in `netlify.toml`.
4. **Webhooks.** Point the Stripe and PayPal webhooks at the Netlify domain and update
   `STRIPE_WEBHOOK_SECRET` / `PAYPAL_WEBHOOK_ID` with the values those dashboards issue.
5. **Apple Pay.** Redo Stripe's domain verification for the new domain.

Deploy previews deliberately skip the migration step: they share the production database,
so a preview build applying a branch's unmerged schema change would corrupt live data.

---

## Project layout

```
app/
  page.tsx                     shop home — hero, category rail, product grid
  products/[slug]/             product detail, date picker, buy panel
  checkout/[orderId]/          payment methods, order summary, success page
  account/                     membership status + purchase history
  login/ register/             auth pages
  api/orders/                  creates orders; enforces eligibility and dates
  api/paypal/ api/stripe/      create · capture/confirm · webhook
  api/register/                email + password sign-up
lib/
  eligibility.ts               who may buy what — the one source of truth
  fulfill.ts                   idempotent "payment ⇒ entitlement" path
  sheets.ts                    Google Sheets append (never throws)
  catalog.ts dates.ts money.ts products.ts logo.ts auth.ts db.ts session.ts
i18n/                          en.ts · zh.ts dictionaries, cookie-backed provider
components/                    Header, DatePicker, PayPanel, ProductCard, …
prisma/schema.prisma           User · Product · Order · Membership
scripts/subset-font.sh         HarmonyOS Sans SC subsetting
```

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run db:migrate` | Create and apply a migration |
| `npm run db:seed` | Upsert the five products |
| `npm run db:studio` | Browse the database |

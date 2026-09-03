export const en = {
  "site.name": "UMN Table Tennis Club",
  "site.short": "UMN TTC",
  "site.tagline": "Membership & Session Passes",

  "nav.shop": "Shop",

  "lang.toggle": "中文",
  "lang.label": "Language",

  "announce.1": "2026–27 season memberships are open — join before the first Friday league",
  "announce.2": "Members play free at every open play session and Friday league",
  "announce.3": "Questions? Find an officer at Cooke Hall on practice nights",

  "home.perk1": "Unlimited open play",
  "home.perk2": "Free league entry every Friday",
  "home.perk3": "Coaching available",
  "home.perk4": "All skill levels",
  "perk.oneTimeLeague": "One time league play",
  "perk.oneTimeOpenPlay": "One time open play",

  "cat.memberships": "Memberships",
  "cat.dropins": "Drop-ins",
  "cat.training": "Training",


  "product.buy": "Buy now",
  "product.viewDetails": "View details",
  "product.priceTbd": "Price TBD",
  "product.from": "Only",
  "product.selectDate": "Select your date",
  "product.dateRequired": "Pick a date to continue",
  "product.selected": "Selected",
  "product.whatsIncluded": "What you get",
  "product.needHelp": "Bring your own paddle or borrow one of the club's — either way you're covered.",

  "badge.hot": "Popular",
  "badge.bestValue": "Best value",


  "promo.label": "Promo code",
  "promo.placeholder": "Enter code",
  "promo.apply": "Apply",
  "promo.remove": "Remove",
  "promo.invalid": "That code isn't valid.",
  "promo.youPay": "You pay",
  "promo.free": "No payment needed",


  "buyer.name": "Your name",
  "buyer.email": "Email",
  "buyer.emailHint": "Used for the club's records so we know who signed up.",
  "buyer.level": "Estimated level if new to our club:",
  "buyer.levelBeginner": "Beginner",
  "buyer.levelIntermediate": "Intermediate",
  "buyer.levelAdvanced": "Advanced",
  "buyer.needDetails": "Enter your name and email",
  "buyer.error": "Something went wrong. Please try again.",

  "checkout.title": "Checkout",
  "checkout.summary": "Order summary",
  "checkout.total": "Total",
  "checkout.sessionDate": "Session date",
  "checkout.payWith": "Pay with",
  "checkout.paypalVenmo": "PayPal or Venmo",
  "checkout.applePayCard": "Apple Pay or card",
  "checkout.securedBy": "Payments are processed by PayPal and Stripe. The club never sees your card details.",
  "checkout.processing": "Confirming your payment…",
  "checkout.failed": "Payment could not be completed. You have not been charged.",
  "checkout.notConfigured":
    "This payment method is not configured yet. Add the provider keys to .env to enable it.",

  "success.title": "You're in!",
  "success.sub": "Your purchase is confirmed and your name is on the club roster.",
  "success.orderId": "Order",
  "success.toShop": "Keep browsing",


  "cal.prev": "Previous month",
  "cal.next": "Next month",
  "cal.months": "January,February,March,April,May,June,July,August,September,October,November,December",
  "cal.days": "Su,Mo,Tu,We,Th,Fr,Sa",

  "footer.club": "University of Minnesota Table Tennis Club",
  "footer.rights": "Recreation & Wellness · Twin Cities campus",
} as const;

export type Dict = Record<keyof typeof en, string>;

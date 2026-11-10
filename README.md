# Primal Reset Retreats

An editable static retreat website prepared for Cloudflare Pages, with Decap CMS, GitHub sign-in through two Pages Functions, and email contact forms using FormSubmit, with optional Formspree support.

See **PRICING-AND-PAYMENTS.md** for the new pricing page, editing room prices/photos, the Book now button, and the proposed Stripe integration. Payments are not connected.

Start with **CLOUDFLARE-SETUP.md** for account setup and everyday editing instructions. No paid hosting plan is required for this small site within provider free limits. Domain renewals remain separate.

## Local development

Use Node 22 or newer:

```
npm ci
npm start
```

Open http://localhost:3000. `npm start` builds the site before starting the loopback-only static server. Stop with Ctrl+C. Run `npm run build` after content changes. The deployed editor needs the Cloudflare/GitHub setup in the guide; the local static server does not emulate Pages Functions.

```
npm run check
```

Checks include JavaScript syntax, static links/assets/anchors, generated CMS configuration, adding/hiding retreats and pages, form configuration, Markdown escaping, and the OAuth handshake/state logic. OAuth unit tests mock GitHub; actual account authorization, delivery, and a real Cloudflare deployment must be verified after configuring accounts.

## Source layout

- `content/settings.json`: public website/contact/form settings; never put secrets here.
- `content/pages/`: text/image fields for the existing pages and added custom pages.
- `content/retreats/`: retreat details, descriptions, and visibility.
- `content/pricing.json`: the two accommodation options, room photographs, promotion, and planned deposit.
- `templates/`: preserved original page design with content placeholders.
- `public/`: local image/font assets, styles, visitor form script, and Decap admin.
- `scripts/build.mjs`: renders the content and templates into `dist/`.
- `functions/api/`: Cloudflare Pages OAuth handlers, with secrets read only at runtime.
- `dist/`: generated deployment output (ignored by Git).

The original repository was empty; the initial HTML/design/assets were recovered from the live Vercel site. This is a reconstruction, not recovered original React source. New retreats and custom pages use the included reusable layouts.

## Deployment configuration

Cloudflare Pages: production branch `main`, framework `None`, build `npm run build`, output `dist`, `NODE_VERSION=22`. Use Git integration for automatic updates after CMS commits. The top-level `functions/` directory provides editor login. `_routes.json` limits Functions execution to the two login routes.

Runtime settings: `SITE_URL`, `GITHUB_CLIENT_ID`, encrypted `GITHUB_CLIENT_SECRET`. The CMS and authenticator currently use `public_repo` scope for the public GitHub repository. Read the setup guide before changing repository visibility.

Forms use FormSubmit and require recipient email activation. Submissions are sent directly to the selected form service and are not saved in GitHub or browser-local storage. Retreat inquiries collect age (29–60) and country; coach applications collect country without that age restriction. Dates, pricing, program details, and policies still require owner confirmation. Indexing is disabled until explicitly enabled with a valid site URL.

## Brand assets

The approved detailed tree-and-roots seal has the corrected plural wording **RETREATS**. Download the full PNG from `/brand/primal-reset-retreats-logo.png`; the header uses an optimized 320px export. The favicon uses the same detailed seal (not the rejected simplified icon), with 96px, 192px, 512px, Apple touch, and ICO exports.

Home has a dedicated responsive header, a native mobile menu, concise hero copy, and a compact featured-retreat link using a retreat photograph. The website seal is the parent brand; The Men's Rebirth has its own transparent emblem under `public/retreats/mens-rebirth/`, configured only in that retreat's `logo` field. It appears on that retreat's page and its own listing. It does not replace the parent website logo or favicon.

Search indexing is enabled at the owner's request, with a sitemap, canonical links, favicon declarations, and Organization/WebSite metadata. Search engines choose when to crawl and whether to display the icon.

## Single-page navigation

The main page is ordered About → Retreats → Experience (including the connection lab and detailed journey) → Stay → Team (including Dan and the coach application) → FAQs → Contact. The top navigation scrolls to these anchors. Pricing & Payment is the separate visitor page. Legacy Men's Rebirth and Coach with Us URLs redirect to the relevant main-page sections; they are omitted from the sitemap. The underlying legacy templates remain available in source.

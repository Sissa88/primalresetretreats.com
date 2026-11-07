# Primal Reset Retreats

An editable static retreat website prepared for Cloudflare Pages, with Decap CMS, GitHub sign-in through two Pages Functions, and two independently configurable Formspree forms.

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
- `templates/`: preserved original page design with content placeholders.
- `public/`: local image/font assets, styles, visitor form script, and Decap admin.
- `scripts/build.mjs`: renders the content and templates into `dist/`.
- `functions/api/`: Cloudflare Pages OAuth handlers, with secrets read only at runtime.
- `dist/`: generated deployment output (ignored by Git).

The original repository was empty; the initial HTML/design/assets were recovered from the live Vercel site. This is a reconstruction, not recovered original React source. New retreats and custom pages use the included reusable layouts.

## Deployment configuration

Cloudflare Pages: production branch `main`, framework `None`, build `npm run build`, output `dist`, `NODE_VERSION=22`. Use Git integration for automatic updates after CMS commits. The top-level `functions/` directory provides editor login. `_routes.json` limits Functions execution to the two login routes.

Runtime settings: `SITE_URL`, `GITHUB_CLIENT_ID`, encrypted `GITHUB_CLIENT_SECRET`. The CMS and authenticator currently use `public_repo` scope for the public GitHub repository. Read the setup guide before changing repository visibility.

Forms are disabled until Formspree IDs are published in the editor. Submissions are sent directly to Formspree and are not saved in GitHub or browser-local storage. Dates, pricing, program details, and policies still require owner confirmation. Indexing is disabled until explicitly enabled with a valid site URL.

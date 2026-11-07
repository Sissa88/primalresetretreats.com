# Primal Reset Retreats — local edition

A standalone reconstruction of all three linked pages from https://primal-reset-retreats.vercel.app/, with the original images, fonts, responsive styles, and content. Original framework source was unavailable: the supplied GitHub repository was empty. These are editable HTML pages, not the original React source.

## Run locally

Install Node.js 20 or newer. In this directory run:

```
npm start
```

Open http://localhost:3000. No dependency installation, paid hosting, account, or external server is needed. The included server listens on your own computer only. Stop it with Ctrl+C. You can also serve `public/` using a static web server.

## Edit

- `public/index.html`: Home
- `public/retreats/mens-rebirth/index.html`: retreat details
- `public/coach-with-us/index.html`: coach information and application
- `public/local.css`: added styles and accessibility improvements
- `public/local.js`: forms and navigation
- `public/_next/static/css/`: preserved original compiled styles
- Images and fonts are stored locally under `public/`.

## Forms

Retreat and coach forms validate required fields and save entries in the current browser's localStorage. Download and delete controls operate separately for each inquiry type. Nothing is emailed or submitted to a remote service. Storage is specific to the browser and local address, and is not encrypted. Use sample data on shared devices. Real inquiries require connecting an email/form service later.

## Still needs owner decisions before public launch

Confirm dates, price, lodging duration (the current copy describes seven days and seven nights), booking/cancellation terms, coach participation and credentials, final activities, screening requirements, and the contact destination. Concept-preview labels remain because these facts are unconfirmed. No payments are collected. No privacy or refund policies have been invented.

`robots.txt` discourages indexing of this unfinished preview. Add a production sitemap and update robots when the final public domain and content are ready.

## Verify

Run `npm run check`. This checks JavaScript syntax and local page, asset, and anchor links. Browser layout QA was not available in the build environment.

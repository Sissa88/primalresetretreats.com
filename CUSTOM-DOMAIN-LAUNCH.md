# Launch on primalresetretreats.com

The existing `https://primalresetretreats-com.pages.dev` website is already public. Live PayPal was enabled by the owner. No additional server or WordPress installation is needed. A custom domain is a separate Cloudflare Pages setup step.

1. Cloudflare → Workers & Pages → the **Pages** project `primalresetretreats-com` (the `.pages.dev` project, not the similarly named Worker).
2. Open **Custom domains → Set up a custom domain** and enter `primalresetretreats.com`. Follow the DNS and certificate verification prompts. Add `www.primalresetretreats.com` if desired; select a single main address.
3. Keep existing email MX, SPF, DKIM and DMARC records. Changing website hosting does not require deleting email records.
4. After the custom domain has HTTPS and shows the site, change **Website settings → Public website URL** in the editor to `https://primalresetretreats.com` and publish. This updates canonicals, sitemap, structured data, and contact-form return URLs. Keep it on the current Pages address until the domain is actually working.
5. Update Cloudflare `SITE_URL` to `https://primalresetretreats.com`. In the existing GitHub OAuth app, update Homepage URL to that address and callback URL to `https://primalresetretreats.com/api/callback`. Redeploy and sign in at the new domain's `/admin/`.
6. In the **Live** PayPal app, update the existing webhook URL to `https://primalresetretreats.com/api/booking/webhook`. If PayPal gives it a new ID, update `PAYPAL_WEBHOOK_ID` in Cloudflare. Do not use Sandbox credentials.
7. Set `BOOKING_TERMS_URL` to `https://primalresetretreats.com/booking-terms/`, save, and redeploy. Keep the same Live database so existing reservations and marketing preferences stay intact. Do not reinitialise capacity after real bookings have been accepted.
8. Use `/payment-check/` on the new domain to confirm Live mode, webhook, terms, card-field eligibility and correct remaining places. Verify the new contact-form return page and editor login. A readiness check does not charge money. Do not use test cards in Live mode.

The private customer database has an optional marketing opt-in and unsubscribe flow. See CUSTOMER-DATABASE.md for exports. No marketing messages are sent automatically.

## Source code ZIP

GitHub → repository → **Code → Download ZIP** downloads the current source. A precise commit ZIP can also be downloaded at `https://github.com/Sissa88/primalresetretreats.com/archive/COMMIT_SHA.zip`.

After unzipping, install Node 22 or newer, run `npm ci`, then `npm run build`. `npm run dev` serves the static local preview; Cloudflare Functions and D1 bindings are needed for payment and customer APIs. The source ZIP is not a backup of Live customers, Cloudflare secrets or PayPal account settings. Those stay in your accounts.

# Retreat booking confirmation email

Preview: `https://primalresetretreats.com/booking-email-preview/`. This is a fictional example; opening it sends nothing. A plain-text sample is at `/booking-email-preview/sample.txt`.

The template confirms the accommodation, full package price, any actual promotion, deposit paid, remaining balance due February 1, 2027, booking reference and next steps. It tells guests to wait for written confirmation that the retreat will proceed before booking flights, explains the 10-guest minimum and approved postponement/refund choice, and invites questions about arrival, transfers and dietary needs. No street address or arrival time has been invented.

Edit the wording at `/admin/` → **Booking confirmation email**. Financial values always come from the verified booking record, not editable email copy or browser estimates.

## Activate delivery

Sending is disabled by default. No confirmation emails have been sent by this setup task. PayPal's own receipts and the existing FormSubmit inquiry delivery remain separate.

1. Create a [Resend](https://resend.com/) account. Its transactional Free tier currently includes up to 3,000 emails per month and 100 per day, enough for this retreat's 15 initial confirmations; check current plan terms before choosing a plan.
2. In Resend → Domains, add `mail.primalresetretreats.com`. Copy the DNS records Resend provides into Cloudflare and wait for verification. Use this sending subdomain so existing inbox/MX records at `primalresetretreats.com` remain intact. Do not invent DNS values.
3. Create a Resend API key restricted to sending for that domain where supported.
4. In the **Pages project's Production variables and secrets**, add:

| Name | Type | Value |
| --- | --- | --- |
| RESEND_API_KEY | Secret | The Resend API key |
| BOOKING_EMAIL_FROM | Text | `Primal Reset Retreats <bookings@mail.primalresetretreats.com>` |
| BOOKING_EMAIL_ENABLED | Text | `true` |

5. Redeploy. `/payment-check/` will show the booking email as Configured; that indicates settings are present, not that delivery has been verified. Replies go to `info@primalresetretreats.com`.
6. Verify delivery with an explicitly authorised test to an inbox you control before relying on it for real guests. Do not make an extra large Live payment merely to test email. This version deliberately has no unauthenticated test-send endpoint. Resend's verified-domain dashboard can test sender delivery; application end-to-end testing requires a controlled paid booking fixture or a provider-mocked local test.

## Behaviour and retries

- Only a verified `paid` booking may generate a confirmation, sent to `booking_guests.email`. Marketing opt-in is not required for this transactional message. A payer's account email is not substituted for the attendee's address.
- Normal checkout schedules the email after successful capture, without delaying the payment response. The verified PayPal completion webhook also sends/retries it, including on repeated completion events. Email failure never reverses or repeats a payment.
- A private outbox table is created automatically. The recipient, sender, subject and bodies are snapshotted once; repeat requests use the same payload and Resend idempotency key. Atomic database leases prevent simultaneous checkout/webhook calls from sending twice.
- If sending fails, the completed payment remains confirmed. The outbox stays pending. A failing email attempt makes the verified webhook return a failure response so PayPal can retry. Delivery does not depend on the guest leaving their browser open.
- Resend's idempotency retention is 24 hours. Automatic retries stop after 23 hours and mark the email for manual review, preventing a late retry from sending a second message when provider deduplication expires. Check both Resend and the outbox before any manual resend.
- `sent` means the provider accepted the email. It does not prove inbox delivery. Review Resend's delivery/bounce status for that email. This version does not consume Resend bounce webhooks or send balance invoices automatically.
- The sender remains disabled in Sandbox. Unit tests mock the provider and do not send real emails. For a future sandbox delivery workflow, use a separate explicit test-sending design and a controlled recipient; do not reuse arbitrary guest addresses.

## Check the private outbox

Cloudflare → D1 → `primal-retreat-bookings-live` → Console:

```sql
SELECT booking_id,status,attempts,provider_id,sent_at,last_error
FROM booking_confirmation_emails
ORDER BY created_at DESC;
```

The table appears on the first enabled confirmation attempt; migration `0004_booking_confirmation_emails.sql` is provided for managed migrations. Missing sender credentials leave delivery disabled, without touching bookings. Setting `BOOKING_EMAIL_ENABLED=false` stops new confirmation sends without changing payments or customer marketing preferences.

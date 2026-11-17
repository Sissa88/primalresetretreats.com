# PayPal deposit checkout

The pricing page contains a working **review preview**, with live payment disabled until configuration is complete. Preview: `/pricing/?checkout_preview=1#deposit-review`.

Confirmed business settings:
- Retreat capacity: 15 people, allocated to 5 private rooms (one guest each) and 10 shared beds (one guest each).
- Private package $5,850; shared package $5,200; 50% deposit.
- OPENGATEHOSTEL reduces the entire package by 30%, before calculating the deposit.
- Remaining balance due February 1, 2027. It is NOT automatically charged. Send each guest a separate PayPal invoice referencing their booking; do not create a second reservation.
- Dates displayed as instructed by the owner: April 1–7, 2027, seven nights, six days. Arrival/departure arrangements need to explain the seven overnight stays.

## Connect in sandbox first

1. In Cloudflare **Storage & databases → D1**, create a database called `primal-retreat-bookings`.
2. Open that database's SQL console. Run the contents of `migrations/0001_bookings.sql`. Do not rerun different capacities over real reservations. This creates capacity limits and the booking table.
3. Open **Workers & Pages → primalresetretreats-com → Settings → Bindings**. Add a D1 binding named **BOOKING_DB**, selecting that database. Use a separate D1 database for sandbox and live bookings so test holds cannot affect live availability.
4. In [PayPal Developer](https://developer.paypal.com/dashboard/), use **Apps & Credentials → Sandbox** and create a REST app for the business test account. Copy its Client ID and secret into Cloudflare, not chat or Git.
5. In the PayPal app, add a webhook URL: `https://primalresetretreats-com.pages.dev/api/booking/webhook`. Subscribe to **PAYMENT.CAPTURE.COMPLETED**. Copy its webhook ID.
6. Add Cloudflare variables/secrets:

| Name | Type | Sandbox value |
| --- | --- | --- |
| PAYPAL_CLIENT_ID | Secret | App's sandbox Client ID |
| PAYPAL_CLIENT_SECRET | Secret | App's sandbox secret |
| PAYPAL_WEBHOOK_ID | Secret | Sandbox webhook ID |
| PAYPAL_ENV | Text | `sandbox` |
| BOOKING_TERMS_URL | Text | HTTPS URL of approved booking/cancellation terms |
| BOOKING_ENABLED | Text | `true` |

7. Redeploy. Checkout explicitly says **SANDBOX — TEST PAYMENTS ONLY**. The separate PayPal Business no-code buttons are not used by this integration: server-created orders charge the correct deposit.
8. Test using a separate sandbox buyer account. Confirm private/shared prices, valid/invalid promotion, cancelled checkout, expired checkout, final place, payment retries, and completion webhook. PayPal must show the same deposit amount as the website.
9. Finalise and publish deposit/refund/cancellation/postponement terms, including the minimum-guest policy, before accepting real payments. Terms are deliberately not invented by the implementation.

## Go live

Create/select a **Live** REST app in PayPal. Register the live webhook at the production URL and replace credentials/webhook ID with live values. Bind a fresh production D1 database initialised with the same migration. Set `PAYPAL_ENV=live`; redeploy with the approved terms URL and `BOOKING_ENABLED=true` only after sandbox and live-config review. Add Cloudflare rate limiting on the create endpoint to limit repeated abandoned holds. Confirm PayPal's processing fees and applicable accommodation/business taxes; this implementation does not calculate additional taxes or add surcharges. Current package amounts are the complete amounts used for deposits.

Set `BOOKING_ENABLED=false` to pause new payments. Webhook processing remains available for payments already in flight. After February 1, agree and implement the payment rule for late bookings before reopening them; this version continues using the 50% deposit and the stated balance deadline.

## Booking operations

- A server-side, conditional SQLite insert reserves one place atomically only when both the room limit and overall limit permit it. A shared room purchase is one BED, never the whole dorm.
- Abandoned `held` records expire after 15 minutes. Stock queries ignore expired holds.
- Before capture, an approved, unexpired hold becomes `processing`; processing reservations do NOT expire, preventing uncertain payments from releasing a place.
- Capture retries use the same PayPal request ID and retrieve order status first. Only a completed USD capture for the exact deposit amount marks a processing booking `paid`. Verified completion webhooks can finish this if the customer closes the page.
- `paid` and `processing` bookings both count against capacity. A capture does not reserve an additional place. Refreshing payment confirmation is idempotent.
- A verified completed deposit gives the guest a booking reference on the website. PayPal sends its payment receipt. This version has no separate automatic branded confirmation email or coach/admin dashboard.
- In the D1 console, view paid records using `SELECT id,room_id,status,total_cents,deposit_cents,balance_cents,promo_code,paypal_order_id,paid_at FROM bookings ORDER BY created_at DESC;`. Amounts are integer cents. Match the PayPal order/transaction to the buyer's email in PayPal before sending the balance invoice.
- For a `processing` booking, verify the order in PayPal before changing anything. A pending payment must stay allocated. If it completed, retry website confirmation or replay the verified webhook. If definitively declined/voided with no capture, an operator may set it to `cancelled`. Never release an uncertain transaction merely because time passed.
- Refunds, disputes, balance invoice payments, and room changes require manual reconciliation. Refund a confirmed cancelled booking through PayPal, then update its booking status if the place should be offered again. No automated refund/restock or automatic balance collection is implemented.
- Do not use independent no-code payment links in parallel with this checkout: they do not share this database's inventory.
- Preserve booking IDs as private references. Do not publish the database or grant anonymous access. No card details are stored by this website.

## Local validation

`npm run check` includes concurrent stock-allocation tests against real SQLite, server-side deposit checks, retry handling, and webhook rejection. These tests do not replace a sandbox end-to-end PayPal checkout. Static `npm run dev` serves the preview without Functions; Cloudflare bindings are needed for payment APIs. Payment functions must be compiled/deployed through Cloudflare Pages, alongside the existing OAuth functions.

## Direct card payments

Checkout also offers **Pay by debit or credit card** through PayPal JavaScript SDK v6. The existing client ID and secret are used server-side to obtain a browser-safe SDK token with `response_type=client_token&intent=sdk_init`; full-scope OAuth tokens and the client secret never go to the browser. PayPal renders the card number, expiry and CVV fields. Only billing country and optional postal code are ordinary page inputs. No card data is posted to our booking API.

Enable Expanded Checkout / Advanced Credit and Debit Card Payments in the same Sandbox app. The SDK checks `advanced_cards` eligibility before rendering the fields; if unavailable, the PayPal option remains. Creating a card order uses the same conditional seat allocation and authoritative deposit calculation. 3DS is requested when required, and a reported `liability_shift=NO` blocks capture. A successful SDK card submission must still be captured and verified server-side before the place is confirmed. Card form cancellation or a definitive failed submission releases an uncaptured hold; an uncertain outcome keeps the reference and directs the guest to payment status instead of a new charge.

Use PayPal's [sandbox card generator](https://developer.paypal.com/tools/sandbox/card-testing/) for card tests. Test successful approval, invalid details, 3DS cancellation and network interruptions as well as the original room/promotion tests. Actual live card acceptance requires PayPal approval/eligibility for the Live app. This does not integrate Apple Pay, Google Pay or Fastlane merely because their dashboard checkboxes are enabled.

## Attendee and cardholder names

Both payment methods require a guest full name and email address. Card checkout separately requires Name on card. Guest contact details are stored in the private `booking_guests` table, keyed to the booking ID; they are not stored in browser storage or returned by public availability APIs. Cardholder name is forwarded to PayPal as `payment_source.card.name` and is not stored in that table. The guest and payer may differ.

For existing databases the checkout creates the additive `booking_guests` table on first booking; no alteration of existing booking rows or manual migration is needed. The same table definition is provided in `migrations/0002_booking_guests.sql` for managed migrations. To find guest details for invoices use `SELECT b.id,b.status,g.full_name,g.email,b.balance_cents FROM bookings b LEFT JOIN booking_guests g ON g.booking_id=b.id ORDER BY b.created_at DESC;` in the private D1 console. Earlier test bookings may have no guest record. This does not add automatic confirmation emails; PayPal continues sending its own payment receipt to the payer.

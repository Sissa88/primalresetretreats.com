# Pricing, room photos, and the Book now button

## What was added

- `/pricing/`: a room-selection and pricing page based on the supplied reference at https://primal-reset-hawaii.pages.dev/book.
- `/book` and `/book/` redirect to `/pricing/` on Cloudflare Pages.
- A **Book now** header button across the website opens `/pricing/`.
- A **Pricing & rooms** link in the footer and mobile menu.
- Private and shared accommodation with room photographs from the reference site's linked accommodation page.
- A promotion calculator and planned deposit/balance breakdown.
- A retreat inquiry form that includes the selected room, estimated package/deposit/balance, and applied promotion code. It uses the configured contact form service (currently FormSubmit to the contact email, requiring activation). When no service is configured, the submit button stays disabled and the email address is shown instead.

This is a **pricing preview and inquiry flow**. It does not reserve inventory, create a Stripe checkout, collect card details, or charge any payment. There is no payment account connected. The public calculator is informational; its amounts must never be treated as an authority for charging a card.

## Edit the pricing page yourself

1. Open https://primalresetretreats-com.pages.dev/admin/ and sign in.
2. Refresh the editor after the new Cloudflare deployment succeeds, so the new collection appears.
3. Open **Pricing & rooms → Room prices, photos, and promotion**.
4. Under **The two room options**, expand **Private room** or **Shared bed**.
5. Edit **Package price per person (USD)** using a number only, for example `5850` (not `$5,850`). Edit the room name, description, planned allotment, features, and photos as needed.
6. Higher up, edit the retreat dates, planned deposit percentage, promotion code/percentage, and explanatory text.
7. Click **Publish / Publish now**. Cloudflare will build and deploy the update automatically.

The two room types must remain exactly two. Their hidden IDs keep the calculator stable. Each additional photo needs a short accurate description. Photographs illustrate accommodation types; exact room assignments remain unconfirmed.

**These prices belong to the new pricing page.** Existing custom pages or text manually entered elsewhere do not automatically synchronize. The retreat detail page still has its separately editable Price field under **Retreats**. Keep any separately written price/date descriptions consistent.

## Change or hide the Book now button

The button is already added; you don't need to insert HTML.

1. In `/admin/`, open **Website settings → Contact, forms, and domain**.
2. Change **Booking button text** if you prefer “View prices” or “Choose your room.”
3. Use **Show the booking button** to turn the header button on or off.
4. Publish and wait for Cloudflare to finish.

The destination stays `/pricing/` so the button always leads to the room-selection page. During the preview, “Book now” starts choosing a package; it does not mean that a booking or payment is available yet.

## Reference prices carried into this draft

Dates shown: January 15–21, 2027. Currency: USD. One guest per package selection.

| Room | Standard package | Planned 50% deposit | Package with 30% code | Planned discounted deposit | Discounted balance |
| --- | ---: | ---: | ---: | ---: | ---: |
| Private room | $5,850.00 | $2,925.00 | $4,095.00 | $2,047.50 | $2,047.50 |
| Shared bed | $5,200.00 | $2,600.00 | $3,640.00 | $1,820.00 | $1,820.00 |

The public preview promotion code from the supplied reference is `OPENGATEHOSTEL`. The planned allotments are 5 private rooms and 16 shared beds. These are not remaining inventory counts. Confirm all prices, dates, fees, inclusions, and promotion eligibility before opening bookings.

## How secure payments should work when connected

The recommended next integration is **Stripe Checkout**, using Cloudflare Pages Functions for the small amount of server-side code. You do not need to rent a separate server. Stripe charges transaction processing fees; free website hosting does not make payment processing free.

1. The guest selects a room and enters any promotion code.
2. A Cloudflare server-side function reads the approved room price, verifies the promotion and available inventory, and calculates the deposit. It ignores amounts sent from the browser.
3. That function creates a Stripe Checkout Session using a secret API key stored in Cloudflare's encrypted secrets. The browser is redirected to Stripe's HTTPS checkout page.
4. The guest enters card details **on Stripe**, not in your website or Formspree. Stripe handles card collection and applicable authentication checks.
5. Stripe sends a signed payment event to a separate Cloudflare webhook. The webhook verifies its signature and processes it only once before marking a reservation paid. A guest returning to a “success” page is not sufficient evidence of payment.
6. The confirmed booking record tracks the package total, deposit received, balance owed, room type, guest contact details, and agreed terms. Stripe deposits funds to the bank account configured in your Stripe business account, according to its payout schedule.
7. The remaining balance can be collected later using a Stripe-hosted invoice or another hosted checkout. The agreed due date and cancellation/refund terms need to be shown before the first payment.

For limited room capacity, the payment integration also needs a reservation hold/expiry mechanism and persistent inventory, for example Cloudflare D1, so two guests cannot pay for the last room simultaneously. Unpaid or expired checkout sessions release their holds. This is not provided by the current visual calculator.

Before activating payments, the next work is to connect your verified Stripe business account, confirm final package pricing/fees and booking policies, implement checkout/inventory/webhook handling, and test successful, failed, cancelled, and expired payments in Stripe test mode. The live site remains a preview until that integration is complete.

Never paste a Stripe secret key or webhook signing secret into the CMS, public JavaScript, GitHub, Formspree, or chat. Those belong in Cloudflare's encrypted runtime secrets. Publishable keys are different from secret keys.

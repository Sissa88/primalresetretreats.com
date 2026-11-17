# Private customer database and marketing consent

Customer profiles live in the existing private Cloudflare D1 binding `BOOKING_DB`. They are not published on the website or included in the source ZIP. All new tables and views are created automatically when the first inquiry or booking is processed; existing verified paid guests are copied into the contact directory without adding marketing consent; no existing booking tables are altered. Migration `0003_customers_and_marketing.sql` is also provided for managed migrations.

## What is stored

- **Paid guests:** attendee name and email; a guest profile is synchronised after verified payment, including verified webhook retries. An abandoned checkout does not become a paid customer profile.
- **Retreat inquiries:** name, email, age, country and optional phone. The message body stays in the existing email/form service rather than this database. With JavaScript, the browser submits to the website’s same-origin /api/contacts/send endpoint. The server forwards to FormSubmit using its JSON API and returns to the website thank-you page only after an explicit success acknowledgement. Native redirect controls are not forwarded to the JSON API. Submission references and payload hashes prevent repeat delivery; raw messages are not stored in that delivery table. The native form action and its _next field remain a fallback. Coach applications continue their existing email flow and are not added to the customer database.
- **Marketing:** separate optional, unchecked consent. It records wording, version, timestamp and source. Providing booking details or permission to reply to an inquiry is not marketing consent.
- No card numbers, security codes or PayPal passwords are stored here. Cardholder names remain separate from guest profiles.

The booking opt-in says the person checking it is the guest named above, so someone paying for another person should not opt that person in on their behalf.

## View the data

Cloudflare → Storage & databases → D1 → `primal-retreat-bookings-live` → Console.

All customers (PRIVATE; not a marketing mailing list):

```sql
SELECT * FROM customer_directory ORDER BY updated_at DESC;
```

Only active marketing subscribers:

```sql
SELECT * FROM marketing_contacts ORDER BY consented_at DESC;
```

This opt-in is for email only, not marketing calls or SMS. The marketing view omits phone and age and automatically excludes unsubscribed people. Re-export before every campaign. A previously downloaded CSV will not update itself when someone unsubscribes. When moving to a mailing platform, also use its suppression/unsubscribe list. An unchecked opt-in does not revoke an earlier subscription; the unsubscribe link or a direct request does.

Every marketing export includes `unsubscribe_path`, e.g. `/unsubscribe/?token=...`. Prefix it with your current website origin and include that individual link in the recipient's email. Opening the page does not change preferences until the person clicks Unsubscribe, protecting against automatic email-link scanning. Unsubscribe stops marketing without cancelling the booking. No newsletter sending service or automated campaign has been connected. Consent is self-declared; an email platform can additionally confirm email ownership before sending campaigns.

## Download a database file and CSV

If the Cloudflare dashboard provides CSV download for a query result, use the marketing query above. Otherwise, on your own computer after `npx wrangler login`, export a private SQL backup:

```sh
npx wrangler d1 export primal-retreat-bookings-live --remote --output=customer-backup-private.sql
```

Turn that SQL backup into a local SQLite file:

```sh
python3 -c "import sqlite3,pathlib; db=sqlite3.connect('customer-backup-private.sqlite3'); db.executescript(pathlib.Path('customer-backup-private.sql').read_text()); db.close()"
```

Then use the included exporter (active marketing subscribers only by default):

```sh
python3 scripts/export-customer-csv.py customer-backup-private.sqlite3 marketing-subscribers-private.csv
```

For a customer-service export including nonsubscribers, use `--all`. That file is NOT a marketing list.

`database/customer-database-template.sqlite3` is an empty, local template with the same tables and views. It contains no live customers. It can be opened with a SQLite viewer. Rebuild it with `python3 scripts/create-customer-template.py`.

Keep real SQL/SQLite backups and CSV exports off GitHub and outside `public/`. The repository ignores common private backup/export filenames. Deletion and correction requests are handled by the business at info@primalresetretreats.com; do not delete required booking/payment records automatically. An unsubscribe updates marketing preferences and retains minimal consent history.

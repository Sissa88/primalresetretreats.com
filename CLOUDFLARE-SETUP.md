# Put Primal Reset on your existing Cloudflare account

This project is prepared for **Cloudflare Pages + GitHub + Decap CMS**. Hosting and the editor have free plans. Formspree's free plan currently allows **50 submissions per month across the account**, with a 30-day submission archive. Domain registration/renewal is separate. Do not enable a paid Cloudflare plan for this setup.

## 1. Connect the repository to Pages

The repository is `Sissa88/primalresetretreats.com`, branch `main`. It must contain this project before Cloudflare can build it.

1. Sign in to your existing account at https://dash.cloudflare.com/.
2. Open **Workers & Pages**. Choose **Create application** (sometimes **Create**), then select **Pages** / **Get started** and **Connect to Git** / **Import an existing Git repository**. Choose Pages, rather than a Workers-only project.
3. Connect your GitHub account. When asked, allow the Cloudflare GitHub app access to **only this repository**.
4. Select `primalresetretreats.com`.
5. Set these build options:

   | Setting | Value |
   | --- | --- |
   | Project name | `primal-reset-retreats` (or another available name) |
   | Production branch | `main` |
   | Framework preset | `None` |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Root directory | Leave blank |
   | Build environment variable | `NODE_VERSION` = `22` |

6. Choose **Save and Deploy**. The first build installs the dependency from `package-lock.json`, builds the static pages, and includes the two Pages Functions used for editor login.
7. Open the `https://YOUR-PROJECT.pages.dev` URL Cloudflare returns. Check Home, The Men's Rebirth, and Coach with Us. Forms intentionally say “Inquiries opening soon” until step 4.

**Use Git integration, not drag-and-drop upload.** Publishing an edit in Decap writes to GitHub; the Git integration then automatically builds and updates the site. A drag-and-drop project won't provide that update flow.

## 2. Add your domain (after checking the pages.dev preview)

1. In your Pages project, open **Custom domains → Set up a domain**.
2. Enter `primalresetretreats.com` and follow Cloudflare's instructions. If this domain already uses the same Cloudflare account's nameservers, Cloudflare can create the required DNS record.
3. Check any existing web record before replacing it: this moves the website from its previous host. Keep your email/MX records intact.
4. Add `www.primalresetretreats.com` too if you want that address. Use the non-www address as the main editor address in the next step.

You can skip this step for now and use your `pages.dev` address free. The next step works with either address; choose **one** main address and use it consistently.

## 3. Enable your editing dashboard — one-time login setup

Decap uses your GitHub login. The supplied Pages Functions handle authentication in your own Cloudflare project; you don't need to rent a server or pay for an authentication service.

### Create a GitHub OAuth app

1. In GitHub, open **Settings → Developer settings → OAuth Apps → New OAuth App**, or https://github.com/settings/applications/new.
2. Fill in:

   - **Application name:** `Primal Reset Editor`
   - **Homepage URL:** your main website address, for example `https://primalresetretreats.com`
   - **Authorization callback URL:** the same address plus `/api/callback`, for example `https://primalresetretreats.com/api/callback`
   - Leave device flow disabled.

3. Register the app. Copy its **Client ID** and generate a **Client secret**.

### Add its settings to Cloudflare

In your **Pages project → Settings → Variables and Secrets**, add these for **Production**:

| Name | Type | Value |
| --- | --- | --- |
| `SITE_URL` | Plain text | Your main HTTPS address, with no path, for example `https://primalresetretreats.com` |
| `GITHUB_CLIENT_ID` | Plain text | The Client ID from GitHub |
| `GITHUB_CLIENT_SECRET` | **Secret/encrypted** | The Client secret from GitHub |

These must be available to the **Pages Functions runtime**, not only to an external build tool. Leave preview deployments without these credentials; editor login is intentionally limited to the configured production address.

**Keep the client secret in Cloudflare only. Do not put it in GitHub files, the CMS settings, screenshots, or chat.**

In **Deployments**, retry/redeploy the latest production deployment after saving the variables. Then:

1. Open `https://YOUR-MAIN-ADDRESS/admin/`.
2. Click **Login with GitHub** and authorize the OAuth app.
3. Sign in with the GitHub account that owns or has write access to `Sissa88/primalresetretreats.com`.

The current setup uses GitHub's `public_repo` OAuth scope because this is a public website repository. GitHub's OAuth scope grants write access to public repositories accessible to your account, not only this repository; Decap is configured to edit only this one. If you make the repository private, this setup needs its scope changed to `repo` in **both** the CMS config and `functions/api/auth.js`, followed by reauthorization. For this simple public site, leave it public and keep secrets out of it.

If you change from `pages.dev` to your custom domain later, change **both** `SITE_URL` in Cloudflare and the OAuth app's Homepage/callback URLs in GitHub, redeploy, and sign in at the new `/admin/` address. A different hostname intentionally cannot complete login.

## 4. Activate contact email delivery

The contact forms now use **FormSubmit** and send to `info@primalresetretreats.com`. No Formspree account is required for the default setup.

1. After the deployment finishes, open your website and click **Contact us**.
2. Submit one test inquiry using your own details. Complete the spam check if shown.
3. Open the `info@primalresetretreats.com` inbox and look for the FormSubmit activation email. Check Spam/Junk too.
4. Click the email verification/activation link.
5. Submit a second test inquiry. Confirm that it arrives in your inbox and that replying addresses the person who submitted it.

Until you activate the recipient email, delivery is not verified. I cannot read this inbox or click its activation link for you. FormSubmit may show a verification-pending screen on the first submission. The existing mailbox must already work independently of Cloudflare Pages.

The forms collect name, email, country of residence, an optional phone/WhatsApp number, and a message. Retreat inquiries additionally require an age from 29 to 60. They request contact permission and use FormSubmit's default spam check plus a honeypot. No date of birth or card details are collected. The pricing page also includes the selected room and informational quote in its inquiry.

Under **Website settings → Contact, forms, and domain**, the **Contact form service** selects FormSubmit or disables the online form. Changing the contact email requires verifying that new recipient. Existing Formspree IDs still take priority if you enter them; the destination of those forms is managed in your Formspree account.

## Everyday editing — no code

Open your website address followed by `/admin/` and sign in with GitHub.

- **Edit room prices or photos:** **Pricing & rooms → Room prices, photos, and promotion**. Expand either room, update its fields, and publish. The Home navigation’s Rooms & pricing link leads to this page; other pages also have a Book now button. See `PRICING-AND-PAYMENTS.md` for details.
- **Edit the FAQ:** **Frequently asked questions → Questions and answers**. Expand an answer, edit it, and publish. You can add, remove, or reorder questions.
- **Edit Dan’s founder profile:** **Founder profile → Dan’s biography and portrait**. Upload the photo when ready; until then, a portrait placeholder is shown beneath the coaches. The same profile updates Home and the retreat page.
- **Edit coach bios and portraits:** **Coach profiles → Photos and biographies**. Expand a coach, edit their biography/title/photo, and publish. The same profiles update Home and the retreat page together.
- **Change existing words/photos:** **Existing pages → Home** or **Coach with us**. Expand **Page text** to find the text by its current wording. Expand **Page images** to upload/replace an image and describe it for accessibility. Keep the existing entries; edit their values.
- **Edit an individual retreat logo:** in **Retreats**, open that retreat and use **This retreat’s own logo**. This changes only its page and listing; the website brand and favicon stay separate.
- **Update the first retreat:** **Retreats → The Men's Rebirth**. Edit title, summary, hero image, dates, duration, location, capacity, and price. Its original detailed sections are under **Page text**; extra content can go into **Retreat description**. The first retreat's “show on website” switch also controls whether its page is generated.
- **Add another retreat:** **Retreats → New Retreat**. Fill in the fields, upload a photo, and write the description in the visual editor. Leave **Show on website** enabled. Publishing creates its page and adds a card to Home automatically. New retreats share the inquiry form on Home.
- **Add another page:** **Additional pages → New Additional page**. Give it a title and write its content. Published pages appear in the footer. Avoid page names `Admin`, `API`, `Retreats`, `Pricing`, and `Book`, which are reserved.
- **Publish an edit:** choose **Publish** / **Publish now**. This saves a GitHub commit. Cloudflare then deploys the update automatically, usually within a few minutes. Refresh your public page after Cloudflare reports success. Changes on your screen aren't live until publishing and deployment finish.
- **View messages:** use your email inbox. The CMS stores website content, not contact submissions.

Use a regular sized JPEG/WebP photo rather than a very large original camera file. Uploaded media is stored in the GitHub repository and published with the site; it is public. Do not upload private participant documents.

## Before opening publicly

Keep the concept labels until dates, prices, activities, coach participation, and policies are confirmed. Reconcile the current “seven days / seven nights” lodging copy. No refund, booking, or privacy terms have been invented. Publish your actual policies using **Additional pages** when available.

Search indexing has been enabled at the owner’s request. The public site URL currently uses the Pages address. Publishing generates `sitemap.xml` and updates `robots.txt`. If you connect a custom domain, update the Public website URL in Website settings to that domain. This setting is a crawler instruction, not access protection; a Pages preview URL is publicly accessible.

## Troubleshooting

- **Repository not listed in Cloudflare:** adjust the Cloudflare GitHub app installation to include this repository.
- **Build fails:** use Node 22 and build command `npm run build`, output `dist`. Check the deployment log. A failed build leaves the previous successful deployment live.
- **Editor says login is unconfigured:** add all three runtime variables above and redeploy.
- **Login domain error or callback mismatch:** use the exact same HTTPS address for the browser, `SITE_URL`, and GitHub callback origin. The callback path is `/api/callback` with no trailing slash.
- **Login succeeds but access is denied:** your GitHub account needs write access to this repository. Check which GitHub account is signed in.
- **Editor can't load:** it loads a version-pinned Decap bundle from jsDelivr; check your connection or content blocker.
- **Saved content doesn't appear:** check Cloudflare's latest deployment. A CMS edit is not a live deployment until that build succeeds.
- **No inquiry emails arrive:** check the recipient inbox and Spam/Junk for FormSubmit activation. Activate the address and send another test. Also check which provider/IDs are selected in Website settings.

Official references:

- Cloudflare Git setup: https://developers.cloudflare.com/pages/get-started/git-integration/
- Cloudflare custom domains: https://developers.cloudflare.com/pages/configuration/custom-domains/
- Decap GitHub login: https://decapcms.org/docs/github-backend/
- Formspree free allowance: https://formspree.io/plans

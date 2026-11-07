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

## 4. Turn on email delivery for the forms

1. Create a free account at https://formspree.io/ and verify the email address that should receive inquiries.
2. Create two forms: **Retreat inquiries** and **Coach applications**.
3. Each form has an endpoint such as `https://formspree.io/f/abcdefgh`. Copy only its final ID, `abcdefgh`.
4. Open your site's `/admin/` dashboard. Go to **Website settings → Contact, forms, and domain**.
5. Enter the retreat form ID and coach form ID in their matching fields. Add your contact email and public website URL.
6. Click **Publish**. Wait for the Cloudflare deployment to finish.
7. Send one test inquiry through each form and check that the message reaches your inbox and the Formspree dashboard. Test submissions count toward the free allowance.

Messages go directly to Formspree, not into GitHub or browser storage. If a send fails, the form keeps its text and displays an error. No payment is collected. If you reach the free submission limit, check Formspree's dashboard and plan limits; do not assume an inquiry was delivered without checking.

## Everyday editing — no code

Open your website address followed by `/admin/` and sign in with GitHub.

- **Change existing words/photos:** **Existing pages → Home** or **Coach with us**. Expand **Page text** to find the text by its current wording. Expand **Page images** to upload/replace an image and describe it for accessibility. Keep the existing entries; edit their values.
- **Update the first retreat:** **Retreats → The Men's Rebirth**. Edit title, summary, hero image, dates, duration, location, capacity, and price. Its original detailed sections are under **Page text**; extra content can go into **Retreat description**. The first retreat's “show on website” switch also controls whether its page is generated.
- **Add another retreat:** **Retreats → New Retreat**. Fill in the fields, upload a photo, and write the description in the visual editor. Leave **Show on website** enabled. Publishing creates its page and adds a card to Home automatically. New retreats share the inquiry form on Home.
- **Add another page:** **Additional pages → New Additional page**. Give it a title and write its content. Published pages appear in the footer. Avoid page names `Admin`, `API`, and `Retreats`, which are reserved.
- **Publish an edit:** choose **Publish** / **Publish now**. This saves a GitHub commit. Cloudflare then deploys the update automatically, usually within a few minutes. Refresh your public page after Cloudflare reports success. Changes on your screen aren't live until publishing and deployment finish.
- **View messages:** use your email inbox or the Formspree dashboard, not Decap.

Use a regular sized JPEG/WebP photo rather than a very large original camera file. Uploaded media is stored in the GitHub repository and published with the site; it is public. Do not upload private participant documents.

## Before opening publicly

Keep the concept labels until dates, prices, activities, coach participation, and policies are confirmed. Reconcile the current “seven days / seven nights” lodging copy. No refund, booking, or privacy terms have been invented. Publish your actual policies using **Additional pages** when available.

When ready for search engines, set your final **Public website URL** and turn on **Allow search engines to index this site** under Website settings. Publishing then generates `sitemap.xml` and updates `robots.txt`. This setting is a crawler instruction, not access protection; a Pages preview URL is publicly accessible.

## Troubleshooting

- **Repository not listed in Cloudflare:** adjust the Cloudflare GitHub app installation to include this repository.
- **Build fails:** use Node 22 and build command `npm run build`, output `dist`. Check the deployment log. A failed build leaves the previous successful deployment live.
- **Editor says login is unconfigured:** add all three runtime variables above and redeploy.
- **Login domain error or callback mismatch:** use the exact same HTTPS address for the browser, `SITE_URL`, and GitHub callback origin. The callback path is `/api/callback` with no trailing slash.
- **Login succeeds but access is denied:** your GitHub account needs write access to this repository. Check which GitHub account is signed in.
- **Editor can't load:** it loads a version-pinned Decap bundle from jsDelivr; check your connection or content blocker.
- **Saved content doesn't appear:** check Cloudflare's latest deployment. A CMS edit is not a live deployment until that build succeeds.
- **Inquiries still say “opening soon”:** publish both form IDs, then wait for the next deployment.

Official references:

- Cloudflare Git setup: https://developers.cloudflare.com/pages/get-started/git-integration/
- Cloudflare custom domains: https://developers.cloudflare.com/pages/configuration/custom-domains/
- Decap GitHub login: https://decapcms.org/docs/github-backend/
- Formspree free allowance: https://formspree.io/plans

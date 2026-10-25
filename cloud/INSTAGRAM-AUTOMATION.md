# Level Up Instagram automation

Owner dashboard: https://leveluphypertrophy.com/admin/?instagram=setup

Uses the existing owner Google session and server-side ADMIN_EMAILS authorization. No Instagram tokens or app secrets are exposed to the browser. No change to consumer workouts or nutrition.

## Meta activation

1. In the owner's Meta developer account, create/configure an app supporting Instagram API with Instagram Login. Use the Level Up professional Instagram account as the app's authorized test/owned account. Follow the permissions available in the current Meta dashboard; this implementation uses the supported Instagram Login scopes `instagram_business_basic` and `instagram_business_manage_comments`.
2. Add the exact OAuth redirect `https://api.leveluphypertrophy.com/v1/instagram/callback`.
3. Configure these Cloudflare Worker secrets through Cloudflare's protected interface (never the repository, dashboard JS or chat): `INSTAGRAM_APP_ID` (Instagram app/client ID), `INSTAGRAM_APP_SECRET` (matching Instagram app secret), `INSTAGRAM_VERIFY_TOKEN` (a newly generated random webhook verification secret). The app secret also encrypts stored tokens; rotating it requires reconnecting Instagram.
4. Set the Instagram webhook callback to `https://api.leveluphypertrophy.com/v1/instagram/webhook`, using the same verification secret. Subscribe to `comments`.
5. Open the owner dashboard's Instagram tab and Connect Instagram. OAuth exchanges the code server-side, obtains a long-lived token and subscribes the connected account to comment webhooks.
6. Create a rule for a selected post with its keyword, DM message and existing public HTTPS workout link. Enable it. Test with a comment from an ordinary account, verify DM receipt and dashboard delivery status. Test a second notification for the same comment; it must not send again. If Meta restricts non-role users, complete the required permissions/access review in the app dashboard before treating it as launched. Do not assume Standard Access alone proves general-audience delivery.

No email to Meta is normally necessary. Any support submission must describe an observed setup failure, rather than requesting unspecified permission. Account login, developer terms and permission approval must be completed by the owner when required.

## Behavior

- Whole-word, case-insensitive keywords; supports Unicode words and literal punctuation.
- Only selected posts owned by the connected account; no Live comments or unsolicited DMs.
- One initial text DM containing the routine URL. Optional public reply is sent only after the DM succeeds.
- First matching active rule wins. Delivery history is keyed uniquely by comment ID.
- A minute cron drains at most ten queued matches each run. Before sending, the service verifies the comment's timestamp, media and keyword against Meta. Seven-day expiry is enforced.
- Durable state is committed before each send. Ambiguous sends become `unknown` and are never automatically resent; this trades occasional missed delivery for duplicate prevention. Explicit rate-limit rejections queue for another minute. Interrupted verification can be retried; interrupted sending cannot.
- Disconnect unsubscribes webhooks, removes the stored token and pauses every rule. App permissions can also be revoked in Instagram.
- Tokens refresh weekly while the Worker is active. Expiry is shown in the dashboard; reconnect if refresh fails and the token expires.
- Log metadata is retained for 90 days; full comment text is not stored. Removing old deduplication rows cannot resend expired comments because the original timestamp is reverified.

## Deployment and validation

Migration `0030_instagram_automation.sql` creates four isolated tables. Existing GitHub Actions applies D1 migrations and deploys the Worker on changes under `cloud/`. GitHub Pages publishes the dashboard with the rest of main.

Run `node --test tests/instagram-automation.test.mjs` from the repository root and `npm run check` from cloud. The regression suite currently has 68 pre-existing failures on the baseline commit (26de5642); verify that no new failures appear.

Meta references: https://developers.facebook.com/documentation/instagram-platform/private-replies and https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/business-login

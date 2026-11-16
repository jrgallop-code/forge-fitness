# Coach invitation: Sign in with Apple (web)

This feature is gated. Neither the email's **Sign in with Apple** action nor the web login becomes active until Apple Developer configuration is complete. Do **not** set a made-up Services ID.

## Apple Developer setup (Account Holder/Admin)

1. In Apple Developer → Certificates, Identifiers & Profiles → Identifiers, open the Level Up iOS App ID `com.leveluphypertrophy.app` and confirm **Sign in with Apple** is enabled as a primary App ID.
2. Create or edit a **Services ID** (web client identifier) and associate it with the same primary iOS App ID. Under Sign in with Apple website configuration, register domain `leveluphypertrophy.com` and return URL `https://leveluphypertrophy.com/coach-join.html`.
3. Set Cloudflare Worker environment variables `APPLE_WEB_CLIENT_ID` to **the exact registered Services ID**, and `APPLE_WEB_REDIRECT_URI` to `https://leveluphypertrophy.com/coach-join.html`. Never put your Apple private key in the website HTML or Git.
4. Retain the existing `APPLE_TEAM_ID`, `APPLE_KEY_ID` and `APPLE_PRIVATE_KEY` as server-side secrets. Confirm that the key supports Sign in with Apple. Never put them in source or HTML.
5. Visit `https://api.leveluphypertrophy.com/v1/coach/apple-web/config`; `enabled: true` means the web option can display. **This alone does not confirm Apple login works**.
6. Run an end-to-end test using an **already existing iOS Sign in with Apple account**, including Hide My Email. Verify the web login returns exactly that existing Level Up user ID, no new users appear, the invitation's contact address mismatch is clearly displayed, and coach access is granted only after explicit consent.
7. Verify invalid state/nonce, wrong Service ID, expired invitation, and nonexistent Apple user all fail closed. Keep release disabled until these tests pass.

## Design safeguards

- Apple web identity tokens must have a valid Apple signature, expected web Services ID audience, current timestamp, and matched nonce.
- Server redeems the one-time Apple authorization code and verifies the returned identity matches the initial token.
- The web route selects only existing user `apple:<sub>`; it **never creates or merges a user by email**.
- Coach invitation acceptance still requires invitation token, consent to the three required categories, and explicit identity-email-mismatch confirmation.
- An invitation email shows the Apple action only if web Apple configuration exists, preventing an unusable email link before setup.
- Native iOS Apple login behavior and credentials remain unchanged.

Apple reference: https://developer.apple.com/help/account/capabilities/configure-sign-in-with-apple-for-the-web/

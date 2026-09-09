# Level Up iOS packaging

Level Up uses Capacitor to package the same local HTML, CSS, JavaScript, and image assets as the PWA. The iOS app does not point its main WebView at the hosted website.

## Project identity

- App name: `Level Up`
- Provisional bundle ID: `com.leveluphypertrophy.app`
- Minimum iOS version: iOS 15 (Capacitor 8)
- Web asset output: `www/` (generated and not committed)
- Native project: `ios/` (committed)

The bundle ID can be changed before it is registered in the Apple Developer account or uploaded to App Store Connect.

## Refresh the iOS project after web changes

```bash
npm ci
npm run cap:sync:ios
```

This recreates `www/`, copies it into the native app, and updates native dependencies. The GitHub Pages PWA continues to publish directly from the repository root.

## Free cloud build

The `iOS Capacitor Build` GitHub Actions workflow runs on a standard `macos-26` runner. It installs the pinned dependencies, syncs the PWA into Capacitor, runs the native packaging checks, resolves Swift packages, and compiles an unsigned iOS Simulator build.

The workflow runs when relevant files change on this branch, on relevant pull requests to `main`, after relevant changes reach `main`, or when started manually from the repository's Actions page. It uses read-only repository permissions and does not receive Apple credentials.

The current public repository can use GitHub's standard macOS runner without a cloud-compute charge. Do not switch this workflow to a GitHub larger runner unless paid compute is intentionally required.

## App Store signing stage

The unsigned cloud build verifies that the generated Xcode project compiles, but Apple signing and App Store upload require an active Apple Developer membership. The manual `iOS App Store Release` workflow is prepared for this stage and uses a protected GitHub environment named `app-store`.

Create these four encrypted secrets in the `app-store` environment:

- `APPLE_TEAM_ID`: the 10-character Membership/Team ID from the Apple Developer membership page.
- `APP_STORE_CONNECT_KEY_ID`: the Key ID shown for the App Store Connect team API key.
- `APP_STORE_CONNECT_ISSUER_ID`: the Issuer ID shown on App Store Connect's Integrations page.
- `APP_STORE_CONNECT_PRIVATE_KEY`: the complete contents of the downloaded `AuthKey_*.p8` file, including its BEGIN and END lines.

The private key can be downloaded only once. Store it securely, add it directly to the encrypted GitHub environment secret, and never paste it into chat or commit it to the repository. The release workflow writes it to a temporary credential file, signs and exports the app with automatic signing, uploads the IPA to App Store Connect, and deletes the temporary key even if the workflow fails.

Before the first release run, register `com.leveluphypertrophy.app` as the app's Bundle ID and create the matching Level Up app record in App Store Connect. Each release uses the GitHub Actions run number as an increasing iOS build number.

## Build and submit on macOS

1. Install Xcode 26 or newer and its command-line tools.
2. Run `npm ci` and `npm run cap:sync:ios`.
3. Run `npm run cap:open:ios`.
4. In Xcode, select the developer team and confirm the bundle ID.
5. Test sign-in, barcode scanning, photo selection, workout logging, nutrition logging, backup/restore, external links, and offline relaunch on both a simulator and a physical iPhone.
6. Create an Archive in Xcode, validate it, and upload it to App Store Connect.

## App Review readiness

- The iOS build offers Level Up's first-party email login and does not present Google as primary-account authentication. The PWA can continue to offer Google login without changing the native review path.
- Reviewers can choose **Continue without an account** and use the app's core workout, nutrition, and progress features with data stored locally. A review account is only needed to test cloud backup, restore, and account deletion.
- Account & Cloud includes an in-app permanent account-deletion flow.
- Optional account-linked analytics require an explicit opt-in and can be disabled later under **More → Account & Cloud**.
- Create the App Store privacy answers, screenshots, description, support URL, privacy-policy URL, and review notes. Supply App Review with a working review account so the cloud flows can be tested, and note that no account is required for local use.
- Complete physical-device testing and Apple code signing. Those final steps require macOS/Xcode or a macOS CI service plus an Apple Developer membership.

## Sign in with Apple account-deletion setup

The app sends Apple's one-time authorization code to the backend. The backend exchanges it for an encrypted refresh token and revokes that token before deleting an Apple-linked account. Before deploying the updated Worker:

1. Apply `cloud/migrations/0019_apple_credentials.sql` to the production D1 database.
2. Create a Sign in with Apple private key in the Apple Developer portal for this app's identifier.
3. Configure the Worker secrets `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`, and `APPLE_TOKEN_ENCRYPTION_KEY`. Use a stable random 32-byte base64 or base64url value for the encryption key.
4. Confirm `APPLE_CLIENT_ID` is the app bundle ID, `com.leveluphypertrophy.app`, unless the registered identifier changes.
5. Test a new Apple sign-in followed by in-app account deletion on a physical device. A revocation failure intentionally stops deletion and asks the user to retry, preventing an orphaned Apple authorization.

The App Store Connect upload key described above and the Sign in with Apple authentication key are separate credentials and should remain separately scoped.

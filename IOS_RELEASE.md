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

The unsigned cloud build verifies that the generated Xcode project compiles, but Apple signing and App Store upload require an active Apple Developer membership. When that account is ready, create a protected GitHub environment named `app-store` and store the Apple Team ID, App Store Connect API key ID, issuer ID, and private `.p8` key as encrypted environment secrets. Add the release workflow only after those values exist; never commit them to the repository.

## Build and submit on macOS

1. Install Xcode 26 or newer and its command-line tools.
2. Run `npm ci` and `npm run cap:sync:ios`.
3. Run `npm run cap:open:ios`.
4. In Xcode, select the developer team and confirm the bundle ID.
5. Test sign-in, barcode scanning, photo selection, workout logging, nutrition logging, backup/restore, external links, and offline relaunch on both a simulator and a physical iPhone.
6. Create an Archive in Xcode, validate it, and upload it to App Store Connect.

## Submission blockers to finish before App Review

- Replace the disabled “Apple — Coming soon” option with Sign in with Apple, or remove third-party Google sign-in from the iOS build. Apple generally requires an equivalent privacy-preserving login option when another social login is offered.
- Add an in-app account-deletion flow. Apple requires apps that support account creation to let users initiate deletion inside the app.
- Create the App Store privacy answers, screenshots, description, support URL, and review notes. Supply App Review with a working demo account because Level Up requires sign-in.
- Complete physical-device testing and Apple code signing. Those final steps require macOS/Xcode or a macOS CI service plus an Apple Developer membership.

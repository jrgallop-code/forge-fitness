# Exercise thumbnail verification — October 20, 2026

iOS branch: `ios/capacitor-app-store`. Production `main` was not modified.

## Installed library

- 343/343 canonical exercise IDs have valid, exercise-specific thumbnail mappings.
- 287 exercises use video-derived imagery; 56 use custom artwork in at least one selection.
- 49 new anatomical illustrations were installed, including replacements for unsuitable video mappings.
- All 418 referenced image files decode and were reviewed in contact sheets for male/female selections.
- The original generic SVG remains visible during image loading and on failure. A conflicting CSS rule that hid it prematurely was removed.
- The extraction inventory now uses the same catalogue module URL as the expansion module. The previous mismatch silently omitted 78 expanded exercises.
- Reviewed custom overrides survive future frame extraction.
- Inventory: [inventory.json](inventory.json). Gallery: [index.html](index.html). Generation prompts: [custom-art-prompts.json](custom-art-prompts.json).

## Verified results

- [Browser validation](https://github.com/jrgallop-code/forge-fitness/actions/runs/39523032891): 343 male and 343 female image selections loaded at a mobile viewport; SVG error fallback remained visible. The screenshots use the shared renderer and stylesheet, rather than a walkthrough of the app's individual flows.
- Shared-renderer integration reviewed in the builder catalogue, manual routine editor, workout plan details, and in-session exercise selection.
- iOS simulator compilation succeeded.
- [Signed release 320](https://github.com/jrgallop-code/forge-fitness/actions/runs/39523569942): 115 release checks passed; archive, export, signatures and upload succeeded.
- The signed IPA manifest and all 418 referenced images matched the reviewed repository files byte-for-byte.
- Apple returned build `320`, ID `9d515e0b-852c-47b0-90ad-a57f12029c82`, `processingState: VALID`, `expired: false`, `internalBuildState: IN_BETA_TESTING`. Internal TestFlight availability is confirmed.

## Remaining verification limits

- A physical-iPhone walkthrough of every builder, saved-workout, Modify Workout, and Add Exercise flow was not performed. Browser component checks and signed-IPA checks do not establish that walkthrough.
- The complete repository suite has 75 pre-existing failures on both the untouched starting commit and this implementation (baseline: 984 pass / 75 fail; implementation: 985 pass / 75 fail). No new failures were introduced. All 115 release-specific checks passed.

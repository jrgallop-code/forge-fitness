# PWA food and timed exercise parity — 2026-10-15

Ported the iOS food editor through build 265: generic food images and neutral fallback, direct amount entry and unit buttons, counted servings and egg sizes, stable mass conversions, macro pie/legend and swipeable bars with dashboard colors, reliable exits, and 13 numerical portion guide comparisons with matching offline photos. These components and food-log integration match iOS.

Custom exercise creation offers Reps or Time (seconds). Time uses the existing PWA static hold logger, timers, history and progress. Existing custom exercises remain rep based. Native lock screen timer integrations stay on the iOS branch.

Photo logging and saving exercise videos were not ported. No native wrapper, native importer, video saving, or photo logging modules are added. Existing PWA features remain intact.

The service worker generation advances and precaches the new food modules, CSS and reference images.

Validation: 128 focused tests pass. Full suite: 898 pass / 67 fail, versus baseline 871 pass / 67 fail; identical failure names and no new failures. Existing failures include obsolete release cache assertions and unrelated modules. Physical/browser visual QA was not performed in this environment.

## Blank food quantities

New food quantities start blank. Changing any unit or serving clears and focuses the input. A reference weight/volume for one selected portion remains visible below, including 1 g for grams. Blank quantities show no validation error, leave calories/macros empty and disable saving. Reopening existing entries restores their saved amount. 114 focused food tests pass. This behavior also ships to iOS.

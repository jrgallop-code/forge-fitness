# iOS food editor trial — October 15, 2026

Only the `ios/capacitor-app-store` branch includes this trial. Do not copy to the production PWA until John has tested it.

Features: representative category photo headers; editable amount and quick g/oz/lb/mL/serving buttons; unit changes preserve measured amounts and live nutrition; 100g-only foods open as direct grams; original portion options remain in the dropdown; swipeable portion guide with approximate meat/cards, rice/tennis-ball, cheese/dice, and tablespoon/teaspoon references. Pictures are original generated assets bundled locally, approximately 636 KB total. Colors use existing appearance variables.

Integration: `food-log.js`, `food-portion-editor.js`, `food-portion-units.js`, `food-photo.js`, `food-portion-editor.css`, the food-log CSS import, and `assets/food/*.webp`. Applies to adding foods, editing diary entries, and saved-meal item editors. No server or database schema changes. Existing saved portions and IDs retain their ordering. Only established weight/volume bridges can preserve quantities across different portion types; otherwise the editor explicitly resets to 1. Existing estimated liquid conversions remain labeled as estimates.

Verification: food data/UI/unit tests plus native packaging tests (111 passing); generated local Capacitor bundle. Browser screenshot QA was unavailable because the Chromium download failed. Physical iOS testing should cover search, barcode, legacy gram entries, My Foods, saved-meal editing, all appearances, keyboard and smaller screens, guide scrolling/closing, and save/reopen.

The production PWA and lifting-goal scoring are unchanged.

## Follow-up: compact layout and photo accuracy

The next iOS build replaces boxed amount/macros with a compact photo-header editor, inline amount/unit controls, and a single swipeable macro section. Page one shows a pie chart, grams, and calorie shares (4 kcal/g protein/carbs, 9 kcal/g fat). Page two shows this food's contribution to saved daily macro targets, or explicitly labeled calorie shares if targets are unavailable. Colors derive from the active appearance. Native horizontal scrolling, keyboard arrows and pagination buttons share one scroll position; changing amounts updates the chart without rebuilding it.

The portion guide is now a shorter bottom sheet with wooden reference cards, neighboring-card previews, dots, one close control and one accuracy note. Additional photo assets include blueberries, strawberries, bananas, apples, cheddar, oatmeal, shrimp, black coffee and milk. Photo matching uses the food name only; ambiguous/unsupported names and composite foods use a neutral plate illustration instead of an unrelated food. The old hidden preview row is removed to prevent redundant totals.

Validation: 116 unit/UI/native packaging tests passing. Local visual browser navigation was blocked by connection refusal; physical TestFlight review remains necessary for mobile layout and gestures. This follow-up remains iOS-only.

## Controls, conversion precision and guide expansion

Food quantity now has a flexible wider column. The photo owns the close button below the native status area, with a separate bottom Cancel/Back button. Closing an edited diary item returns to the diary; other contexts return to food selection or meal building. Unit conversion retains the original quantity and text rather than repeatedly converting rounded display values; manual edits and restored entries establish a fresh reference. Converted gram/mL amounts display up to two decimals, and ounces/pounds up to four, without trailing zeroes.

The offline guide now contains 13 examples: meat/cards, rice/tennis ball, cheese/dice, peanut butter/spoon, rice/fist, takeaway container, butter/teaspoon/die, cheese/batteries, pasta/fist, vegetables/fist, nuts/hand, fish/cards, and tablespoon/teaspoon. The additional photos are original generated assets. These are approximate references; hand and container sizes vary. The guide never automatically assigns a portion to a logged food.

## Explicit counted portions

Source portions now carry count, item noun and size metadata where the source label supports it. The editor shows examples such as “2 large eggs · 100 g” and “2 slices · 70 g”. Weight entry can display an approximate item equivalent from a known source serving. Source egg sizes appear as buttons; changing the egg size preserves the number of eggs and changes nutrition accordingly. Switching between mass and count still uses measured weights. Multi-item source portions gain a normalized one-item option without reordering old saved portions.

For plain whole/boiled/poached/raw eggs with mass-only data, a large-egg reference of 50 g edible weight may be supplied and is marked “estimated”; source-provided weights always win. The reference comes from USDA Nutritive Value of Foods, Table 9 (https://www.ars.usda.gov/ARSUserFiles/80400525/data/hg72/hg72_2002.pdf). No generic whole-egg conversion is generated for egg whites/yolks, recipes, fried mass-only records or substitutes.

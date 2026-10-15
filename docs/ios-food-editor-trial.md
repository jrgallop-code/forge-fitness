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

## Direct portion equivalents

All 13 guide cards now name the food, amount and visual reference together. Captions explain matching thickness, loose filling or container capacity. Four photos were replaced so cheese/dice, cheese/matchbox, peanut butter/ball and the 500 mL carton agree with their labels. The guide remains approximate and never changes the selected food amount.

References: Ohio State Extension (https://livesmartohio.osu.edu/food/homonai-3osu-edu/how-to-perceive-your-portions/), NHS cheese/matchbox guidance (https://www.myhealthlondon.nhs.uk/resources/internal/dairy-foods/), National Jewish Health peanut butter, meat, nuts and butter comparisons (https://www.nationaljewish.org/education/health-information/nutrition/healthy-weight/serving-size-vs-portion-size).

## Consistent macro colors

The food editor pie, legend and swipeable bars now match the dashboard, diary and macro goals: carbs #4fa8ff, protein #39d7ae, fat #8b7cf6. These macro identities stay consistent across appearances; surrounding surfaces and text retain the active theme.

## Custom exercise time metric (iOS trial)

Create exercise now offers Reps or Time (seconds). Time shows a duration target range and saves trackingType=duration. Custom exercise IDs resolve their stored tracking type through the existing hold detector so plan rows, timers, circuits, history, progress and hold summaries use the static hold behavior. Existing custom exercises remain rep based. Repetition and duration target drafts are retained separately while switching the form selector.

Validation: 34 hold/custom exercise/native packaging checks passed, including persistence, plan ID resolution, hold progress and exclusion from repetition tonnage.

## iOS voice meal review

Log by voice opens a meal selector and recording panel. Native Speech/AVAudioEngine transcription reports live text, supports stop/cancel and ends recording after 55 seconds or backgrounding. On-device recognition is requested where supported. No audio files are saved. Transcripts can also be typed or corrected. Stopping a recording matches the batch; results remain a draft until Log to [meal] is pressed.

Cards show food/brand, portion, calories and a representative thumbnail with Edit amount, Swap food and Remove actions. Search-based swaps open the regular amount editor and preserve requested/edited mass, count or volume when supported. Unmatched foods require manual selection or removal before logging. Recording more appends a new batch without replacing reviewed foods. This is an iOS trial; PWA remains unchanged.

Accuracy changes: spoken hundreds/fractions and decimal quantities retain their numeric meaning; cooking qualifiers are retained; explicit brand and food words must match; composite foods such as muffins cannot silently substitute for plain blueberries; unsupported mass/volume conversions remain unresolved. Quantity omissions are marked as one serving for review. This does not implement conversational voice commands to edit/delete a previous item: those actions use explicit card controls.

Validation: 148 focused tests pass, including speech completion/cancellation, multi-batch draft retention, decimal/fraction parsing, brand rejection, swap quantities and unresolved-save gating. Native compilation is checked by the signed iOS workflow; physical microphone accuracy and layout require TestFlight testing.

Apple speech API reference: https://developer.apple.com/documentation/speech/sfspeechaudiobufferrecognitionrequest

## Voice continuity and compact shortcuts

The food search form now has a full-width field with paired circular Barcode and Voice SVG shortcuts below. The recorder also uses a microphone icon with an accessible Start/Stop label. Colors inherit the active appearance.

A new measured quantity or count separates spoken foods even without “and” or punctuation. Native speech commits completed or paused phrases, retains their full transcript, and starts a fresh recognition request while the microphone remains active. A 1.8-second pause submits the stable phrase for matching. Each phrase has a unique ID; duplicate callbacks cannot import it twice. Matching runs in order, independently from recording, and prior phrases remain visible with match status. Stop remains available during a lookup. New foods cannot be logged until recording and queued lookups finish and unresolved foods are reviewed.

Validation: 151 focused tests pass, including lists without conjunctions, multi-phrase transcription, duplicate callback suppression, queued matching order and visible history preservation. Real microphone timing still needs TestFlight verification.

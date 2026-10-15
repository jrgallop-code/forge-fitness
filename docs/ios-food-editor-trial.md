# iOS food editor trial — October 15, 2026

Only the `ios/capacitor-app-store` branch includes this trial. Do not copy to the production PWA until John has tested it.

Features: representative category photo headers; editable amount and quick g/oz/lb/mL/serving buttons; unit changes preserve measured amounts and live nutrition; 100g-only foods open as direct grams; original portion options remain in the dropdown; swipeable portion guide with approximate meat/cards, rice/tennis-ball, cheese/dice, and tablespoon/teaspoon references. Pictures are original generated assets bundled locally, approximately 636 KB total. Colors use existing appearance variables.

Integration: `food-log.js`, `food-portion-editor.js`, `food-portion-units.js`, `food-photo.js`, `food-portion-editor.css`, the food-log CSS import, and `assets/food/*.webp`. Applies to adding foods, editing diary entries, and saved-meal item editors. No server or database schema changes. Existing saved portions and IDs retain their ordering. Only established weight/volume bridges can preserve quantities across different portion types; otherwise the editor explicitly resets to 1. Existing estimated liquid conversions remain labeled as estimates.

Verification: food data/UI/unit tests plus native packaging tests (111 passing); generated local Capacitor bundle. Browser screenshot QA was unavailable because the Chromium download failed. Physical iOS testing should cover search, barcode, legacy gram entries, My Foods, saved-meal editing, all appearances, keyboard and smaller screens, guide scrolling/closing, and save/reopen.

The production PWA and lifting-goal scoring are unchanged.

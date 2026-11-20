# Level Up Meal Planner — Phase 1 Source Staging

## Scope
This branch stages source-backed recipe records, without modifying the food diary, user nutrition targets, iOS, or production deployment.

## Current progress
- 13 upstream recipe records staged from HoChiPants/open-recipe-archive (2026-11-20).
- These are **source-backed but not production verified**.
- The repository's LICENSE.md declares its original recipe data CC0 1.0 except record-specific exceptions; individual third-party source metadata requires separate rights review.
- Initial source inventory is not suitable as 13 complete main meals: includes snacks, sides, a drink, and dessert.
- Previous 500 generated recipe titles remain an unverified candidate pool. Do not label them validated or publish them.

## Publication gates (all mandatory)
1. **Rights**: confirm record provenance, commercial use, and any upstream third-party material; ensure photos independently licensed.
2. **Ingredient amounts**: normalize each ingredient to grams, determine edible portion and raw/cooked state; map to USDA FDC or Canadian Nutrient File IDs.
3. **Nutrition**: recompute macros and available micronutrients from ingredient weights, using cooking yields and retention factors; unknown != zero.
4. **Safety**: recipe ingredient/allergen audit and cross-contact uncertainty; no unverified allergy-safe claims.
5. **Health**: examine vegetables/fruit, fibre, sodium and saturated fat at the recipe and 7-day plan level.
6. **Practical use**: prep time, instructions, food-storage/reheating guidance, batch prep and realistic portion scaling.
7. **Meal type and diet tags**: review every tag; do not infer vegetarian/vegan/pescatarian/paleo/keto from recipe names.
8. **Editor compatibility**: each recipe ingredient maps to a standard food-log food/serving so the existing manual editor controls quantity, unit, replacement and deletion.

## Integration contract
- **Planned meal** is a calendar object with recipe/version, ingredient snapshots and serving adjustments; saving it must NOT call saveEntry/saveEntries or change actual daily calories.
- **Log meal** is an explicit user action: present the standard editing view first, then write individually editable ingredient entries to the existing food log, linked by a stable recipe-log-group ID.
- Preserve the published recipe untouched when editing the planned or logged instance.
- Editing a consumed ingredient should use existing updateEntry/removeEntry paths and refresh normal diary and nutrition totals.
- Keep a unique plan-slot ID and idempotency guard to prevent duplicate logs from repeated taps.
- Unresolved custom allergen ("Other") blocks real meal-plan approval.
- The app currently has diary meal sections Breakfast, Lunch, Dinner, Snacks. Meal 4 should be mapped with care or represented with a separate slot while logging into the existing compatible meal grouping.

## Existing code
- js/nutrition/food-log-data-core.js: saved meals, saveEntries, updateEntry, removeEntry.
- js/nutrition/food-log.js: existing My Meals interface and editable food quantities.
- js/nutrition/nutrition-storage.js: nutrition targets.

## Next batch
Prioritize 50 complete meal candidates across breakfast/lunch/dinner/fourth meal and all supported compatible diet tags. A small CC0 archive provides only 13 records, several not complete meals, so additional license-checked sources or original Level Up recipes will be required. Do not treat a count of records as a count of reviewed main meals.

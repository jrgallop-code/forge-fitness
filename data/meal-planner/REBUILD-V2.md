# Level Up Meal Planner — Recipe Catalog v2

## Decision
Rebuild the **recipe data model**, not the existing user's saved plans or nutrition logs. The current iOS catalog enumerates twenty multiplier/label variants per base recipe. These are serving configurations, not twenty distinct kitchen-tested dishes.

This branch adds an isolated staging catalog, quality checks, recipe-component scaling, and a reproducible audit without silently replacing the existing app experience.

## Reference
- Benchmark: https://mealprepmanual.com/creamy-cilantro-lime-chicken-bowls/
- Useful qualities: precise oils and seasonings; components separated into protein, vegetables and sauce; cooked-vs-dry ingredient handling; clear yield, instructions, timing and reported estimated nutrition.
- Do not copy third-party photography, instructions, or compiled recipe collections. Keep source attribution, assess licensing/rights, and author our own instructions and unique photography.
- The example here is **an original Level Up draft** based on those general meal-prep principles. It does not claim the source recipe's 490 kcal/43g protein nutrition.

## Recipe publication gate
1. Unique base identity and properly versioned recipe.
2. Every edible ingredient entered, including salt, spice blends, oils, marinades, sauces, water where needed, and garnish. Ingredient state: raw, dry, cooked, drained, or similar.
3. Recipe split into meaningful cooking components, with authored step-by-step instructions, tools, time, yield and storage limits.
4. Each ingredient has a verified reference nutrient ID, yield/cooking assumptions and an independently recalculated batch + per-portion macro result. Unknown nutrient information stays unknown.
5. Allergen and substitution review.
6. Kitchen test (including reheating and texture on the third day).
7. Unique generated photo that agrees with visible ingredients, with duplicate check and manual review.
8. Provenance and rights review completed.
9. Status moves to approved only when every check passes. Unverified records remain staging and are not silently inserted into the public catalog.

## Compatibility / migration strategy
- Do not overwrite `level_up_meal_planner_v1` or food diary data.
- Maintain legacy `lu-meal-* ` IDs for historical plans, and map to versioned recipe IDs only when exact correspondence has been established.
- Convert legacy `Lighter`, `Hearty`, `Extra protein` etc. to **portion / ingredient presets** on one real recipe, not separate catalog results.
- Derive grocery purchases from normalized gram requirements and ingredient canonical IDs; differentiate quantity needed from quantity purchased.
- Scheduled servings are not logged as eaten.
- Roll out behind an explicit feature flag after test migration, validated catalog seed, and images; do not show the draft recipe as published.

## Suggested release batches
- Batch 1: ten varied, kitchen-tested recipes across chicken, beef, fish, vegetarian and vegan; prioritize satisfying complete meals and sauce quality.
- Batch 2: 50 unique recipes across cuisines and dietary categories, with 100% verified ingredient mappings.
- Batch 3: 150 unique recipes with recipe-specific imagery and QA.
- Batch 4: 500 truly distinct recipes—not count inflation from portion multipliers.

## QA commands
`node --test tests/meal-planner-quality-v2.test.mjs`
`npm test`

This branch implements **schema, one staging example, and tests**, not the whole 500-recipe rebuild or iOS deployment.

# Meal Prep Catalogue Import — Phase 1

This branch stages **267 unique research-only recipe names** from The Meal Prep Manual public recipe index in `js/nutrition/meal-prep-discovery-catalogue.js`.

**Important:** These are not yet publishable recipes: ingredients, instructions, and nutrition are not verified. All 267 carry `recipeReady:false`, `nutritionVerified:false`, `imageReady:false`. No fake calories/macros are injected into the existing meal planner.

The existing 12 ingredient-complete adaptations in `js/nutrition/meal-prep-recipes.js` remain unchanged. The app's existing PWA meal planner disable flag is also unchanged.

## Image production
10 independently generated illustrative food images were created in the conversation for the first 10 catalogue names (IDs MPM-0001–MPM-0010). They are not yet hosted or integrated into this repository; the branch intentionally avoids broken asset paths.

## Before publishing these meals
- Develop original kitchen-usable ingredient quantities and instructions for every entry.
- Calculate nutrition from ingredient-level data, review allergens and servings, and validate macro totals.
- Generate, QA, optimize and host a separate AI illustration per dish.
- Link each hosted image by stable recipe ID, with fallback image.
- Integrate only approved recipes into browse, favorites, weekly scheduling, grocery lists and editable food-log ingredient entries.
- Ensure planned meals never count as consumed.
- Validate PWA and iOS views and preserve theme parity.

The imported index is for internal development/review, not copying third-party recipe instructions.
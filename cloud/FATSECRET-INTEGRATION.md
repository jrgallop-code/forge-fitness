# FatSecret integration

Level Up integrates FatSecret through the Cloudflare Worker. FatSecret credentials stay server-side and are never included in the PWA bundle.

## Production configuration

Required Worker secrets:

```sh
wrangler secret put FATSECRET_CLIENT_ID
wrangler secret put FATSECRET_CLIENT_SECRET
```

Optional scope configuration:

```sh
wrangler secret put FATSECRET_SCOPE
```

The adapter defaults to `basic`. An account-approved combination such as `premier barcode localization` can enable additional capabilities later.

## Current behavior

- Existing Level Up Verified, USDA FoodData Central and Open Food Facts results continue to work normally.
- FatSecret augments manual food search when credentials are configured.
- Basic scope uses the standard US FatSecret catalogue; localized Canadian FatSecret results require the appropriate localization/Premier access.
- FatSecret barcode lookup is only attempted when the token includes the `barcode` scope. With `basic`, Level Up keeps using its existing verified/Open Food Facts/USDA barcode flow.
- If FatSecret is unavailable or rejects a request, Level Up falls back to the existing food results rather than failing the search.

## Storage and rehydration

FatSecret's published storage rules permit `food_id` and `serving_id` to be stored indefinitely, while other API content generally has to be removed or re-requested within 24 hours unless a separate agreement permits otherwise.

Level Up therefore persists only the FatSecret food and serving identifiers plus Level Up-owned log metadata such as meal, quantity, entry ID and timestamps. FatSecret names, brands, serving labels and nutrition payloads are kept in memory only and are refreshed from the Worker when the app is opened.

If a stored FatSecret item has not rehydrated yet, the corresponding day is temporarily excluded from adaptive calorie/TDEE intake windows. This prevents a zero-value placeholder from changing maintenance or calorie recommendations.

## Capabilities

- OAuth 2.0 client-credentials authentication
- Basic food search: `foods/search/v1`
- Premier search: `foods/search/v5` when the account scope permits it
- Food details: `food/v5`
- Barcode lookup: `food/barcode/find-by-id/v2` when the account/token includes `barcode`
- UPC/EAN normalization to GTIN-13 for FatSecret barcode lookup
- Worker-isolate access-token caching until shortly before expiry

## Attribution

Level Up adds FatSecret attribution to food surfaces and to the public sign-in surface. App Store / Google Play listing attribution must also follow the FatSecret edition in use unless a separate agreement provides white-label rights.

Use FatSecret's current Attribution Policy for any public/store copy rather than inventing alternative attribution language.

## Upgrading beyond Basic

Before enabling localized Canadian FatSecret search or FatSecret barcode lookup:

1. Confirm the FatSecret account has the required Premier/localization/barcode access.
2. Change `FATSECRET_SCOPE` to the exact approved space-delimited scopes.
3. Test Canadian branded-food ranking against Level Up Verified, USDA and Open Food Facts.
4. Test barcode fallbacks with representative Canadian UPC/EAN products.

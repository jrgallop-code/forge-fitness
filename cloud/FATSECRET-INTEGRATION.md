# FatSecret integration

Level Up integrates FatSecret through the Cloudflare Worker. FatSecret credentials stay server-side and are never included in the PWA bundle.

## Production configuration

Required Worker secrets:

```sh
wrangler secret put FATSECRET_CLIENT_ID
wrangler secret put FATSECRET_CLIENT_SECRET
```

`FATSECRET_SCOPE` is optional. The recommended setting is either to remove it or set it to:

```text
FATSECRET_SCOPE=auto
```

In `auto` mode Level Up omits the scope parameter when requesting the OAuth token. FatSecret documents that this returns all scopes the application is entitled to. Level Up then reads the granted scopes from the token and automatically enables Premier search, Canadian localization, and barcode lookup when those capabilities are actually present.

You can still explicitly restrict the integration with a value such as `basic` or an account-approved combination such as `premier barcode localization`.

## Current behavior

- Existing Level Up Verified, USDA FoodData Central and Open Food Facts results continue to work normally.
- FatSecret augments manual food search when credentials are configured.
- Level Up sends the user's country (`CA` for Canadian users) to the Worker.
- With auto scope discovery, Canadian FatSecret search is used only when the granted token contains both `premier` and `localization`; otherwise FatSecret safely falls back to its US/basic catalogue.
- FatSecret barcode lookup is attempted only when the granted token includes `barcode`.
- Each search response includes non-sensitive FatSecret capability diagnostics (granted scopes, requested/effective country, localization availability and whether FatSecret contributed results).
- If FatSecret is unavailable or rejects a request, Level Up falls back to the existing food results rather than failing the search.

## Storage and rehydration

FatSecret's published storage rules permit `food_id` and `serving_id` to be stored indefinitely, while other API content generally has to be removed or re-requested within 24 hours unless a separate agreement permits otherwise.

Level Up therefore persists only the FatSecret food and serving identifiers plus Level Up-owned log metadata such as meal, quantity, entry ID and timestamps. FatSecret names, brands, serving labels and nutrition payloads are kept in memory only and are refreshed from the Worker when the app is opened.

If a stored FatSecret item has not rehydrated yet, the corresponding day is temporarily excluded from adaptive calorie/TDEE intake windows. This prevents a zero-value placeholder from changing maintenance or calorie recommendations.

## Capabilities

- OAuth 2.0 client-credentials authentication
- Automatic discovery of granted OAuth scopes from the access token
- Basic food search via method-based `foods.search`
- Premier search via `foods/search/v5` when `premier` is granted
- Canadian/localized search when `premier` + `localization` are granted
- Food details via `food/v5`
- Barcode lookup via `food/barcode/find-by-id/v2` when `barcode` is granted
- UPC/EAN normalization to GTIN-13 for FatSecret barcode lookup
- Worker-isolate access-token caching until shortly before expiry

## Attribution

Level Up adds FatSecret attribution to food surfaces and to the public sign-in surface. App Store / Google Play listing attribution must also follow the FatSecret edition in use unless a separate agreement provides white-label rights.

Use FatSecret's current Attribution Policy for any public/store copy rather than inventing alternative attribution language.

## Canada verification

For Canadian branded-food verification:

1. Use `FATSECRET_SCOPE=auto` (or remove `FATSECRET_SCOPE`).
2. Search a known Canadian item such as a restaurant menu item visible in FatSecret's Canada API tester.
3. Confirm the response reports an effective country of `CA` and granted `premier` + `localization` scopes.
4. Confirm FatSecret appears in the returned source list when it contributes a matching item.

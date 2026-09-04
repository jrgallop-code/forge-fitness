# FatSecret integration

This repository contains a server-side FatSecret provider adapter in `src/fatsecret-food-provider.js`.

## Status

The provider is intentionally **not connected to the production food log yet**. The existing Level Up food log persists full nutrition snapshots in local storage and cloud backups, while FatSecret's standard API terms generally allow indefinite storage only for identifiers such as `food_id` and `serving_id`. Other FatSecret content must be removed or replaced by re-requesting it within 24 hours unless a separate agreement permits different retention.

Do not enable FatSecret results in the persistent food log until the storage model or contract is compatible with those terms.

## Credentials

FatSecret OAuth 2.0 uses the client-credentials grant and must be called from a server/proxy. Never put these values in the PWA bundle.

Configure the Worker with secrets:

```sh
wrangler secret put FATSECRET_CLIENT_ID
wrangler secret put FATSECRET_CLIENT_SECRET
```

Optional scope configuration:

```sh
wrangler secret put FATSECRET_SCOPE
```

The adapter defaults to `basic` when `FATSECRET_SCOPE` is absent. Examples of possible configured scopes include `basic`, or an account-approved combination such as `premier barcode localization`.

## Capabilities

- Basic food search: `foods/search/v1`
- Premier search: `foods/search/v5`, including region when allowed
- Food details: `food/v5`
- Barcode lookup: `food/barcode/find-by-id/v2` when the account/token includes the `barcode` scope
- UPC/EAN values are normalized to GTIN-13 before barcode lookup
- OAuth access tokens are cached in the Worker isolate until shortly before expiry

## Attribution

FatSecret requires attribution wherever its content is displayed for editions that are not separately licensed for white-label use. Before production activation, add the official FatSecret attribution to:

1. Food-search / food-detail surfaces where FatSecret content appears.
2. At least one public surface accessible without signing in.
3. The App Store / Google Play listing as required by the applicable FatSecret edition.

Use FatSecret's current Attribution Policy rather than inventing or modifying their required attribution text/markup.

## Region / Canada

FatSecret's free Basic edition is intended for evaluation and does not provide the same localized Canadian dataset capabilities as paid Premier access. Premier Free currently focuses on the US dataset; paid Premier is the route FatSecret describes for datasets outside the US. Confirm the intended Canada access level with FatSecret before relying on it for Canadian branded-food coverage.

## Production activation checklist

- [ ] FatSecret developer account created.
- [ ] Client ID and Client Secret stored as Worker secrets.
- [ ] Appropriate scope/tier confirmed for the countries Level Up serves.
- [ ] Storage/retention approach approved or redesigned to persist only allowed identifiers.
- [ ] Required FatSecret attribution added to app, public website/login surface, and store listing.
- [ ] Search-result deduping/ranking tested against Level Up Verified, USDA and Open Food Facts.
- [ ] Barcode fallback tested with the correct FatSecret access tier.
- [ ] Food-log/TDEE calculations tested with FatSecret-sourced entries before enabling production traffic.

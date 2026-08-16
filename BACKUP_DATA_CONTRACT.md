# Level Up Backup Data Contract

## Mandatory rule

Every change that introduces, moves, or changes persistent user data must preserve complete Export Backup / Import Backup coverage in the same pull request.

A feature is not complete if its user data cannot be exported and restored.

## Storage rules

### localStorage

`js/core/backup-manager.js` exports every current localStorage key automatically. Do not replace this with a curated allowlist.

New features that store user data only in localStorage are therefore covered automatically, provided their values can be serialized as JSON or strings.

### Storage outside localStorage

Any user data stored outside localStorage — for example IndexedDB or another persistent browser store — must be registered in:

`js/core/backup-providers.js`

The provider must define:

- a stable `id`
- a readable `label`
- the storage type
- an `exportData` function
- an `importData` function
- a `legacyRootKey` when older backup files used a different location
- all IndexedDB database names used by that provider

All Level Up IndexedDB databases must use the `level_up_` prefix. Export Backup audits discoverable `level_up_` databases before exporting and refuses to create a backup if it finds one that is not registered. This prevents a new IndexedDB feature from being silently omitted.

The complete backup must also fail rather than silently omit a registered provider that cannot be exported.

## Backup format changes

When the backup file structure changes, increment `formatVersion` and keep imports backward-compatible whenever practical.

## Review checklist for future features

Before merging a feature that persists user data:

1. Identify where the new data is stored.
2. Confirm localStorage data is automatically captured, or register non-localStorage data in `backup-providers.js`.
3. For IndexedDB, use the `level_up_` database-name prefix and register the database name.
4. Confirm Export Backup includes the new data.
5. Confirm Import Backup restores the new data.
6. Do not silently create partial backups.

This contract applies to workouts, nutrition, body weight, measurements, preferences, recovery settings, future coaching features, and any other persistent Level Up user data.

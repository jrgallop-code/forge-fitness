# Level Up Coach — Phase 1 data ownership contract

## Canonical identity
- **Athlete:** an authenticated Level Up `users.id` (provider-scoped IDs such as `email:...` are valid). Never use email or display name as the database key. Email is an invitation destination, not the identity.
- **Coach:** an authenticated `users.id`; all coach reads require the approved coach role.
- **Relationship:** `coach_training_links (coach_user_id, client_user_id)` with independent training/nutrition permissions, acceptance timestamp, and revocation. Self-test uses the authenticated user's own ID.
- The Coach UI must use `client.id` for all authenticated requests and display `client.name` only as a label. No demo fixtures in live selectors.

## Data storage and sources of truth

| Data | Owner / storage | Rules |
|---|---|---|
| Weight entries, food logs, workouts, profile, expenditure snapshots | **Athlete's existing Level Up cloud backup** `backups.user_id = athlete.id` | Athlete app owns writes. Coach never modifies raw backups. Data is uploaded using Level Up's existing versioned cloud sync and backup protections. |
| Unpublished coach plans | **Coach-owned, athlete-linked** `coach_client_drafts(coach_user_id, client_user_id, id)` | Explicitly saved. Each draft has `version` and optimistic concurrency. Coach's unpublished material is not inserted into an athlete's workout history. |
| Published training, goal, and nutrition prescriptions | **Versioned assignment** `coach_program_assignments(coach_user_id, client_user_id, source_plan_id)` | Upsert requires link/owner access and expected version. Athlete imports or approves targets in app; app retains original history. |
| Invitations | `coach_client_invites` | Email-bound pending invites; acceptance requires authenticated matching email and consent. No data access when pending. |
| Coach/athlete messaging and scheduled tasks | **Not yet implemented** | Must use the same authenticated IDs and permission checks; cannot use mock client labels. |

## Coach read model
`GET /v1/coach/clients/:athleteId/summary`:
1. Authenticates and authorizes the coach.
2. Requires self-access or an active, approved `coach_training_links` row.
3. Loads the backup associated **only** with the exact `athleteId`.
4. Returns a limited projection, never raw backup, meal photos, tokens, full meal entries, private notes or unrelated user data.
5. Training data is present only with training permission; profile, weight, expenditure, nutrition only with nutrition permission.
6. Includes `backup.version`, `syncedAt` and `exportedAt` so the coach can distinguish stale backups from current device data.
7. No backup returns `backup.exists=false`; never substitutes fabricated or demo data.

## Failure and synchronization states
- **No active link:** 403; show invitation/consent requirements.
- **No cloud backup:** empty state; ask athlete to sign in and sync Account & Cloud.
- **Stale cloud backup:** show last sync timestamp; do not claim it represents live device measurements.
- **Concurrent coach draft edit:** HTTP 409 version conflict; refresh rather than silently overwrite.
- **Revoked permission:** no further access on server even if the Coach UI previously cached the identity.
- **Coach log-out:** clear session credentials; app/athlete backup remains untouched.
- **Different user on same device:** local draft keys must be partitioned by authenticated coach ID and athlete ID. Server remains authoritative for draft ownership.

## First milestone completion tests
- Coach's own account and a second consented athlete appear by stable ID in both workouts and nutrition.
- The coach can view only approved, appropriately scoped athlete metrics.
- Backups are still keyed to athletes; changing Coach drafts or publishing assignments does not mutate them.
- An accepted client survives reload and fresh Coach sessions; revocation blocks access.
- Draft save/read works across sessions with version-conflict protection.
- Real synced weight, workouts, calorie estimates and dates are shown; no demo data are used as live.

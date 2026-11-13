# Level Up Coach → Level Up client app integration contract (proposed)

**Status:** Implementation design only. No live coach-client data access or syncing is enabled in the current protected preview.

## Current architecture observed
- The athlete PWA/iOS app already contains program and exercise definitions, Smart Builder, food/nutrition targets, TDEE estimates, and account backup.
- Cloud requests use `api.leveluphypertrophy.com`, with account sessions and background backup support.
- Workout programs are locally stored under `forge_workout_plans`; custom exercises under `forge_custom_exercises`; nutrition state has separate authority.
- A coach must **not** fetch another athlete's backups or write into another user's localStorage. These are private, account-specific data.

## Shared backend resources (to implement)
- `coach_accounts`: coach user_id, team ownership, status, role.
- `coach_client_links`: client user_id, coach user_id, invitation token hash, scopes, status, accepted_at, revoked_at.
- `coach_programs`: immutable versioned templates, metadata, exercise IDs, sets/targets/superset groups.
- `coach_assignments`: program version → client user ID, start date, state, version, last acknowledged timestamp.
- `coach_nutrition_plans`: calorie targets, macro grams/presets, coach override type, TDEE snapshot and provenance, effective date, revision.
- `coach_meal_plans`: recipes, food IDs, planned meals, notes, assignment/effective dates.
- `coach_messages`: thread IDs, participant IDs, message body, created_at, read_at.
- `coach_form_videos`: uploaded object storage key, client ID, exercise ID, workout session ID, consent, mime/size/duration, moderation/review status.
- `coach_video_feedback`: coach ID, video ID, timestamp_ms, note, created_at.
- `coach_calendar_events`: start/end UTC, timezone, coach ID, participant IDs, event type, notes, reschedules.
- `coach_audit`: who changed each training/nutrition target and when.

## Permission model
1. Athletes see a coach invitation in the **existing Level Up** iOS/PWA app.
2. Client explicitly accepts with separately described scopes: training, nutrition, weight/measurements, messaging, form video and calendar.
3. Every API read and write resolves both authenticated principal and active scoped coach-client link in D1; never trust a client-supplied owner ID.
4. Revocation immediately removes coach access; workouts/weight logs/history remain owned by the athlete.
5. Videos use private R2 storage and short-lived, permission-checked signed reads. Set upload size caps, retention policy, deletion and consent controls.

## Intended API workflow (not implemented)
- `POST /v1/coach/invites` — coach creates expiring invitation.
- `POST /v1/client/coach-links/{invite}/accept` — athlete accepts with scopes.
- `GET /v1/coach/clients` — scoped roster and status.
- `GET /v1/coach/clients/{id}/analytics` — server-authorized aggregation of the *existing* weight, TDEE, macros and training calculation series.
- `POST /v1/coach/clients/{id}/program-assignments` — save versioned assignment; athlete app sees it in My Coach / Workouts.
- `POST /v1/coach/clients/{id}/nutrition-assignments` — save effective calorie & macro targets. Respect athlete autonomy/coach-authority modes.
- `POST /v1/coach/clients/{id}/meal-assignments` — save meal templates; athlete sees them in Nutrition.
- `POST /v1/coach/threads/{id}/messages` — messaging; athlete receives notifications in My Coach.
- `POST /v1/client/form-videos/uploads` — secure client-upload URL; coach review feedback routes back to the athlete app.
- `GET /v1/client/coach-state` — assignments, changes and messages since acknowledged revision.

## Client app integration
- Add **My Coach** only when a link is active.
- The normal Workouts and Nutrition views consume the assigned plan *through their current model adapters*, not via a competing calculator or overwritten backup.
- Client app reviews incoming assignment versions, records acknowledgement, and allows local completion logs; historical completed sessions are never silently rewritten.
- New exercises use stable shared IDs plus per-coach custom exercise records. Assignment sends required exercise definitions/media metadata for any coach-created ID that the athlete catalogue doesn't yet know.
- Daily weight logs and nutrition logs stay in the client's account. The coach receives only scope-authorized summaries and sources; compute TDEE using the same canonical trend pipeline, not a second simplified estimator.
- Real-time updates: web push or platform APNs plus unread/poll fallback; messages and video events are persisted server-side.

## Deployment guards
- Private preview stays behind Vercel Auth. No promotion to public domain until authorization, storage policies, and audit logs are tested.
- Protect existing Level Up PWA and iOS from API schema breaking changes; introduce feature flags, migrations, automated tests and rollback.
- Never expose backup snapshots or session tokens to third-party coach dashboard origins.

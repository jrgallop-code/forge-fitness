# Level Up — Chatbot Handoff

## Project identity

- App name: **Level Up**
- Repository: `jrgallop-code/forge-fitness`
- **Working branch: `codespace-current-ui`**
- Published app: `https://jrgallop-code.github.io/forge-fitness/`
- Stack: HTML, CSS, vanilla ES6 modules, LocalStorage, GitHub Pages, PWA, mobile-first.
- User wants incremental changes only. Do not rewrite unrelated files. Keep navigation and Dashboard working after every change.

## Critical branch instruction

The branch that should be treated as the source of truth for current app work is:

`codespace-current-ui`

Do **not** make changes only on `main` unless explicitly asked. Previous work accidentally put Muscle Recovery V1 on `main`, which is why it did not appear in the app the user was working from.

## Current app status

The app is stable after fixing:

- calorie target persistence
- Dashboard calorie display
- nutrition phase tracking
- workout rest-timer display
- progression prompts
- measurement persistence
- local backup/export completeness

Latest known stable visible app on `codespace-current-ui` is effectively Level Up 136.

## Immediate next task

The user asked to add **Muscle Recovery V1** to the Dashboard. A version was built on `main`, but it has NOT yet been ported to `codespace-current-ui`.

The intended V1 behavior:

- Dashboard section called **Muscle Recovery**
- Reads completed sessions from `forge_workout_sessions`
- Uses each exercise's `muscleGroup` from `js/workouts/exercise-library.js`
- Only counts muscle groups from exercises that actually have performed sets
- Recovery statuses:
  - `<48 h` = `Recovering`
  - `48–72 h` = `Nearly Ready`
  - `72+ h` = `Ready`
- Show last-trained timing such as `Yesterday`, `2 days ago`, etc.
- Show summary such as `5/7 ready`
- Include a small "View Recovery Details" disclosure explaining this is an estimate based on time since training, not a direct biological recovery measurement.
- Green for Ready, amber for Nearly Ready, red for Recovering.

Files created on `main` for this feature that need to be ported carefully to `codespace-current-ui`:

- `js/dashboard/muscle-recovery.js`
- `css/muscle-recovery.css`

The router on `main` was also modified to append `renderMuscleRecoveryDashboard()` to the Dashboard, but do NOT blindly overwrite the `codespace-current-ui` router. Fetch the current branch version first and merge only the necessary imports + Dashboard calls.

The app entry point must also load `css/muscle-recovery.css`, and the app/router cache-buster should be bumped.

## Important current files and what they do

### Entry / routing

- `index.html`
  - Loads CSS and all global modules.
  - Cache-buster/version changes are important for the installed PWA.

- `js/app.js`
  - Main app bootstrapping.
  - Loads router and navbar.
  - Handles replacement of colored emoji icons with white SVG icons.
  - Be careful with MutationObservers; previous broad observers caused UI lockups.

- `js/core/router.js`
  - Central page routing.
  - Routes include Dashboard, Workout, Progress, Sleep, Measurements, Nutrition, Water, Energy/Calories, More, Workout History.
  - Always fetch the branch version before editing.

- `js/components/navbar.js`
  - Bottom navigation.
  - This has broken in the past after JS errors, so always verify navigation after changes.

### Dashboard

- `js/dashboard/dashboard-ui.js`
  - Main Dashboard HTML.
  - Reads workout sessions, plans, weight, water, sleep, etc.

- `js/dashboard/nutrition-target-card.js`
  - Handles Dashboard nutrition target display.

- `js/dashboard/dashboard-nutrition-sync.js`
- `js/dashboard/dashboard-calculated-calorie-fix.js`
  - Legacy/compatibility files may still exist; avoid reintroducing competing calorie state systems.

### Workout planning / logging

- `js/workouts/workout-ui.js`
  - Workout tab UI / planner.

- `js/workouts/workouts.js`
  - Workout builder/plans logic.

- `js/workouts/exercise-library.js`
  - Exercise definitions including `id`, `name`, `muscleGroup`, `equipment`, rep ranges, etc.

- `js/workouts/workout-plan-details.js`
  - Compact workout-plan viewer with swipe/day layout.

- `js/workouts/workout-session.js`
  - Active workout/session runtime and persistence.

- `js/workouts/workout-logger-compact.js`
  - Compact workout logger UI.

- `js/workouts/workout-logger-consistency-fix.js`
  - Ensures timer menus and compact logger behavior are applied consistently to rendered exercise cards.

- `js/workouts/rest-timer-display-fix.js`
  - Fixes rest-timer countdown visibility, especially the 3-minute timer case.

- `js/workouts/progression-prompt-v2.js`
  - Current progression prompt logic.
  - Progression should be based on a previous completed session, never the first time data is entered in the current session.
  - If previous session reaches the top of the rep range on all completed sets OR exceeds the rep max, next workout should prompt `Increase weight this session`.
  - Load recommendation uses next practical increment, generally next 5 lb rather than arbitrary percentages.

- `js/workouts/workout-session-sanitizer.js`
  - Sanitizes stored workout sessions.
  - A prior implementation monkey-patched `localStorage.setItem` and accidentally created a `setItem` key in storage. That pattern should not be restored.

### Progress / measurements

- `js/progress/progress-ui.js`
  - Main Progress page.

- `js/progress/weight-tracker.js`
  - Weight log.
  - Weight storage key: `forge_weight_entries`

- `js/progress/weight-progress-compact.js`
  - Compact weight progress layout.

- `js/progress/training-progress.js`
- `js/progress/exercise-progress-v2.js`
- `js/progress/weekly-muscle-volume.js`
- `js/progress/strength-trend-summary.js`
  - Training analytics / 1RM / weekly volume / strength trend.

- `js/progress/measurements-tracker.js`
  - Body measurements UI + persistence.
  - Storage key: `level_up_body_measurements`
  - Measurements should persist after leaving/reopening page.
  - Mock measurement data should never be saved into real history.
  - User previously asked to remove the anatomy graphic; verify current branch state before changing this file.

- `js/progress/measurements-history-detail.js`
  - Measurement detail/history behavior.

- `js/progress/sleep-tracker.js`
  - Sleep tracker.

- `js/progress/photo-journal.js`
  - Photo records; backup handles these separately from localStorage.

### Nutrition / calories

Important design rule: **there should be one calorie target source of truth.**

- `js/nutrition/nutrition-storage.js`
  - Key nutrition storage.
  - `level_up_nutrition_plan` stores `calculatedCalories`.
  - `currentCalories` may still exist only as a compatibility alias and must not diverge.

- `js/nutrition/nutrition-plan-ui-v4.js`
  - Current Goals & Calories / Adaptive Coach logic.
  - Manual maintenance key: `level_up_manual_maintenance_calories`
  - Custom weekly rate key: `level_up_custom_weekly_rate`

- `js/nutrition/nutrition-ui.js`
  - Main nutrition page / navigation.

- `js/nutrition/energy-profile.js`
  - Calorie/TDEE profile page.

- `js/nutrition/tdee-calculator.js`
  - TDEE and macro math.

- `js/nutrition/manual-macros.js`
  - Manual macro UI.

- `js/nutrition/goal-projection.js`
  - Goal-weight projection.

- `js/nutrition/nutrition-phases-v2.js`
- `js/nutrition/nutrition-phases-bootstrap.js`
  - Nutrition Phases feature.
  - Uses phase-specific weight data and 7-day moving averages.
  - Pulls goal weight from `level_up_goal_weight`.
  - Adaptive Coach should analyze only data from active phase start onward.

Relevant storage keys seen in a real backup:

- `level_up_nutrition_plan`
- `level_up_nutrition_profile`
- `level_up_nutrition_goal`
- `level_up_nutrition_macro`
- `level_up_nutrition_phases`
- `level_up_goal_weight`
- `level_up_manual_maintenance_calories`
- `level_up_custom_weekly_rate`

Avoid reviving old duplicate calorie-state systems such as separate active/current/manual snapshot logic unless required for compatibility.

### More tab / backup

- `js/more/more-ui-v2.js`
  - More tab cards and routing.

- `js/more/export-backup-ui.js`
  - Exports & Backup screen.

- `js/core/backup-manager.js`
  - Local JSON backup/restore.
  - Current strategy: dynamically export all genuine localStorage keys + photo records.
  - Backup summary should show counts such as workouts, weigh-ins, measurements, calorie target, nutrition phases.
  - Recent backup format was moved toward version 4.

- `js/core/google-drive-sync-v2.js`
  - Google Drive transfer.
  - Historically used a harder-coded storage list, so inspect before assuming parity with local backup.

## Important CSS files

- `css/styles.css` — core app styling
- `css/dashboard-compact.css` — Dashboard layout
- `css/navbar-stability.css` — bottom navigation stability
- `css/workout-logger-compact.css` — compact workout logger
- `css/workout-plan-rows.css` — workout-plan row layout
- `css/workout-plan-details.css` — workout-plan detail screen
- `css/progress-volume.css` — progress / volume analytics
- `css/strength-trend-summary.css` — 1RM strength-change summary
- `css/weight-progress-compact.css` — compact weight page
- `css/measurements.css` — measurement page
- `css/nutrition-planner.css` — calorie/nutrition planner
- `css/adaptive-nutrition.css` — adaptive nutrition UI
- `css/manual-macros.css` — manual macro UI
- `css/nutrition-phases.css` — nutrition phases UI
- `css/nutrition-guidance-v2.css` — nutrition education / guidance
- `css/muscle-recovery.css` — NEW V1 recovery styling created on `main`, must be ported to working branch

## LocalStorage keys confirmed in real user backup

The backup exported 27 app data sections. Confirmed examples:

- `forge_custom_exercises`
- `forge_reference_weight`
- `forge_weight_entries`
- `forge_workout_plans`
- `forge_workout_sessions`
- `level_up_body_measurements`
- `level_up_exercise_rest_settings`
- `level_up_goal_weight`
- `level_up_manual_maintenance_calories`
- `level_up_custom_weekly_rate`
- `level_up_nutrition_goal`
- `level_up_nutrition_macro`
- `level_up_nutrition_phases`
- `level_up_nutrition_plan`
- `level_up_nutrition_profile`
- `level_up_sleep_entries`

There are some legacy nutrition keys in existing users' storage. Prefer reading the current canonical keys rather than deleting legacy data unless migration logic is deliberate and safe.

## User-facing design preferences

- Mobile-first.
- Dark/black UI.
- White icons instead of colored emoji.
- Red accents consistent with Level Up style.
- Compact pages; minimize scrolling.
- Workout-plan template cards in two columns when appropriate.
- Workout detail screens should be compact and swipe between days.
- Workout logger should be compact with `...` per exercise for rest timer settings.
- Dumbbell icon for lifting exercises; heart for cardio.
- Avoid unnecessary new pages/settings when existing data can be used automatically.

## Development rules for the next chatbot

1. **Always inspect `codespace-current-ui` first.** Never assume `main` matches the app the user sees.
2. Fetch the current file before editing it.
3. Do not replace whole modules with simplified versions unless absolutely necessary; merge targeted changes.
4. Do not add broad `MutationObserver`s that react to their own DOM changes. This has previously frozen navigation.
5. Avoid multiple modules writing to the same calorie target.
6. Preserve existing localStorage keys so the user's data survives updates.
7. After every change verify conceptually:
   - Dashboard renders
   - bottom navbar renders and buttons work
   - Workout tab works
   - More tab works
   - no page-wide JS exception
8. Bump cache-busters in `index.html`/imports when changing JS/CSS used by the installed PWA.
9. When adding features, use existing persisted data rather than creating duplicate datasets.
10. Do not add mock data to real storage unless explicitly requested.
11. Before declaring a feature published, verify the branch actually used by the app contains the new files/imports.

## Recommended first action in the next chat

Ask the chatbot to:

> Read `CHATBOT_HANDOFF.md` in `jrgallop-code/forge-fitness` on branch `codespace-current-ui`. Then inspect the current `index.html`, `js/app.js`, and `js/core/router.js` on that branch. Port Muscle Recovery V1 from `main` to `codespace-current-ui` using targeted edits only. Do not overwrite unrelated router/app changes. Confirm Dashboard and bottom navigation remain intact.


# Static holds — iOS

Applies only to Plank, Side Plank and Copenhagen Plank. Standard logger controls are retained; each set records durationSeconds with manual input or an elapsed stopwatch. Bodyweight/Weighted controls optional added load in lifting units. Time targets are shown in builders and imports; circuit targets remain optional. Saved history, edits, resume and sanitizer retain seconds. Legacy repetitions are not converted. Hold sets contribute no repetition tonnage.

Progress metrics: best hold and total time at the same selected load, or highest added load held for an editable minimum duration. Circuit history remains separate.

Validation: 36 focused tests pass; native asset build passes. Full suite has 876 passes and 72 existing failures, with no introduced failures against unchanged HEAD. Physical-device visual verification remains outstanding.

## Follow-up: compact timer and Progress picker

One shared stopwatch now sits below all set rows. It follows the focused unfinished set, stays with a running set, and advances on completion. Time cells use the standard input layout with a short sec placeholder. Progress list rebuilds include holds without requiring weight and reps; saved workouts chart entered duration even when the individual set checkbox was not used. Draft workouts remain excluded. Focused regression coverage: 41 checks passing. Physical-device visual verification remains outstanding.

## Compact improvement summary

Hold progress now uses the existing three-stat improvement card layout: latest, previous and change, with a dated baseline comparison. Time changes are seconds and percentage; added-load changes respect lifting units and omit percentages when the previous load was zero. Time comparisons still filter to the same load; total time explicitly notes its dependence on set count. Labels are shortened to Total time, Load and sec. Model and rendered-card checks pass.

Hold stopwatch now starts an elapsed iOS Live Activity, with exercise and set, theme/icon matching existing timers. Stop, manual overwrite, set completion, removal, and discard cancel it. No countdown notification is scheduled. Lock Screen opens the workout for controls.

Progress simplified to Best hold only; latest/previous/improvement stay. Total time and added weight metrics and columns removed. Best hold uses longest timed set per workout across loads; weighted/bodyweight logger retained.

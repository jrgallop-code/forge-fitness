ALTER TABLE user_product_state ADD COLUMN age_band TEXT;
ALTER TABLE user_product_state ADD COLUMN sex TEXT;
ALTER TABLE user_product_state ADD COLUMN primary_goal TEXT;
ALTER TABLE user_product_state ADD COLUMN experience TEXT;
ALTER TABLE user_product_state ADD COLUMN training_days INTEGER;
ALTER TABLE user_product_state ADD COLUMN training_setup TEXT;
ALTER TABLE user_product_state ADD COLUMN nutrition_enabled INTEGER;

-- Preserve immediate aggregate coverage from onboarding events already recorded.
INSERT OR IGNORE INTO user_product_state (user_id, updated_at)
SELECT DISTINCT user_id, MAX(occurred_at)
FROM product_events
WHERE event_name = 'onboarding_completed'
GROUP BY user_id;

UPDATE user_product_state
SET primary_goal = COALESCE(primary_goal, (
        SELECT json_extract(metadata_json, '$.primaryGoal') FROM product_events
        WHERE user_id = user_product_state.user_id AND event_name = 'onboarding_completed'
        ORDER BY occurred_at DESC LIMIT 1
    )),
    experience = COALESCE(experience, (
        SELECT json_extract(metadata_json, '$.experience') FROM product_events
        WHERE user_id = user_product_state.user_id AND event_name = 'onboarding_completed'
        ORDER BY occurred_at DESC LIMIT 1
    )),
    training_days = COALESCE(training_days, (
        SELECT json_extract(metadata_json, '$.days') FROM product_events
        WHERE user_id = user_product_state.user_id AND event_name = 'onboarding_completed'
        ORDER BY occurred_at DESC LIMIT 1
    )),
    training_setup = COALESCE(training_setup, (
        SELECT json_extract(metadata_json, '$.trainingSetup') FROM product_events
        WHERE user_id = user_product_state.user_id AND event_name = 'onboarding_completed'
        ORDER BY occurred_at DESC LIMIT 1
    )),
    nutrition_enabled = COALESCE(nutrition_enabled, (
        SELECT CASE json_extract(metadata_json, '$.nutritionEnabled') WHEN 1 THEN 1 WHEN 0 THEN 0 END
        FROM product_events
        WHERE user_id = user_product_state.user_id AND event_name = 'onboarding_completed'
        ORDER BY occurred_at DESC LIMIT 1
    ));

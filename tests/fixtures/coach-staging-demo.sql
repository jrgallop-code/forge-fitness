-- DEMO-ONLY synthetic coaching identities. These rows are isolated to the staging D1 database.
-- Tokens are random and only appear in the SSO-protected Vercel testing console.
INSERT INTO users (id,email,created_at,updated_at)
 VALUES ('11111111-1111-4111-8111-111111111111','coach@example.test','2026-11-13T00:00:00Z','2026-11-13T00:00:00Z');
INSERT INTO users (id,email,created_at,updated_at)
 VALUES ('22222222-2222-4222-8222-222222222222','athlete@example.test','2026-11-13T00:00:00Z','2026-11-13T00:00:00Z');
INSERT INTO sessions (token_hash,user_id,expires_at,created_at)
 VALUES ('823ff2a0f479d5fbc0c013d04b41b9a0f61418062805b459ec9e7c39385d85d5','11111111-1111-4111-8111-111111111111','2026-12-01T00:00:00Z','2026-11-13T00:00:00Z');
INSERT INTO sessions (token_hash,user_id,expires_at,created_at)
 VALUES ('68b7ab7ab276313fe68a211fd00e0a039e080b97a3b7b73815de984769f535c5','22222222-2222-4222-8222-222222222222','2026-12-01T00:00:00Z','2026-11-13T00:00:00Z');
INSERT INTO coach_training_links(coach_user_id,client_user_id,training_permission,nutrition_permission,accepted_at)
 VALUES ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222',1,1,'2026-11-13T00:00:00Z');

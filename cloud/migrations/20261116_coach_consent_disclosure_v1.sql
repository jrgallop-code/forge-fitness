-- Explicit Level Up Coach data-sharing consent.
-- Invite audit retains the accepted disclosure version; the active coach link
-- holds a durable copy for later consent audits and coach data access checks.
ALTER TABLE coach_client_invites ADD COLUMN consent_version TEXT;
ALTER TABLE coach_client_invites ADD COLUMN consent_scope TEXT;
ALTER TABLE coach_training_links ADD COLUMN consent_version TEXT;
ALTER TABLE coach_training_links ADD COLUMN consent_scope TEXT;

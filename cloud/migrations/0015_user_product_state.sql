CREATE TABLE IF NOT EXISTS user_product_state (
    user_id TEXT PRIMARY KEY,
    appearance_theme TEXT,
    effective_theme TEXT,
    program_id TEXT,
    program_name TEXT,
    program_source TEXT,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_product_state_updated_at
    ON user_product_state(updated_at);

CREATE INDEX IF NOT EXISTS idx_user_product_state_appearance
    ON user_product_state(appearance_theme);

CREATE INDEX IF NOT EXISTS idx_user_product_state_program
    ON user_product_state(program_name);

CREATE TABLE support_threads (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    issue_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX support_threads_user_updated ON support_threads(user_id, updated_at DESC);
CREATE INDEX support_threads_updated ON support_threads(updated_at DESC);

CREATE TABLE support_messages (
    id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL REFERENCES support_threads(id) ON DELETE CASCADE,
    sender TEXT NOT NULL CHECK(sender IN ('user', 'support')),
    body TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE INDEX support_messages_thread_created ON support_messages(thread_id, created_at);

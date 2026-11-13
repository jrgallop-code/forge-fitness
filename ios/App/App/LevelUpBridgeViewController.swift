import Foundation
import SQLite3
import Capacitor
import UIKit

final class LevelUpBridgeViewController: CAPBridgeViewController {
    private var tabGlass: UIVisualEffectView?
    private var tabGlassAnimator: UIViewPropertyAnimator?

    @MainActor
    fileprivate func updateTabGlass(_ frame: CGRect?, pressed: Bool) {
        guard #available(iOS 26.0, *), let webView = bridge?.webView else { return }
        guard let frame else {
            tabGlassAnimator?.stopAnimation(true)
            tabGlass?.isHidden = true
            return
        }

        let glass: UIVisualEffectView
        if let tabGlass {
            glass = tabGlass
        } else {
            let effect = UIGlassEffect(style: .clear)
            glass = UIVisualEffectView(effect: effect)
            glass.isUserInteractionEnabled = false
            glass.accessibilityElementsHidden = true
            glass.isHidden = true
            view.addSubview(glass)
            tabGlass = glass
        }
        let target = webView.convert(frame, to: view)
        let animate = !glass.isHidden && !UIAccessibility.isReduceMotionEnabled
        let visibleFrame = glass.layer.presentation()?.frame ?? glass.frame
        tabGlassAnimator?.stopAnimation(true)
        glass.frame = visibleFrame
        glass.isHidden = false
        let update = {
            glass.frame = target
            glass.layer.cornerRadius = target.height / 2
            glass.clipsToBounds = true
            glass.alpha = pressed ? 0.46 : 0.28
        }
        if animate {
            let animator = UIViewPropertyAnimator(duration: 0.22, dampingRatio: 0.83, animations: update)
            tabGlassAnimator = animator
            animator.startAnimation()
        } else {
            update()
        }
    }


    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        if #available(iOS 26.0, *) {
            bridge?.registerPluginInstance(LevelUpTabGlassPlugin())
        }
        bridge?.registerPluginInstance(LevelUpAppIconPlugin())
        bridge?.registerPluginInstance(LevelUpTimerPlugin())
        bridge?.registerPluginInstance(LevelUpDashboardWidgetPlugin())
        bridge?.registerPluginInstance(LevelUpNativeAuthPlugin())
        bridge?.registerPluginInstance(LevelUpFileExportPlugin())
        bridge?.registerPluginInstance(LevelUpArcadeAudioPlugin())
        bridge?.registerPluginInstance(LevelUpInstagramSharePlugin())
        bridge?.registerPluginInstance(LevelUpProgressPhotosPlugin())
        bridge?.registerPluginInstance(LevelUpSQLiteStorePlugin())
        bridge?.registerPluginInstance(LevelUpSpotifyPlugin())
        bridge?.registerPluginInstance(LevelUpFoodSpeechPlugin())
    }
}

@objc(LevelUpTabGlassPlugin)
final class LevelUpTabGlassPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "LevelUpTabGlassPlugin"
    let jsName = "LevelUpTabGlass"
    let pluginMethods: [CAPPluginMethod] = [CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise)]

    @objc func update(_ call: CAPPluginCall) {
        let coordinates = ["x", "y", "width", "height"].compactMap { call.getDouble($0) }
        let frame: CGRect? = coordinates.count == 4 && coordinates.allSatisfy(\.isFinite)
            && coordinates[2] > 0 && coordinates[3] > 0
            ? CGRect(x: coordinates[0], y: coordinates[1], width: coordinates[2], height: coordinates[3])
            : nil
        let pressed = call.getBool("pressed") ?? false
        DispatchQueue.main.async { [weak self] in
            (self?.bridge?.viewController as? LevelUpBridgeViewController)?.updateTabGlass(frame, pressed: pressed)
            call.resolve()
        }
    }
}

private let levelUpSQLiteTransient = unsafeBitCast(-1, to: sqlite3_destructor_type.self)

@objc(LevelUpSQLiteStorePlugin)
final class LevelUpSQLiteStorePlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "LevelUpSQLiteStorePlugin"
    let jsName = "LevelUpSQLiteStore"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "loadStore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "replaceStore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "health", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "inspectRecovery", returnType: CAPPluginReturnPromise)
    ]

    private let queue = DispatchQueue(label: "com.leveluphypertrophy.sqlite-store", qos: .utility)
    private let schemaVersion = 1
    private let maximumEntryBytes = 12 * 1024 * 1024
    private let maximumStoreBytes = 48 * 1024 * 1024

    @objc func loadStore(_ call: CAPPluginCall) {
        queue.async {
            do {
                let db = try self.openDatabase()
                defer { sqlite3_close(db) }

                var statement: OpaquePointer?
                guard sqlite3_prepare_v2(
                    db,
                    "SELECT key, value FROM kv_store ORDER BY key;",
                    -1,
                    &statement,
                    nil
                ) == SQLITE_OK else {
                    throw SQLiteStoreError.database(self.message(db))
                }
                defer { sqlite3_finalize(statement) }

                var entries: [String: String] = [:]
                while sqlite3_step(statement) == SQLITE_ROW {
                    guard
                        let keyText = sqlite3_column_text(statement, 0),
                        let valueText = sqlite3_column_text(statement, 1)
                    else { continue }

                    entries[String(cString: keyText)] = String(cString: valueText)
                }

                call.resolve([
                    "entries": entries,
                    "count": entries.count,
                    "schemaVersion": self.schemaVersion
                ])
            }
            catch {
                call.reject("Native SQLite data could not be loaded.", nil, error)
            }
        }
    }

    @objc func replaceStore(_ call: CAPPluginCall) {
        guard let rawEntries = call.getObject("entries") else {
            call.reject("SQLite store entries are required.")
            return
        }

        var entries: [String: String] = [:]
        var totalBytes = 0
        for (key, value) in rawEntries {
            guard
                key.count <= 220,
                key.range(of: #"^[A-Za-z0-9_.:-]+$"#, options: .regularExpression) != nil,
                let text = value as? String
            else {
                call.reject("SQLite store contains an invalid entry.")
                return
            }

            let bytes = text.utf8.count
            guard bytes <= maximumEntryBytes else {
                call.reject("A Level Up data section is too large for the native safety store.")
                return
            }
            totalBytes += bytes
            guard totalBytes <= maximumStoreBytes else {
                call.reject("Level Up native safety storage is too large.")
                return
            }
            entries[key] = text
        }

        queue.async {
            do {
                let db = try self.openDatabase()
                defer { sqlite3_close(db) }

                try self.execute(db, sql: "BEGIN IMMEDIATE TRANSACTION;")
                do {
                    // Keep the first pre-write copy each day, including before a restore.
                    try self.execute(db, sql: """
                        INSERT OR IGNORE INTO recovery_history (day, key, value)
                        SELECT date('now'), key, value FROM kv_store
                        WHERE key IN (
                            'forge_workout_sessions', 'forge_weight_entries', 'level_up_food_log_v1'
                        );
                        DELETE FROM recovery_history WHERE day < date('now', '-30 days');
                    """)
                    try self.execute(db, sql: "DELETE FROM kv_store;")

                    var statement: OpaquePointer?
                    guard sqlite3_prepare_v2(
                        db,
                        "INSERT INTO kv_store (key, value, updated_at) VALUES (?, ?, ?);",
                        -1,
                        &statement,
                        nil
                    ) == SQLITE_OK else {
                        throw SQLiteStoreError.database(self.message(db))
                    }
                    defer { sqlite3_finalize(statement) }

                    let timestamp = ISO8601DateFormatter().string(from: Date())
                    for key in entries.keys.sorted() {
                        guard let value = entries[key] else { continue }
                        sqlite3_reset(statement)
                        sqlite3_clear_bindings(statement)

                        key.withCString {
                            sqlite3_bind_text(statement, 1, $0, -1, levelUpSQLiteTransient)
                        }
                        value.withCString {
                            sqlite3_bind_text(statement, 2, $0, -1, levelUpSQLiteTransient)
                        }
                        timestamp.withCString {
                            sqlite3_bind_text(statement, 3, $0, -1, levelUpSQLiteTransient)
                        }

                        guard sqlite3_step(statement) == SQLITE_DONE else {
                            throw SQLiteStoreError.database(self.message(db))
                        }
                    }

                    try self.execute(db, sql: "COMMIT;")
                    call.resolve([
                        "saved": true,
                        "count": entries.count,
                        "bytes": totalBytes,
                        "schemaVersion": self.schemaVersion
                    ])
                }
                catch {
                    try? self.execute(db, sql: "ROLLBACK;")
                    throw error
                }
            }
            catch {
                call.reject("Native SQLite data could not be saved.", nil, error)
            }
        }
    }

    @objc func inspectRecovery(_ call: CAPPluginCall) {
        queue.async {
            do {
                let url = try self.databaseURL()
                var db: OpaquePointer?
                defer { sqlite3_close(db) }
                guard sqlite3_open_v2(url.path, &db, SQLITE_OPEN_READONLY, nil) == SQLITE_OK else {
                    throw SQLiteStoreError.database(self.message(db))
                }
                let sql = """
                    SELECT 'Active', key, value FROM kv_store WHERE key IN (
                        'forge_workout_sessions', 'forge_weight_entries', 'level_up_food_log_v1'
                    )
                    UNION ALL
                    SELECT day, key, value FROM recovery_history
                    WHERE day >= date('now', '-30 days')
                    ORDER BY 1 DESC, 2;
                """
                var statement: OpaquePointer?
                defer { sqlite3_finalize(statement) }
                guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK else {
                    throw SQLiteStoreError.database(self.message(db))
                }
                var rows: [[String: Any]] = []
                var step = sqlite3_step(statement)
                while step == SQLITE_ROW {
                    if let copy = sqlite3_column_text(statement, 0),
                       let key = sqlite3_column_text(statement, 1),
                       let raw = sqlite3_column_text(statement, 2) {
                        let data = Data(String(cString: raw).utf8)
                        let value = try JSONSerialization.jsonObject(with: data)
                        let dates: [String]
                        let count: Int
                        if let records = value as? [[String: Any]] {
                            count = records.count
                            dates = records.compactMap { $0["date"] as? String }
                        } else if let days = value as? [String: Any] {
                            count = days.count
                            dates = Array(days.keys)
                        } else {
                            count = 0
                            dates = []
                        }
                        rows.append([
                            "copy": String(cString: copy),
                            "key": String(cString: key),
                            "count": count,
                            "latest": dates.map { String($0.prefix(10)) }.max() ?? ""
                        ])
                    }
                    step = sqlite3_step(statement)
                }
                guard step == SQLITE_DONE else { throw SQLiteStoreError.database(self.message(db)) }
                call.resolve(["rows": rows])
            } catch {
                call.reject("On-device SQLite history could not be read.", nil, error)
            }
        }
    }

    @objc func health(_ call: CAPPluginCall) {
        queue.async {
            do {
                let dbURL = try self.databaseURL()
                let db = try self.openDatabase()
                defer { sqlite3_close(db) }

                var count = 0
                var statement: OpaquePointer?
                if sqlite3_prepare_v2(db, "SELECT COUNT(*) FROM kv_store;", -1, &statement, nil) == SQLITE_OK {
                    if sqlite3_step(statement) == SQLITE_ROW {
                        count = Int(sqlite3_column_int64(statement, 0))
                    }
                }
                sqlite3_finalize(statement)

                let attributes = try? FileManager.default.attributesOfItem(atPath: dbURL.path)
                let bytes = (attributes?[.size] as? NSNumber)?.intValue ?? 0
                call.resolve([
                    "ready": true,
                    "count": count,
                    "bytes": bytes,
                    "schemaVersion": self.schemaVersion
                ])
            }
            catch {
                call.reject("Native SQLite storage is unavailable.", nil, error)
            }
        }
    }

    private func openDatabase() throws -> OpaquePointer {
        let url = try databaseURL()
        var db: OpaquePointer?
        let flags = SQLITE_OPEN_CREATE | SQLITE_OPEN_READWRITE | SQLITE_OPEN_FULLMUTEX
        guard sqlite3_open_v2(url.path, &db, flags, nil) == SQLITE_OK, let db else {
            if let db { sqlite3_close(db) }
            throw SQLiteStoreError.database("The SQLite database could not be opened.")
        }

        sqlite3_busy_timeout(db, 5000)
        do {
            try execute(db, sql: "PRAGMA journal_mode=WAL;")
            try execute(db, sql: "PRAGMA synchronous=FULL;")
            try execute(db, sql: "PRAGMA temp_store=MEMORY;")
            try execute(db, sql: """
                CREATE TABLE IF NOT EXISTS kv_store (
                    key TEXT PRIMARY KEY NOT NULL,
                    value TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
            """)
            try execute(db, sql: """
                CREATE TABLE IF NOT EXISTS recovery_history (
                    day TEXT NOT NULL,
                    key TEXT NOT NULL,
                    value TEXT NOT NULL,
                    PRIMARY KEY (day, key)
                );
                CREATE TABLE IF NOT EXISTS metadata (
                    key TEXT PRIMARY KEY NOT NULL,
                    value TEXT NOT NULL
                );
            """)
            try execute(
                db,
                sql: "INSERT OR REPLACE INTO metadata (key, value) VALUES ('schema_version', '\(schemaVersion)');"
            )
            return db
        }
        catch {
            sqlite3_close(db)
            throw error
        }
    }

    private func databaseURL() throws -> URL {
        let manager = FileManager.default
        let base = try manager.url(
            for: .applicationSupportDirectory,
            in: .userDomainMask,
            appropriateFor: nil,
            create: true
        ).appendingPathComponent("LevelUpData", isDirectory: true)

        try manager.createDirectory(
            at: base,
            withIntermediateDirectories: true,
            attributes: [.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication]
        )
        return base.appendingPathComponent("level-up.sqlite3", isDirectory: false)
    }

    private func execute(_ db: OpaquePointer, sql: String) throws {
        var errorMessage: UnsafeMutablePointer<Int8>?
        let result = sqlite3_exec(db, sql, nil, nil, &errorMessage)
        if result != SQLITE_OK {
            let message = errorMessage.map { String(cString: $0) } ?? self.message(db)
            if let errorMessage { sqlite3_free(errorMessage) }
            throw SQLiteStoreError.database(message)
        }
    }

    private func message(_ db: OpaquePointer?) -> String {
        guard let db, let text = sqlite3_errmsg(db) else { return "Unknown SQLite error." }
        return String(cString: text)
    }
}

private enum SQLiteStoreError: LocalizedError {
    case database(String)

    var errorDescription: String? {
        switch self {
        case .database(let message):
            return message
        }
    }
}

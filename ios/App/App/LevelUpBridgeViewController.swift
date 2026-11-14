import Foundation
import SQLite3
import Capacitor
import HealthKit

final class LevelUpBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
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
        bridge?.registerPluginInstance(LevelUpHealthKitPlugin())
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

 
// Read-only Apple Health bridge. Data stays on the phone and is queried on demand.
@objc(LevelUpHealthKitPlugin)
final class LevelUpHealthKitPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "LevelUpHealthKitPlugin"
    let jsName = "LevelUpHealthKit"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "availability", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "connect", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "readActivity", returnType: CAPPluginReturnPromise)
    ]

    private let healthStore = HKHealthStore()
    private let iso = ISO8601DateFormatter()

    private var readTypes: Set<HKObjectType> {
        [HKObjectType.quantityType(forIdentifier: .stepCount)!,
         HKObjectType.categoryType(forIdentifier: .sleepAnalysis)!]
    }

    @objc func availability(_ call: CAPPluginCall) {
        call.resolve(["available": HKHealthStore.isHealthDataAvailable()])
    }

    @objc func connect(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("Apple Health is unavailable on this device.")
            return
        }
        healthStore.requestAuthorization(toShare: [], read: readTypes) { success, error in
            if let error = error {
                call.reject("Apple Health authorization could not be completed.", nil, error)
                return
            }
            // HealthKit intentionally does not reveal whether a user denied read access.
            call.resolve(["requested": success])
        }
    }

    @objc func readActivity(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("Apple Health is unavailable on this device.")
            return
        }
        let requestedDays = min(max(call.getInt("days") ?? 14, 7), 90)
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        guard let start = calendar.date(byAdding: .day, value: -(requestedDays - 1), to: today),
              let end = calendar.date(byAdding: .day, value: 1, to: today),
              let quantity = HKObjectType.quantityType(forIdentifier: .stepCount),
              let sleepType = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) else {
            call.reject("Apple Health data types are unavailable.")
            return
        }
        let formatter = DateFormatter()
        formatter.calendar = calendar
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"

        let lock = NSLock()
        var steps: [String: Int] = [:]
        var sleepIntervals: [String: [(Date, Date)]] = [:]
        var firstError: Error?
        let group = DispatchGroup()
        group.enter()
        let stepsQuery = HKStatisticsCollectionQuery(
            quantityType: quantity,
            quantitySamplePredicate: HKQuery.predicateForSamples(withStart: start, end: end),
            options: .cumulativeSum,
            anchorDate: today,
            intervalComponents: DateComponents(day: 1)
        )
        stepsQuery.initialResultsHandler = { _, collection, error in
            lock.lock()
            if let error = error { firstError = error }
            collection?.enumerateStatistics(from: start, to: end) { statistic, _ in
                if let total = statistic.sumQuantity()?.doubleValue(for: HKUnit.count()) {
                    steps[formatter.string(from: statistic.startDate)] = max(0, Int(total.rounded()))
                }
            }
            lock.unlock()
            group.leave()
        }
        healthStore.execute(stepsQuery)

        group.enter()
        // Include overnight samples whose start precedes the displayed day.
        let sleepStart = calendar.date(byAdding: .day, value: -1, to: start) ?? start
        let sleepQuery = HKSampleQuery(
            sampleType: sleepType,
            predicate: HKQuery.predicateForSamples(withStart: sleepStart, end: end),
            limit: HKObjectQueryNoLimit,
            sortDescriptors: nil
        ) { _, samples, error in
            lock.lock()
            if let error = error { firstError = error }
            for sample in (samples as? [HKCategorySample] ?? []) {
                // 0 = in bed, 2 = awake. Both must be excluded.
                // 1 = asleep unspecified, 3/4/5 = core/deep/REM.
                guard [1, 3, 4, 5].contains(sample.value) else { continue }
                let day = formatter.string(from: sample.endDate)
                sleepIntervals[day, default: []].append((sample.startDate, sample.endDate))
            }
            lock.unlock()
            group.leave()
        }
        healthStore.execute(sleepQuery)
        group.notify(queue: .main) {
            if let error = firstError {
                call.reject("Unable to read Apple Health activity.", nil, error)
                return
            }
            var stepRows: [[String: Any]] = []
            var sleepRows: [[String: Any]] = []
            for offset in 0..<requestedDays {
                guard let date = calendar.date(byAdding: .day, value: offset, to: start) else { continue }
                let day = formatter.string(from: date)
                stepRows.append(["date": day, "steps": steps[day] as Any? ?? NSNull()])
                let sorted = (sleepIntervals[day] ?? []).sorted { $0.0 < $1.0 }
                var merged: [(Date, Date)] = []
                for (begin, finish) in sorted {
                    if let last = merged.last, begin <= last.1 {
                        merged[merged.count - 1].1 = max(last.1, finish)
                    } else {
                        merged.append((begin, finish))
                    }
                }
                if !merged.isEmpty {
                    sleepRows.append([
                        "date": day,
                        "hours": (merged.reduce(0.0) { $0 + $1.1.timeIntervalSince($1.0) }) / 3600.0
                    ])
                }
            }
            call.resolve(["steps": stepRows, "sleep": sleepRows, "readAt": self.iso.string(from: Date())])
        }
    }
}

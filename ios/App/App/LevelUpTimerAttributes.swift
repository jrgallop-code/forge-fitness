import Foundation
import ActivityKit
import AppIntents
import UserNotifications

@available(iOS 16.1, *)
struct LevelUpTimerAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var startedAt: Date
        var endAt: Date
        var status: String
        var remainingSeconds: Int
    }

    var timerID: String
    var title: String
    var detail: String
    var kind: String
    var theme: String
    var icon: String
    var workoutName: String
    var exerciseName: String
    var setNumber: Int
    var targetReps: String
    var previousPerformance: String
}

@available(iOS 16.1, *)
struct LevelUpTimerRecord: Codable {
    var timerID: String
    var title: String
    var detail: String
    var kind: String
    var theme: String
    var icon: String
    var workoutName: String
    var exerciseName: String
    var setNumber: Int
    var targetReps: String
    var previousPerformance: String
    var status: String
    var startedAt: Date
    var endAt: Date?
    var remainingSeconds: Int
}

@available(iOS 16.1, *)
enum LevelUpTimerStateStore {
    private static let prefix = "level-up.native-timer."

    static func notificationIdentifier(_ timerID: String) -> String {
        "level-up.timer.\(timerID)"
    }

    static func record(for timerID: String) -> LevelUpTimerRecord? {
        guard let data = UserDefaults.standard.data(forKey: prefix + timerID) else { return nil }
        return try? JSONDecoder().decode(LevelUpTimerRecord.self, from: data)
    }

    static func save(_ record: LevelUpTimerRecord) {
        guard let data = try? JSONEncoder().encode(record) else { return }
        UserDefaults.standard.set(data, forKey: prefix + record.timerID)
    }

    static func remove(_ timerID: String) {
        UserDefaults.standard.removeObject(forKey: prefix + timerID)
    }

    static func currentRemainingSeconds(_ record: LevelUpTimerRecord, now: Date = Date()) -> Int {
        if record.status == "running", let endAt = record.endAt {
            return max(0, Int(ceil(endAt.timeIntervalSince(now))))
        }
        return max(0, record.remainingSeconds)
    }

    static func contentState(for record: LevelUpTimerRecord, now: Date = Date()) -> LevelUpTimerAttributes.ContentState {
        let remaining = currentRemainingSeconds(record, now: now)
        let endAt = record.status == "running"
            ? (record.endAt ?? now.addingTimeInterval(TimeInterval(remaining)))
            : now.addingTimeInterval(TimeInterval(remaining))
        return .init(startedAt: record.startedAt, endAt: endAt, status: record.status, remainingSeconds: remaining)
    }

    static func rescheduleNotification(for record: LevelUpTimerRecord) {
        let center = UNUserNotificationCenter.current()
        let identifier = notificationIdentifier(record.timerID)
        center.removePendingNotificationRequests(withIdentifiers: [identifier])
        guard record.status == "running", let endAt = record.endAt, endAt > Date() else { return }

        let content = UNMutableNotificationContent()
        content.title = record.title
        content.body = record.detail
        content.sound = UNNotificationSound(named: UNNotificationSoundName("level-up-alarm.wav"))
        if #available(iOS 15.0, *) { content.interruptionLevel = .timeSensitive }
        content.userInfo = ["key": record.timerID, "type": "levelup:timer-complete"]
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: max(1, endAt.timeIntervalSinceNow), repeats: false)
        center.add(UNNotificationRequest(identifier: identifier, content: content, trigger: trigger)) { error in
            if let error = error {
                NSLog("Level Up timer notification could not be rescheduled: %@", error.localizedDescription)
            }
        }
    }

    static func updateActivities(for record: LevelUpTimerRecord) async {
        let state = contentState(for: record)
        for activity in Activity<LevelUpTimerAttributes>.activities where activity.attributes.timerID == record.timerID {
            if #available(iOS 16.2, *) {
                await activity.update(ActivityContent(state: state, staleDate: state.endAt.addingTimeInterval(60)))
            } else {
                await activity.update(using: state)
            }
        }
    }

    static func endActivities(timerID: String) async {
        for activity in Activity<LevelUpTimerAttributes>.activities where activity.attributes.timerID == timerID {
            if #available(iOS 16.2, *) {
                await activity.end(nil, dismissalPolicy: .immediate)
            } else {
                await activity.end(dismissalPolicy: .immediate)
            }
        }
    }

    @available(iOS 17.0, *)
    static func adjust(timerID: String, seconds: Int) async {
        guard var record = record(for: timerID), record.kind == "rest" else { return }
        let now = Date()
        let next = max(0, currentRemainingSeconds(record, now: now) + seconds)
        record.remainingSeconds = next
        if next == 0 {
            record.status = "finished"
            record.endAt = now
        } else if record.status != "paused" {
            record.status = "running"
            record.endAt = now.addingTimeInterval(TimeInterval(next))
        }
        save(record)
        rescheduleNotification(for: record)
        await updateActivities(for: record)
    }

    @available(iOS 17.0, *)
    static func togglePause(timerID: String) async {
        guard var record = record(for: timerID), record.kind == "rest", record.status != "finished" else { return }
        let now = Date()
        let remaining = currentRemainingSeconds(record, now: now)
        record.remainingSeconds = remaining
        if record.status == "paused" {
            record.status = "running"
            record.endAt = now.addingTimeInterval(TimeInterval(remaining))
        } else {
            record.status = "paused"
            record.endAt = nil
        }
        save(record)
        rescheduleNotification(for: record)
        await updateActivities(for: record)
    }

    @available(iOS 17.0, *)
    static func skip(timerID: String) async {
        guard var record = record(for: timerID) else { return }
        record.status = "skipped"
        record.remainingSeconds = 0
        record.endAt = nil
        save(record)
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [notificationIdentifier(timerID)])
        await endActivities(timerID: timerID)
    }
}

@available(iOS 17.0, *)
struct AdjustLevelUpTimerIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Adjust Level Up rest timer"
    static var openAppWhenRun = false
    @Parameter(title: "Timer ID") var timerID: String
    @Parameter(title: "Seconds") var seconds: Int

    init() {}
    init(timerID: String, seconds: Int) {
        self.timerID = timerID
        self.seconds = seconds
    }

    func perform() async throws -> some IntentResult {
        await LevelUpTimerStateStore.adjust(timerID: timerID, seconds: seconds)
        return .result()
    }
}

@available(iOS 17.0, *)
struct ToggleLevelUpTimerIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Pause or resume Level Up rest timer"
    static var openAppWhenRun = false
    @Parameter(title: "Timer ID") var timerID: String

    init() {}
    init(timerID: String) { self.timerID = timerID }

    func perform() async throws -> some IntentResult {
        await LevelUpTimerStateStore.togglePause(timerID: timerID)
        return .result()
    }
}

@available(iOS 17.0, *)
struct SkipLevelUpTimerIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Skip Level Up rest timer"
    static var openAppWhenRun = false
    @Parameter(title: "Timer ID") var timerID: String

    init() {}
    init(timerID: String) { self.timerID = timerID }

    func perform() async throws -> some IntentResult {
        await LevelUpTimerStateStore.skip(timerID: timerID)
        return .result()
    }
}

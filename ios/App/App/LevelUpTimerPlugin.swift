import UIKit
import UserNotifications
import ActivityKit
import Capacitor

@objc(LevelUpTimerPlugin)
final class LevelUpTimerPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "LevelUpTimerPlugin"
    let jsName = "LevelUpTimer"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "schedule", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getState", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "finish", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancel", returnType: CAPPluginReturnPromise)
    ]

    override func load() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(cleanupExpiredLiveActivities),
            name: UIApplication.didBecomeActiveNotification,
            object: nil
        )
        cleanupExpiredLiveActivities()
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    @objc override func requestPermissions(_ call: CAPPluginCall) {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            if let error = error {
                call.reject("Notification permission could not be requested.", nil, error)
            } else {
                call.resolve(["display": granted ? "granted" : "denied"])
            }
        }
    }

    @objc override func checkPermissions(_ call: CAPPluginCall) {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            let display: String
            switch settings.authorizationStatus {
            case .authorized, .provisional, .ephemeral: display = "granted"
            case .denied: display = "denied"
            case .notDetermined: display = "prompt"
            @unknown default: display = "prompt"
            }
            call.resolve(["display": display])
        }
    }

    @objc func schedule(_ call: CAPPluginCall) {
        guard let key = call.getString("key"),
              let title = call.getString("title"),
              let body = call.getString("body"),
              let atMilliseconds = call.getDouble("at") else {
            call.reject("A timer key, title, body and end time are required.")
            return
        }

        let endAt = Date(timeIntervalSince1970: atMilliseconds / 1000)
        guard endAt.timeIntervalSinceNow > 0 else {
            call.reject("The timer end time must be in the future.")
            return
        }

        let center = UNUserNotificationCenter.current()
        let finishSchedule: (Bool, Error?) -> Void = { [weak self] notificationScheduled, notificationError in
            guard let self else {
                call.reject("The native timer is unavailable.")
                return
            }

            guard #available(iOS 16.1, *) else {
                if let notificationError {
                    call.reject("The timer notification could not be scheduled.", nil, notificationError)
                } else {
                    call.resolve([
                        "scheduled": notificationScheduled,
                        "notification": notificationScheduled,
                        "liveActivity": false
                    ])
                }
                return
            }

            let record = self.timerRecord(\n                call: call,\n                key: key,\n                title: call.getString("liveActivityTitle") ?? title,\n                detail: call.getString("liveActivityDetail") ?? body,\n                endAt: endAt\n            )
            LevelUpTimerStateStore.save(record)
            Task { @MainActor in
                let activityResult = await self.startLiveActivity(record: record)
                let scheduled = notificationScheduled || activityResult.started
                var result: [String: Any] = [
                    "scheduled": scheduled,
                    "notification": notificationScheduled,
                    "liveActivity": activityResult.started
                ]
                if let message = activityResult.error { result["liveActivityError"] = message }
                if let notificationError { result["notificationError"] = notificationError.localizedDescription }
                call.resolve(result)
            }
        }

        let notificationEnabled = call.getBool("notificationEnabled") ?? true
        center.getNotificationSettings { [weak self] settings in
            guard let self else {
                call.reject("The native timer is unavailable.")
                return
            }
            let notificationsEnabled = notificationEnabled && (settings.authorizationStatus == .authorized
                || settings.authorizationStatus == .provisional
                || settings.authorizationStatus == .ephemeral)
            guard notificationsEnabled else {
                finishSchedule(false, nil)
                return
            }

            let content = UNMutableNotificationContent()
            content.title = title
            content.body = body
            content.sound = UNNotificationSound(named: UNNotificationSoundName("level-up-alarm.wav"))
            if #available(iOS 15.0, *) { content.interruptionLevel = .timeSensitive }
            content.userInfo = ["key": key, "type": call.getString("type") ?? "levelup:timer-complete"]

            let trigger = UNTimeIntervalNotificationTrigger(timeInterval: max(1, endAt.timeIntervalSinceNow), repeats: false)
            let request = UNNotificationRequest(identifier: self.notificationIdentifier(key), content: content, trigger: trigger)
            center.add(request) { error in
                finishSchedule(error == nil, error)
            }
        }
    }

    @objc func update(_ call: CAPPluginCall) {
        guard #available(iOS 16.1, *),
              let key = call.getString("key"),
              var record = LevelUpTimerStateStore.record(for: key) else {
            call.reject("The native timer could not be found.")
            return
        }

        let status = call.getString("status") ?? record.status
        let remainingSeconds = max(0, call.getInt("remainingSeconds") ?? record.remainingSeconds)
        let endAtMilliseconds = call.getDouble("endAt")
        record.status = status
        record.remainingSeconds = remainingSeconds
        record.endAt = status == "running"
            ? (endAtMilliseconds.map { Date(timeIntervalSince1970: $0 / 1000) } ?? Date().addingTimeInterval(TimeInterval(remainingSeconds)))
            : nil
        record.workoutName = call.getString("workoutName") ?? record.workoutName
        record.exerciseName = call.getString("exerciseName") ?? record.exerciseName
        record.setNumber = call.getInt("setNumber") ?? record.setNumber
        record.targetReps = call.getString("targetReps") ?? record.targetReps
        record.previousPerformance = call.getString("previousPerformance") ?? record.previousPerformance
        LevelUpTimerStateStore.save(record)
        LevelUpTimerStateStore.rescheduleNotification(for: record)

        Task {
            await LevelUpTimerStateStore.updateActivities(for: record)
            call.resolve(["updated": true])
        }
    }

    @objc func getState(_ call: CAPPluginCall) {
        guard #available(iOS 16.1, *),
              let key = call.getString("key"),
              let record = LevelUpTimerStateStore.record(for: key) else {
            call.resolve(["found": false])
            return
        }
        let remaining = LevelUpTimerStateStore.currentRemainingSeconds(record)
        let status = record.status == "running" && remaining == 0 ? "finished" : record.status
        var result: [String: Any] = [
            "found": true,
            "key": record.timerID,
            "status": status,
            "remainingSeconds": remaining
        ]
        if let endAt = record.endAt {
            result["endAt"] = endAt.timeIntervalSince1970 * 1000
        }
        call.resolve(result)
    }

    // Reaching zero is not cancellation. Preserve the scheduled one-shot alert
    // and let the Lock Screen card show its completed state briefly.
    @objc func finish(_ call: CAPPluginCall) {
        guard #available(iOS 16.1, *),
              let key = call.getString("key") else {
            call.resolve(["finished": false])
            return
        }
        Task {
            await LevelUpTimerStateStore.finish(timerID: key)
            call.resolve(["finished": true])
        }
    }

    @objc func cancel(_ call: CAPPluginCall) {
        let key = call.getString("key") ?? ""
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [notificationIdentifier(key)])
        endLiveActivities(key: key)
        if #available(iOS 16.1, *) { LevelUpTimerStateStore.remove(key) }
        call.resolve(["cancelled": true])
    }

    private func notificationIdentifier(_ key: String) -> String {
        "level-up.timer.\(key)"
    }

    private func liveActivitiesAvailable() -> Bool {
        if #available(iOS 16.1, *) { return ActivityAuthorizationInfo().areActivitiesEnabled }
        return false
    }

    @available(iOS 16.1, *)
    private func timerRecord(call: CAPPluginCall, key: String, title: String, detail: String, endAt: Date) -> LevelUpTimerRecord {
        LevelUpTimerRecord(
            timerID: key,
            title: title,
            detail: detail,
            kind: call.getString("kind") ?? "timer",
            theme: call.getString("theme") ?? "level-up",
            icon: call.getString("icon") ?? "level-up",
            workoutName: call.getString("workoutName") ?? "Workout",
            exerciseName: call.getString("exerciseName") ?? detail,
            setNumber: call.getInt("setNumber") ?? 0,
            targetReps: call.getString("targetReps") ?? "",
            previousPerformance: call.getString("previousPerformance") ?? "",
            status: "running",
            startedAt: Date(),
            endAt: endAt,
            remainingSeconds: max(0, Int(ceil(endAt.timeIntervalSinceNow)))
        )
    }

    @available(iOS 16.1, *)
    @MainActor
    private func startLiveActivity(record: LevelUpTimerRecord) async -> (started: Bool, error: String?) {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            return (false, "Live Activities are disabled in iOS Settings.")
        }

        let state = LevelUpTimerStateStore.contentState(for: record)
        if let existing = Activity<LevelUpTimerAttributes>.activities.first(where: { $0.attributes.timerID == record.timerID }) {
            if #available(iOS 16.2, *) {
                await existing.update(ActivityContent(state: state, staleDate: record.kind == "cardio" ? nil : state.endAt.addingTimeInterval(60)))
            } else {
                await existing.update(using: state)
            }
            return (true, nil)
        }

        // Level Up owns one active workout timer. Await removal of any older
        // timer before requesting its replacement so rapid consecutive sets do
        // not race ActivityKit or exhaust the system activity limit.
        for activity in Activity<LevelUpTimerAttributes>.activities {
            if #available(iOS 16.2, *) {
                await activity.end(nil, dismissalPolicy: .immediate)
            } else {
                await activity.end(dismissalPolicy: .immediate)
            }
        }

        let attributes = LevelUpTimerAttributes(
            timerID: record.timerID,
            title: record.title,
            detail: record.detail,
            kind: record.kind,
            theme: record.theme,
            icon: record.icon,
            workoutName: record.workoutName,
            exerciseName: record.exerciseName,
            setNumber: record.setNumber,
            targetReps: record.targetReps,
            previousPerformance: record.previousPerformance
        )
        do {
            if #available(iOS 16.2, *) {
                _ = try Activity.request(attributes: attributes, content: ActivityContent(state: state, staleDate: record.kind == "cardio" ? nil : state.endAt.addingTimeInterval(60)), pushType: nil)
            } else {
                _ = try Activity.request(attributes: attributes, contentState: state, pushType: nil)
            }
            return (true, nil)
        } catch {
            NSLog("Level Up Live Activity could not start: %@", error.localizedDescription)
            return (false, error.localizedDescription)
        }
    }

    private func endLiveActivities(key: String) {
        guard #available(iOS 16.1, *) else { return }
        for activity in Activity<LevelUpTimerAttributes>.activities where activity.attributes.timerID == key {
            Task {
                if #available(iOS 16.2, *) {
                    await activity.end(nil, dismissalPolicy: .immediate)
                } else {
                    await activity.end(dismissalPolicy: .immediate)
                }
            }
        }
    }

    @objc private func cleanupExpiredLiveActivities() {
        guard #available(iOS 16.1, *) else { return }
        for activity in Activity<LevelUpTimerAttributes>.activities {
            let endAt: Date
            if #available(iOS 16.2, *) { endAt = activity.content.state.endAt }
            else { endAt = activity.contentState.endAt }
            if activity.attributes.kind != "cardio", endAt <= Date() {
                Task { await LevelUpTimerStateStore.finish(timerID: activity.attributes.timerID) }
            }
        }
    }
}

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
        center.getNotificationSettings { [weak self] settings in
            guard settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional || settings.authorizationStatus == .ephemeral else {
                call.reject("Notification permission is not enabled.")
                return
            }

            let content = UNMutableNotificationContent()
            content.title = title
            content.body = body
            content.sound = UNNotificationSound(named: UNNotificationSoundName("level-up-alarm.wav"))
            if #available(iOS 15.0, *) { content.interruptionLevel = .timeSensitive }
            content.userInfo = ["key": key, "type": call.getString("type") ?? "levelup:timer-complete"]

            let trigger = UNTimeIntervalNotificationTrigger(timeInterval: max(1, endAt.timeIntervalSinceNow), repeats: false)
            let request = UNNotificationRequest(identifier: self?.notificationIdentifier(key) ?? key, content: content, trigger: trigger)
            center.add(request) { error in
                if let error = error {
                    call.reject("The timer notification could not be scheduled.", nil, error)
                    return
                }
                if #available(iOS 16.1, *),
                   let record = self?.timerRecord(call: call, key: key, title: title, detail: body, endAt: endAt) {
                    LevelUpTimerStateStore.save(record)
                    self?.startLiveActivity(record: record)
                }
                call.resolve(["scheduled": true, "liveActivity": self?.liveActivitiesAvailable() ?? false])
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

    private func startLiveActivity(record: LevelUpTimerRecord) {
        guard #available(iOS 16.1, *), ActivityAuthorizationInfo().areActivitiesEnabled else { return }
        endLiveActivities(key: record.timerID)
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
        let state = LevelUpTimerStateStore.contentState(for: record)
        do {
            if #available(iOS 16.2, *) {
                _ = try Activity.request(attributes: attributes, content: ActivityContent(state: state, staleDate: state.endAt.addingTimeInterval(60)), pushType: nil)
            } else {
                _ = try Activity.request(attributes: attributes, contentState: state, pushType: nil)
            }
        } catch {
            NSLog("Level Up Live Activity could not start: %@", error.localizedDescription)
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
            if endAt <= Date() { endLiveActivities(key: activity.attributes.timerID) }
        }
    }
}

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
        CAPPluginMethod(name: "cancel", returnType: CAPPluginReturnPromise)
    ]

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
                self?.startLiveActivity(key: key, title: title, detail: body, endAt: endAt, kind: call.getString("kind") ?? "timer")
                call.resolve(["scheduled": true, "liveActivity": self?.liveActivitiesAvailable() ?? false])
            }
        }
    }

    @objc func cancel(_ call: CAPPluginCall) {
        let key = call.getString("key") ?? ""
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [notificationIdentifier(key)])
        endLiveActivities(key: key)
        call.resolve(["cancelled": true])
    }

    private func notificationIdentifier(_ key: String) -> String {
        "level-up.timer.\(key)"
    }

    private func liveActivitiesAvailable() -> Bool {
        if #available(iOS 16.1, *) { return ActivityAuthorizationInfo().areActivitiesEnabled }
        return false
    }

    private func startLiveActivity(key: String, title: String, detail: String, endAt: Date, kind: String) {
        guard #available(iOS 16.1, *), ActivityAuthorizationInfo().areActivitiesEnabled else { return }
        endLiveActivities(key: key)
        let attributes = LevelUpTimerAttributes(timerID: key, title: title, detail: detail, kind: kind)
        let state = LevelUpTimerAttributes.ContentState(startedAt: Date(), endAt: endAt)
        do {
            if #available(iOS 16.2, *) {
                _ = try Activity.request(attributes: attributes, content: ActivityContent(state: state, staleDate: endAt.addingTimeInterval(60)), pushType: nil)
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
}

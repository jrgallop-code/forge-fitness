import UIKit
import StoreKit
import Capacitor

@objc(LevelUpAppIconPlugin)
final class LevelUpAppIconPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "LevelUpAppIconPlugin"
    let jsName = "LevelUpAppIcon"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setIcon", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getIcon", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestReview", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openReviews", returnType: CAPPluginReturnPromise)
    ]

    private let iconNames: [String: String] = [
        "level-up": "",
        "arctic": "AppIconArctic",
        "pure": "AppIconPure",
        "ocean": "AppIconOcean",
        "midnight": "AppIconMidnight",
        "slate": "AppIconSlate",
        "pulse": "AppIconPulse"
    ]

    @objc func setIcon(_ call: CAPPluginCall) {
        let requested = call.getString("name") ?? "level-up"
        guard iconNames.keys.contains(requested) else {
            call.reject("That Level Up icon is not available.")
            return
        }
        guard UIApplication.shared.supportsAlternateIcons else {
            call.reject("Alternate app icons are not supported on this device.")
            return
        }
        let alternateName = iconNames[requested].flatMap { $0.isEmpty ? nil : $0 }
        DispatchQueue.main.async {
            UIApplication.shared.setAlternateIconName(alternateName) { error in
                if let error = error {
                    call.reject("The home-screen icon could not be changed.", nil, error)
                } else {
                    call.resolve(["name": requested])
                }
            }
        }
    }

    @objc func getIcon(_ call: CAPPluginCall) {
        let current = UIApplication.shared.alternateIconName
        let selected = current.flatMap { selected in iconNames.first(where: { $0.value == selected })?.key } ?? "level-up"
        call.resolve(["name": selected, "supported": UIApplication.shared.supportsAlternateIcons])
    }

    @objc func requestReview(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let now = Date()
            let defaults = UserDefaults.standard
            let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1"
            let first = (call.getDouble("firstWorkoutAt") ?? now.timeIntervalSince1970 * 1000) / 1000
            guard (call.getInt("completedWorkouts") ?? 0) >= 5,
                  now.timeIntervalSince1970 - first >= 7 * 86400 else {
                call.resolve(["requested": false, "reason": "notEligible"]); return
            }
            // TestFlight cannot display StoreKit review prompts; don't consume the cooldown.
            if Bundle.main.appStoreReceiptURL?.lastPathComponent == "sandboxReceipt" {
                call.resolve(["requested": false, "reason": "testFlight"]); return
            }
            let last = defaults.double(forKey: "levelUpReviewLastAttempt")
            guard (last == 0 || now.timeIntervalSince1970 - last >= 120 * 86400),
                  defaults.string(forKey: "levelUpReviewVersion") != version else {
                call.resolve(["requested": false, "reason": "cooldown"]); return
            }
            guard let scene = self.bridge?.viewController?.view.window?.windowScene,
                  scene.activationState == .foregroundActive else {
                call.resolve(["requested": false, "reason": "inactive"]); return
            }
            defaults.set(now.timeIntervalSince1970, forKey: "levelUpReviewLastAttempt")
            defaults.set(version, forKey: "levelUpReviewVersion")
            if #available(iOS 16.0, *) {
                AppStore.requestReview(in: scene)
            } else {
                SKStoreReviewController.requestReview(in: scene)
            }
            // Apple decides whether to display the prompt; this is an attempt, not a rating.
            call.resolve(["requested": true])
        }
    }

    @objc func openReviews(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let url = URL(string: "https://apps.apple.com/app/id6810024008?action=write-review") else {
                call.reject("App Store review link unavailable."); return
            }
            UIApplication.shared.open(url, options: [:]) { opened in
                if opened { call.resolve(["opened": true]) }
                else { call.reject("Could not open the App Store.") }
            }
        }
    }

}

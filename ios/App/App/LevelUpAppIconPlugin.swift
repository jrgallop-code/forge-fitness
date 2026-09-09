import UIKit
import Capacitor

@objc(LevelUpAppIconPlugin)
final class LevelUpAppIconPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "LevelUpAppIconPlugin"
    let jsName = "LevelUpAppIcon"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setIcon", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getIcon", returnType: CAPPluginReturnPromise)
    ]

    private let iconNames: [String: String?] = [
        "level-up": nil,
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
        let alternateName = iconNames[requested] ?? nil
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
        let selected = iconNames.first(where: { $0.value == current })?.key ?? "level-up"
        call.resolve(["name": selected, "supported": UIApplication.shared.supportsAlternateIcons])
    }
}

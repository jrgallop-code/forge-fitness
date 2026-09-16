import Capacitor
import WidgetKit

@objc(LevelUpDashboardWidgetPlugin)
final class LevelUpDashboardWidgetPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "LevelUpDashboardWidgetPlugin"
    let jsName = "LevelUpDashboardWidget"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "sync", returnType: CAPPluginReturnPromise)
    ]

    @objc func sync(_ call: CAPPluginCall) {
        guard let snapshot = call.getString("snapshot"),
              let data = snapshot.data(using: .utf8),
              (try? JSONSerialization.jsonObject(with: data)) != nil else {
            call.reject("A valid widget snapshot is required.")
            return
        }
        guard let defaults = UserDefaults(suiteName: "group.com.leveluphypertrophy.app.widgets") else {
            call.reject("The shared widget store is unavailable.")
            return
        }
        defaults.set(snapshot, forKey: "dashboardSnapshot")
        defaults.synchronize()
        WidgetCenter.shared.reloadTimelines(ofKind: "LevelUpDashboardWidget")
        call.resolve(["updated": true])
    }
}

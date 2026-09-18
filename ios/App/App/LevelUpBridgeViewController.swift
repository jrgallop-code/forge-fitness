import Capacitor
import SwiftUI

final class LevelUpBridgeViewController: CAPBridgeViewController {
    let nativeNavigationState = LevelUpNavigationState()
    var nativeNavigationHost: UIViewController?

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(LevelUpAppIconPlugin())
        bridge?.registerPluginInstance(LevelUpTimerPlugin())
        bridge?.registerPluginInstance(LevelUpDashboardWidgetPlugin())
        bridge?.registerPluginInstance(LevelUpNativeAuthPlugin())
        bridge?.registerPluginInstance(LevelUpFileExportPlugin())
        bridge?.registerPluginInstance(LevelUpArcadeAudioPlugin())
        bridge?.registerPluginInstance(LevelUpNativeNavigationPlugin())
        Task { @MainActor in
            installLiquidGlassNavigation()
        }
    }
}

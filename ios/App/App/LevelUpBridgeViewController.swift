import Capacitor

final class LevelUpBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(LevelUpAppIconPlugin())
        bridge?.registerPluginInstance(LevelUpTimerPlugin())
        bridge?.registerPluginInstance(LevelUpNativeAuthPlugin())
        bridge?.registerPluginInstance(LevelUpFileExportPlugin())
    }
}

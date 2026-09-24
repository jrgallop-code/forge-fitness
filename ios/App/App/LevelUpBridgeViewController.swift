import Capacitor

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
    }
}

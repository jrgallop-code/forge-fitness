import AVFoundation
import Capacitor

@objc(LevelUpArcadeAudioPlugin)
final class LevelUpArcadeAudioPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "LevelUpArcadeAudioPlugin"
    let jsName = "LevelUpArcadeAudio"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "play", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise)
    ]

    private let allowedSounds: Set<String> = [
        "menu-select", "game-start", "protein-pickup", "power-up",
        "whey-shot", "couch-hit", "ghost-crush", "enemy-explosion",
        "player-hit", "helicopter-rotor", "damage-grunt-1",
        "damage-grunt-2", "damage-grunt-3", "game-over-scream"
    ]
    private var loopingPlayers: [String: AVAudioPlayer] = [:]
    private var effectPlayers: [UUID: AVAudioPlayer] = [:]

    @objc func play(_ call: CAPPluginCall) {
        guard let name = call.getString("name"), allowedSounds.contains(name) else {
            call.reject("That arcade sound is not available.")
            return
        }
        guard let url = soundURL(name: name) else {
            call.reject("The arcade sound was not packaged in this build.")
            return
        }

        let volume = Float(max(0, min(1, call.getDouble("volume") ?? 0.65)))
        let rate = Float(max(0.5, min(2, call.getDouble("playbackRate") ?? 1)))
        let loop = call.getBool("loop") ?? false

        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            do {
                let session = AVAudioSession.sharedInstance()
                try session.setCategory(.playback, mode: .default, options: [.mixWithOthers])
                try session.setActive(true)

                if loop {
                    self.loopingPlayers[name]?.stop()
                }
                let player = try AVAudioPlayer(contentsOf: url)
                player.volume = volume
                player.enableRate = true
                player.rate = rate
                player.numberOfLoops = loop ? -1 : 0
                player.prepareToPlay()
                guard player.play() else {
                    call.reject("iOS could not start the arcade sound.")
                    return
                }

                if loop {
                    self.loopingPlayers[name] = player
                } else {
                    let playerID = UUID()
                    self.effectPlayers[playerID] = player
                    let releaseDelay = max(0.5, player.duration / Double(rate) + 0.35)
                    DispatchQueue.main.asyncAfter(deadline: .now() + releaseDelay) { [weak self] in
                        self?.effectPlayers.removeValue(forKey: playerID)
                    }
                }
                call.resolve(["playing": true, "name": name])
            } catch {
                call.reject("The arcade sound could not be played.", nil, error)
            }
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        let name = call.getString("name") ?? ""
        DispatchQueue.main.async { [weak self] in
            self?.loopingPlayers.removeValue(forKey: name)?.stop()
            call.resolve(["stopped": true, "name": name])
        }
    }

    private func soundURL(name: String) -> URL? {
        if let url = Bundle.main.url(
            forResource: name,
            withExtension: "wav",
            subdirectory: "public/assets/audio/arcade"
        ) {
            return url
        }
        let fallback = Bundle.main.bundleURL
            .appendingPathComponent("public/assets/audio/arcade", isDirectory: true)
            .appendingPathComponent("\(name).wav")
        return FileManager.default.fileExists(atPath: fallback.path) ? fallback : nil
    }
}

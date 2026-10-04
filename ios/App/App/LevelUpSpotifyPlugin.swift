import UIKit
import Capacitor
import SpotifyiOS
import Security

// Tokens stay in Keychain; song data, never credentials, crosses the bridge.
final class LevelUpSpotifyRemote: NSObject, SPTAppRemoteDelegate, SPTAppRemotePlayerStateDelegate {
    static let shared = LevelUpSpotifyRemote()
    static let redirect = URL(string: "levelupspotify://callback")!
    private let tokenService = "com.leveluphypertrophy.spotify"
    private var remote: SPTAppRemote?
    private var token: String?
    private(set) var state: [String: Any] = ["connected": false]
    var onChange: (([String: Any]) -> Void)?
    private var clientID: String {
        (Bundle.main.object(forInfoDictionaryKey: "SpotifyClientID") as? String ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
    }
    var configured: Bool { clientID.range(of: "^[a-fA-F0-9]{32}$", options: .regularExpression) != nil }
    override init() {
        super.init()
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: tokenService, kSecAttrAccount as String: "app-remote", kSecReturnData as String: true]
        var result: CFTypeRef?
        if SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess, let data = result as? Data { token = String(data: data, encoding: .utf8) }
    }
    private func makeRemote() -> SPTAppRemote? {
        guard configured else { return nil }
        if let remote = remote { return remote }
        let config = SPTConfiguration(clientID: clientID, redirectURL: Self.redirect)
        let value = SPTAppRemote(configuration: config, logLevel: .none)
        value.delegate = self
        value.connectionParameters.accessToken = token
        remote = value
        return value
    }
    func status() -> [String: Any] {
        var result = state
        result["configured"] = configured
        result["authorized"] = token != nil
        result["installed"] = UIApplication.shared.canOpenURL(URL(string: "spotify:")!)
        return result
    }
    func connect() -> Bool {
        guard let remote = makeRemote() else { return false }
        if remote.isConnected { return true }
        if token != nil { remote.connect() }
        else { remote.authorizeAndPlayURI("") { [weak self] success in if !success { self?.clearState("Open Spotify and try connecting again.") } } }
        return true
    }
    func authorize() {
        makeRemote()?.authorizeAndPlayURI("") { [weak self] success in if !success { self?.clearState("Open Spotify and try connecting again.") } }
    }
    func handle(_ url: URL) -> Bool {
        guard url.scheme == Self.redirect.scheme, url.host == Self.redirect.host, let remote = makeRemote() else { return false }
        let parameters = remote.authorizationParameters(from: url)
        if let value = parameters?[SPTAppRemoteAccessTokenKey] {
            token = value
            let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: tokenService, kSecAttrAccount as String: "app-remote"]
            SecItemDelete(query as CFDictionary)
            var item = query
            item[kSecValueData as String] = Data(value.utf8)
            item[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
            SecItemAdd(item as CFDictionary, nil)
            remote.connectionParameters.accessToken = value
            if UIApplication.shared.applicationState == .active { remote.connect() }
        } else { clearState("Spotify connection was not approved. Try connecting again.") }
        return true
    }
    func inactive() { remote?.disconnect(); clearState() }
    func active() { if token != nil { makeRemote()?.connect() } }
    func disconnect() {
        token = nil
        remote?.connectionParameters.accessToken = nil
        remote?.disconnect()
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: tokenService, kSecAttrAccount as String: "app-remote"]
        SecItemDelete(query as CFDictionary)
        clearState()
    }
    private func clearState(_ message: String = "") {
        state = ["connected": false, "message": message]
        onChange?(status())
    }
    private func update(_ player: SPTAppRemotePlayerState) {
        state = ["connected": true, "paused": player.isPaused, "observedAt": Date().timeIntervalSince1970 * 1000]
        let track = player.track
        if !track.isEpisode && !track.isAdvertisement && track.uri.hasPrefix("spotify:track:") {
            state["track"] = ["uri": track.uri, "title": track.name, "artist": track.artist.name]
        }
        onChange?(status())
    }
    func snapshot(_ completion: @escaping ([String: Any]) -> Void) {
        guard let remote = remote, remote.isConnected, let api = remote.playerAPI else { completion(status()); return }
        api.getPlayerState { [weak self] result, error in
            DispatchQueue.main.async {
                guard let self = self else { completion(["connected": false]); return }
                if remote.isConnected, error == nil, let player = result as? SPTAppRemotePlayerState { self.update(player); completion(self.status()) }
                else { completion(["connected": false]) }
            }
        }
    }
    func appRemoteDidEstablishConnection(_ appRemote: SPTAppRemote) {
        appRemote.playerAPI?.delegate = self
        appRemote.playerAPI?.subscribe(toPlayerState: { [weak self] _, error in if error != nil { self?.clearState("Spotify updates unavailable. Reconnect Spotify.") } })
        snapshot { _ in }
    }
    func appRemote(_ appRemote: SPTAppRemote, didFailConnectionAttemptWithError error: Error?) { clearState("Open Spotify, start music, then reconnect.") }
    func appRemote(_ appRemote: SPTAppRemote, didDisconnectWithError error: Error?) { clearState() }
    func playerStateDidChange(_ playerState: SPTAppRemotePlayerState) { update(playerState) }
}

@objc(LevelUpSpotifyPlugin)
public class LevelUpSpotifyPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LevelUpSpotifyPlugin"
    public let jsName = "LevelUpSpotify"
    public let pluginMethods: [CAPPluginMethod] = ["status", "connect", "snapshot", "disconnect"].map { CAPPluginMethod(name: $0, returnType: CAPPluginReturnPromise) }
    public override func load() {
        LevelUpSpotifyRemote.shared.onChange = { [weak self] state in self?.notifyListeners("playerState", data: state) }
    }
    @objc func status(_ call: CAPPluginCall) { DispatchQueue.main.async { call.resolve(LevelUpSpotifyRemote.shared.status()) } }
    @objc func connect(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let spotify = LevelUpSpotifyRemote.shared
            guard spotify.configured else { call.reject("Spotify setup is pending for this test build."); return }
            guard UIApplication.shared.canOpenURL(URL(string: "spotify:")!) else { call.reject("Install Spotify and sign in first."); return }
            if call.getBool("reauthorize") == true { spotify.authorize() } else { _ = spotify.connect() }
            call.resolve(spotify.status())
        }
    }
    @objc func snapshot(_ call: CAPPluginCall) { DispatchQueue.main.async { LevelUpSpotifyRemote.shared.snapshot { call.resolve($0) } } }
    @objc func disconnect(_ call: CAPPluginCall) { DispatchQueue.main.async { LevelUpSpotifyRemote.shared.disconnect(); call.resolve() } }
}

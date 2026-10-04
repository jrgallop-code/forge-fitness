import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        // Use the Level Up bridge so custom native plugins (icons, timers and
        // authentication) are available to the Capacitor web layer.
        window?.rootViewController = LevelUpBridgeViewController()
        window?.makeKeyAndVisible()

        for context in connectionOptions.urlContexts { _ = LevelUpSpotifyRemote.shared.handle(context.url) }
        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        for context in URLContexts {
            if LevelUpSpotifyRemote.shared.handle(context.url) { return }
        }
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func sceneDidBecomeActive(_ scene: UIScene) { LevelUpSpotifyRemote.shared.active() }
    func sceneWillResignActive(_ scene: UIScene) { LevelUpSpotifyRemote.shared.inactive() }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}

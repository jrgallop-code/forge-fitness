import UIKit
import AuthenticationServices
import CryptoKit
import Capacitor

@objc(LevelUpNativeAuthPlugin)
final class LevelUpNativeAuthPlugin: CAPPlugin, CAPBridgedPlugin, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    let identifier = "LevelUpNativeAuthPlugin"
    let jsName = "LevelUpNativeAuth"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "signInWithApple", returnType: CAPPluginReturnPromise)
    ]

    private var pendingCall: CAPPluginCall?
    private var rawNonce: String?

    @objc func signInWithApple(_ call: CAPPluginCall) {
        guard pendingCall == nil else {
            call.reject("A sign-in request is already open.")
            return
        }
        let nonce = randomNonce()
        rawNonce = nonce
        pendingCall = call
        let request = ASAuthorizationAppleIDProvider().createRequest()
        request.requestedScopes = [.fullName, .email]
        request.nonce = sha256(nonce)
        let controller = ASAuthorizationController(authorizationRequests: [request])
        controller.delegate = self
        controller.presentationContextProvider = self
        controller.performRequests()
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
              let tokenData = credential.identityToken,
              let identityToken = String(data: tokenData, encoding: .utf8),
              let codeData = credential.authorizationCode,
              let authorizationCode = String(data: codeData, encoding: .utf8),
              let call = pendingCall,
              let nonce = rawNonce else {
            finishWithError("Apple sign-in did not return valid account credentials.")
            return
        }
        let formatter = PersonNameComponentsFormatter()
        let name = credential.fullName.map { formatter.string(from: $0) } ?? ""
        call.resolve([
            "identityToken": identityToken,
            "authorizationCode": authorizationCode,
            "nonce": nonce,
            "email": credential.email ?? "",
            "name": name,
            "appleUser": credential.user
        ])
        pendingCall = nil
        rawNonce = nil
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        let authError = error as? ASAuthorizationError
        if authError?.code == .canceled { finishWithError("Apple sign-in was cancelled.") }
        else { finishWithError("Apple sign-in could not be completed.", error: error) }
    }

    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        bridge?.viewController?.view.window ?? UIApplication.shared.connectedScenes
            .compactMap { ($0 as? UIWindowScene)?.keyWindow }
            .first ?? ASPresentationAnchor()
    }

    private func finishWithError(_ message: String, error: Error? = nil) {
        pendingCall?.reject(message, nil, error)
        pendingCall = nil
        rawNonce = nil
    }

    private func randomNonce(length: Int = 32) -> String {
        let characters = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        return String((0..<length).map { _ in characters.randomElement()! })
    }

    private func sha256(_ value: String) -> String {
        SHA256.hash(data: Data(value.utf8)).map { String(format: "%02x", $0) }.joined()
    }
}

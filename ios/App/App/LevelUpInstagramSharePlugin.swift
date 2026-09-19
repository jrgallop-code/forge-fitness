import UIKit
import Photos
import Capacitor

@objc(LevelUpInstagramSharePlugin)
final class LevelUpInstagramSharePlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "LevelUpInstagramSharePlugin"
    let jsName = "LevelUpInstagramShare"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "shareToStories", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "saveImage", returnType: CAPPluginReturnPromise)
    ]

    @objc func shareToStories(_ call: CAPPluginCall) {
        guard let imageData = decodedImageData(from: call) else {
            call.reject("The workout image could not be prepared.")
            return
        }
        guard let storiesURL = URL(string: "instagram-stories://share") else {
            call.resolve(["opened": false])
            return
        }

        DispatchQueue.main.async {
            guard UIApplication.shared.canOpenURL(storiesURL) else {
                call.resolve(["opened": false, "reason": "not-installed"])
                return
            }

            var pasteboardItem: [String: Any] = [
                "com.instagram.sharedSticker.backgroundImage": imageData
            ]
            if let contentURL = call.getString("contentUrl"), !contentURL.isEmpty {
                pasteboardItem["com.instagram.sharedSticker.contentURL"] = contentURL
            }
            UIPasteboard.general.setItems(
                [pasteboardItem],
                options: [.expirationDate: Date().addingTimeInterval(300)]
            )
            UIApplication.shared.open(storiesURL, options: [:]) { opened in
                call.resolve(["opened": opened])
            }
        }
    }

    @objc func saveImage(_ call: CAPPluginCall) {
        guard let data = decodedImageData(from: call), let image = UIImage(data: data) else {
            call.reject("The workout image could not be prepared.")
            return
        }

        PHPhotoLibrary.requestAuthorization(for: .addOnly) { status in
            guard status == .authorized || status == .limited else {
                call.reject("Photo access is required to save the workout card.")
                return
            }
            PHPhotoLibrary.shared().performChanges({
                PHAssetChangeRequest.creationRequestForAsset(from: image)
            }) { saved, error in
                if let error {
                    call.reject("The workout card could not be saved.", nil, error)
                } else {
                    call.resolve(["saved": saved])
                }
            }
        }
    }

    private func decodedImageData(from call: CAPPluginCall) -> Data? {
        guard let encoded = call.getString("imageData"), !encoded.isEmpty else { return nil }
        return Data(base64Encoded: encoded)
    }
}

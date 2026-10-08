import UIKit
import Photos
import Security
import Capacitor
import LinkPresentation
import PhotosUI
import Vision

@objc(LevelUpInstagramSharePlugin)
final class LevelUpInstagramSharePlugin: CAPPlugin, CAPBridgedPlugin, PHPickerViewControllerDelegate {
    let identifier = "LevelUpInstagramSharePlugin"
    let jsName = "LevelUpInstagramShare"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "saveImage", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "readWorkoutScreenshot", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openInstagram", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pendingVideos", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "acknowledgeVideo", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "videoPreview", returnType: CAPPluginReturnPromise)
    ]

    private var screenshotCall: CAPPluginCall?

    @objc func readWorkoutScreenshot(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard self.screenshotCall == nil, let controller = self.bridge?.viewController else {
                call.reject("The image picker is already open or unavailable."); return
            }
            self.screenshotCall = call
            var config = PHPickerConfiguration()
            config.filter = .images; config.selectionLimit = 1
            let picker = PHPickerViewController(configuration: config)
            picker.delegate = self
            controller.present(picker, animated: true)
        }
    }

    func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
        let call = screenshotCall
        screenshotCall = nil
        picker.dismiss(animated: true)
        guard let call else { return }
        guard let result = results.first else { call.resolve(["cancelled": true]); return }
        result.itemProvider.loadObject(ofClass: UIImage.self) { object, error in
            guard let image = object as? UIImage else { call.reject("Couldn't open that image.", nil, error); return }
            DispatchQueue.global(qos: .userInitiated).async {
                let scale = min(1, 2400 / max(image.size.width, image.size.height))
                let size = CGSize(width: image.size.width * scale, height: image.size.height * scale)
                let format = UIGraphicsImageRendererFormat(); format.scale = 1
                let normalized = UIGraphicsImageRenderer(size: size, format: format).image { _ in image.draw(in: CGRect(origin: .zero, size: size)) }
                guard let cgImage = normalized.cgImage else { call.reject("Couldn't read that image."); return }
                let request = VNRecognizeTextRequest()
                request.recognitionLevel = .accurate
                request.usesLanguageCorrection = true
                request.recognitionLanguages = ["en-US"]
                do {
                    try VNImageRequestHandler(cgImage: cgImage, orientation: .up).perform([request])
                    let lines = (request.results ?? []).sorted { a, b in
                        if abs(a.boundingBox.midY - b.boundingBox.midY) > 0.015 { return a.boundingBox.midY > b.boundingBox.midY }
                        return a.boundingBox.minX < b.boundingBox.minX
                    }.compactMap { $0.topCandidates(1).first?.string }
                    call.resolve(["text": lines.joined(separator: "\n")])
                } catch { call.reject("Couldn't recognize the screenshot text.", nil, error) }
            }
        }
    }

    private var metadataProviders: [UUID: LPMetadataProvider] = [:]

    @objc func openInstagram(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let appURL = URL(string: "instagram://app")!
            let webURL = URL(string: "https://www.instagram.com/")!
            UIApplication.shared.open(UIApplication.shared.canOpenURL(appURL) ? appURL : webURL) { opened in
                call.resolve(["opened": opened])
            }
        }
    }

    private func inboxQuery() -> [String: Any]? {
        guard let group = Bundle.main.object(forInfoDictionaryKey: "SharedKeychainAccessGroup") as? String else { return nil }
        return [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: "levelup.instagram.inbox", kSecAttrAccessGroup as String: group]
    }

    @objc func pendingVideos(_ call: CAPPluginCall) {
        guard var query = inboxQuery() else { call.reject("Shared storage is unavailable."); return }
        query[kSecReturnData as String] = true
        query[kSecReturnAttributes as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitAll
        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess || status == errSecItemNotFound else { call.reject("Couldn't read shared videos."); return }
        let rows = result as? [[String: Any]] ?? []
        let items = rows.compactMap { row -> [String: Any]? in
            guard let data = row[kSecValueData as String] as? Data, data.count <= 20000 else { return nil }
            return (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
        }
        call.resolve(["items": items])
    }

    @objc func acknowledgeVideo(_ call: CAPPluginCall) {
        guard let id = call.getString("id"), UUID(uuidString: id) != nil, var query = inboxQuery() else { call.reject("Invalid video."); return }
        query[kSecAttrAccount as String] = id
        let status = SecItemDelete(query as CFDictionary)
        if status == errSecSuccess || status == errSecItemNotFound { call.resolve(["saved": true]) }
        else { call.reject("Couldn't finish importing this video.") }
    }

    @objc func videoPreview(_ call: CAPPluginCall) {
        guard let value = call.getString("url"), let url = URL(string: value),
              url.scheme == "https", url.host == "www.instagram.com" else { call.reject("Invalid Instagram link."); return }
        DispatchQueue.main.async {
            let provider = LPMetadataProvider()
            let requestID = UUID()
            self.metadataProviders[requestID] = provider
            provider.timeout = 10
            provider.startFetchingMetadata(for: url) { metadata, _ in
                DispatchQueue.main.async { self.metadataProviders.removeValue(forKey: requestID) }
                guard let metadata else { call.resolve(["title": "", "cover": ""]); return }
                let title = metadata.title ?? ""
                guard let imageProvider = metadata.imageProvider else { call.resolve(["title": title, "cover": ""]); return }
                imageProvider.loadObject(ofClass: UIImage.self) { object, _ in
                    guard let image = object as? UIImage else { call.resolve(["title": title, "cover": ""]); return }
                    let scale = min(1, 640 / max(image.size.width, image.size.height))
                    let size = CGSize(width: image.size.width * scale, height: image.size.height * scale)
                    let format = UIGraphicsImageRendererFormat(); format.scale = 1
                    let preview = UIGraphicsImageRenderer(size: size, format: format).image { _ in image.draw(in: CGRect(origin: .zero, size: size)) }
                    let cover = preview.jpegData(compressionQuality: 0.7).map { "data:image/jpeg;base64," + $0.base64EncodedString() } ?? ""
                    call.resolve(["title": title, "cover": cover])
                }
            }
        }
    }

    @objc func saveImage(_ call: CAPPluginCall) {
        guard let data = decodedImageData(from: call), let image = UIImage(data: data) else {
            call.reject("The image could not be prepared.")
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
                    call.reject("The image could not be saved.", nil, error)
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

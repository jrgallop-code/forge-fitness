import UIKit
import Social
import Security
import UniformTypeIdentifiers

// The extension saves an inbox item; the containing app imports it on next open.
final class ShareViewController: SLComposeServiceViewController {
    private var instagramURL: URL?
    private var loading = true
    private var failed = false

    override func viewDidLoad() {
        super.viewDidLoad()
        title = "Save to Level Up"
        placeholder = "Optional workout name or notes"
        navigationController?.navigationBar.topItem?.rightBarButtonItem?.title = "Save"
        Task { @MainActor in
            let items = extensionContext?.inputItems as? [NSExtensionItem] ?? []
            for provider in items.flatMap({ $0.attachments ?? [] }) {
                for type in [UTType.url.identifier, UTType.plainText.identifier] where provider.hasItemConformingToTypeIdentifier(type) {
                    let item = try? await provider.loadItem(forTypeIdentifier: type, options: nil)
                    let text = (item as? URL)?.absoluteString ?? (item as? String) ?? (item as? Data).flatMap { String(data: $0, encoding: .utf8) } ?? ""
                    if let url = Self.instagramLink(in: text) { instagramURL = url; break }
                }
                if instagramURL != nil { break }
            }
            loading = false
            if instagramURL == nil {
                failed = true
                placeholder = "This isn't an Instagram post link. In Instagram, choose Share → More → Level Up."
            }
            validateContent()
        }
    }

    override func isContentValid() -> Bool { !loading && !failed && instagramURL != nil && (contentText ?? "").count <= 2000 }

    override func didSelectPost() {
        guard let url = instagramURL, let group = Bundle.main.object(forInfoDictionaryKey: "SharedKeychainAccessGroup") as? String else {
            showError("Shared storage is unavailable. Please copy the Instagram link and paste it in Level Up.")
            return
        }
        do {
            let id = UUID().uuidString
            let item = ["id": id, "url": url.absoluteString, "title": String((contentText ?? "").prefix(2000)), "createdAt": ISO8601DateFormatter().string(from: Date())]
            let data = try JSONSerialization.data(withJSONObject: item)
            let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
                kSecAttrService as String: "levelup.instagram.inbox", kSecAttrAccount as String: id,
                kSecAttrAccessGroup as String: group, kSecValueData as String: data,
                kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly]
            guard SecItemAdd(query as CFDictionary, nil) == errSecSuccess else {
                showError("Couldn't save the link. Try again, or copy it into Level Up."); return
            }
            extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        } catch { showError("Couldn't save the link. Try again, or copy it into Level Up.") }
    }

    private func showError(_ message: String) {
        let alert = UIAlertController(title: "Couldn't save video", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }

    private static func instagramLink(in text: String) -> URL? {
        guard let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue) else { return nil }
        for match in detector.matches(in: text, range: NSRange(text.startIndex..., in: text)) {
            guard let url = match.url, let host = url.host?.lowercased(),
                  ["instagram.com", "www.instagram.com", "m.instagram.com"].contains(host),
                  ["https", "http"].contains(url.scheme?.lowercased() ?? "") else { continue }
            let parts = url.pathComponents.filter { $0 != "/" }
            guard parts.count == 2, ["reel", "reels", "p", "tv"].contains(parts[0]) else { continue }
            var clean = URLComponents()
            clean.scheme = "https"; clean.host = "www.instagram.com"
            clean.path = "/\(parts[0] == "reels" ? "reel" : parts[0])/\(parts[1])/"
            return clean.url
        }
        return nil
    }
}

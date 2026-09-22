import Foundation
import CryptoKit
import Capacitor

@objc(LevelUpProgressPhotosPlugin)
final class LevelUpProgressPhotosPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "LevelUpProgressPhotosPlugin"
    let jsName = "LevelUpProgressPhotos"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "savePhoto", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "listPhotos", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "deletePhoto", returnType: CAPPluginReturnPromise)
    ]

    private struct PhotoMetadata: Codable {
        let id: String
        let date: String
        let note: String
        let createdAt: String
    }

    @objc func savePhoto(_ call: CAPPluginCall) {
        guard
            let id = safeIdentifier(call.getString("id")),
            let date = call.getString("date"), date.range(of: #"^\d{4}-\d{2}-\d{2}$"#, options: .regularExpression) != nil,
            let createdAt = call.getString("createdAt"),
            let encoded = call.getString("imageData"),
            let imageData = decodeImage(encoded),
            !imageData.isEmpty,
            imageData.count <= 8_000_000
        else {
            call.reject("The progress photo could not be saved.")
            return
        }

        let note = String((call.getString("note") ?? "").prefix(160))
        let metadata = PhotoMetadata(id: id, date: date, note: note, createdAt: createdAt)

        do {
            let directory = try protectedDirectory(owner: call.getString("owner"))
            let imageURL = directory.appendingPathComponent("\(id).jpg", isDirectory: false)
            let metadataURL = directory.appendingPathComponent("\(id).json", isDirectory: false)
            try imageData.write(to: imageURL, options: [.atomic, .completeFileProtection])
            try JSONEncoder().encode(metadata).write(to: metadataURL, options: [.atomic, .completeFileProtection])
            call.resolve(["saved": true])
        }
        catch {
            call.reject("The progress photo could not be saved.", nil, error)
        }
    }

    @objc func listPhotos(_ call: CAPPluginCall) {
        do {
            let directory = try protectedDirectory(owner: call.getString("owner"))
            let metadataURLs = try FileManager.default.contentsOfDirectory(
                at: directory,
                includingPropertiesForKeys: nil,
                options: [.skipsHiddenFiles]
            ).filter { $0.pathExtension == "json" }

            let photos: [[String: Any]] = metadataURLs.compactMap { metadataURL in
                guard
                    let metadataData = try? Data(contentsOf: metadataURL),
                    let metadata = try? JSONDecoder().decode(PhotoMetadata.self, from: metadataData),
                    let id = safeIdentifier(metadata.id),
                    let imageData = try? Data(contentsOf: directory.appendingPathComponent("\(id).jpg"))
                else { return nil }

                return [
                    "id": metadata.id,
                    "date": metadata.date,
                    "note": metadata.note,
                    "createdAt": metadata.createdAt,
                    "image": "data:image/jpeg;base64,\(imageData.base64EncodedString())"
                ]
            }.sorted {
                let left = "\($0["date"] ?? "")|\($0["createdAt"] ?? "")"
                let right = "\($1["date"] ?? "")|\($1["createdAt"] ?? "")"
                return left > right
            }

            call.resolve(["photos": photos])
        }
        catch {
            call.reject("Progress photos could not be loaded.", nil, error)
        }
    }

    @objc func deletePhoto(_ call: CAPPluginCall) {
        guard let id = safeIdentifier(call.getString("id")) else {
            call.reject("Invalid progress photo.")
            return
        }
        do {
            let directory = try protectedDirectory(owner: call.getString("owner"))
            for fileExtension in ["jpg", "json"] {
                let url = directory.appendingPathComponent("\(id).\(fileExtension)")
                if FileManager.default.fileExists(atPath: url.path) {
                    try FileManager.default.removeItem(at: url)
                }
            }
            call.resolve(["deleted": true])
        }
        catch {
            call.reject("The progress photo could not be removed.", nil, error)
        }
    }

    private func protectedDirectory(owner: String?) throws -> URL {
        let manager = FileManager.default
        let base = try manager.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
            .appendingPathComponent("LevelUpProgressPhotos", isDirectory: true)
        let ownerDirectory = base.appendingPathComponent(ownerHash(owner), isDirectory: true)
        try manager.createDirectory(
            at: ownerDirectory,
            withIntermediateDirectories: true,
            attributes: [.protectionKey: FileProtectionType.complete]
        )
        try excludeFromBackup(base)
        try excludeFromBackup(ownerDirectory)
        return ownerDirectory
    }

    private func excludeFromBackup(_ url: URL) throws {
        var mutableURL = url
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        try mutableURL.setResourceValues(values)
    }

    private func ownerHash(_ owner: String?) -> String {
        let normalized = (owner?.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()).flatMap { $0.isEmpty ? nil : $0 } ?? "local-device-owner"
        return SHA256.hash(data: Data(normalized.utf8)).map { String(format: "%02x", $0) }.joined()
    }

    private func safeIdentifier(_ value: String?) -> String? {
        guard let value, value.range(of: #"^[A-Za-z0-9_-]{1,120}$"#, options: .regularExpression) != nil else { return nil }
        return value
    }

    private func decodeImage(_ value: String) -> Data? {
        let encoded = value.components(separatedBy: ",").last ?? value
        return Data(base64Encoded: encoded, options: [.ignoreUnknownCharacters])
    }
}

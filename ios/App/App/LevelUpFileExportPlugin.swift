import UIKit
import Capacitor

@objc(LevelUpFileExportPlugin)
final class LevelUpFileExportPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "LevelUpFileExportPlugin"
    let jsName = "LevelUpFileExport"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "shareJson", returnType: CAPPluginReturnPromise)
    ]

    @objc func shareJson(_ call: CAPPluginCall) {
        guard let content = call.getString("content"), !content.isEmpty else {
            call.reject("The backup file was empty.")
            return
        }

        let requestedName = call.getString("filename") ?? "level-up-backup.json"
        let safeName = requestedName
            .replacingOccurrences(of: "/", with: "-")
            .replacingOccurrences(of: "\\", with: "-")
        let filename = safeName.lowercased().hasSuffix(".json") ? safeName : "\(safeName).json"
        let fileURL = FileManager.default.temporaryDirectory.appendingPathComponent(filename)

        do {
            try Data(content.utf8).write(to: fileURL, options: .atomic)
        } catch {
            call.reject("The backup file could not be prepared.", nil, error)
            return
        }

        DispatchQueue.main.async { [weak self] in
            guard let self, let presenter = self.bridge?.viewController else {
                try? FileManager.default.removeItem(at: fileURL)
                call.reject("The iOS save menu could not be opened.")
                return
            }

            let activity = UIActivityViewController(activityItems: [fileURL], applicationActivities: nil)
            if let popover = activity.popoverPresentationController {
                popover.sourceView = presenter.view
                popover.sourceRect = CGRect(x: presenter.view.bounds.midX, y: presenter.view.bounds.midY, width: 1, height: 1)
                popover.permittedArrowDirections = []
            }
            activity.completionWithItemsHandler = { _, completed, _, _ in
                try? FileManager.default.removeItem(at: fileURL)
                call.resolve(["completed": completed, "cancelled": !completed])
            }
            presenter.present(activity, animated: true)
        }
    }
}

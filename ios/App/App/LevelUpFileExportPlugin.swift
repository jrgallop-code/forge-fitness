import UIKit
import Capacitor

@objc(LevelUpFileExportPlugin)
final class LevelUpFileExportPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "LevelUpFileExportPlugin"
    let jsName = "LevelUpFileExport"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "shareJson", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sharePdf", returnType: CAPPluginReturnPromise)
    ]

    @objc func sharePdf(_ call: CAPPluginCall) {
        guard let html = call.getString("html"), !html.isEmpty else {
            call.reject("The report was empty.")
            return
        }
        if html.utf8.count > 2_500_000 {
            call.reject("The report was too large to export.")
            return
        }

        let requestedName = call.getString("filename") ?? "level-up-monthly-report.pdf"
        let safeName = requestedName
            .replacingOccurrences(of: "/", with: "-")
            .replacingOccurrences(of: "\\", with: "-")
        let filename = safeName.lowercased().hasSuffix(".pdf") ? safeName : "\(safeName).pdf"
        let fileURL = FileManager.default.temporaryDirectory.appendingPathComponent(filename)

        DispatchQueue.main.async { [weak self] in
            guard let self, let presenter = self.bridge?.viewController else {
                call.reject("The iOS share menu could not be opened.")
                return
            }

            let formatter = UIMarkupTextPrintFormatter(markupText: html)
            let renderer = UIPrintPageRenderer()
            renderer.addPrintFormatter(formatter, startingAtPageAt: 0)

            let paperRect = CGRect(x: 0, y: 0, width: 612, height: 792)
            let printableRect = paperRect.insetBy(dx: 28, dy: 28)
            renderer.setValue(NSValue(cgRect: paperRect), forKey: "paperRect")
            renderer.setValue(NSValue(cgRect: printableRect), forKey: "printableRect")

            let data = NSMutableData()
            UIGraphicsBeginPDFContextToData(data, paperRect, [
                kCGPDFContextCreator as String: "Level Up",
                kCGPDFContextTitle as String: filename
            ])
            for pageIndex in 0..<renderer.numberOfPages {
                UIGraphicsBeginPDFPageWithInfo(paperRect, nil)
                renderer.drawPage(at: pageIndex, in: UIGraphicsGetPDFContextBounds())
            }
            UIGraphicsEndPDFContext()

            do {
                try (data as Data).write(to: fileURL, options: .atomic)
            } catch {
                call.reject("The PDF could not be prepared.", nil, error)
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

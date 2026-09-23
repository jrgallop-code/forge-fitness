import UIKit
import Capacitor

private final class LevelUpPDFPageRenderer: UIPrintPageRenderer {
    private let levelUpPaperRect = CGRect(x: 0, y: 0, width: 612, height: 792)
    override var paperRect: CGRect { levelUpPaperRect }
    override var printableRect: CGRect { levelUpPaperRect.insetBy(dx: 28, dy: 28) }
}

@objc(LevelUpFileExportPlugin)
final class LevelUpFileExportPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "LevelUpFileExportPlugin"
    let jsName = "LevelUpFileExport"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "shareJson", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sharePdf", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "shareImage", returnType: CAPPluginReturnPromise)
    ]


    @objc func shareImage(_ call: CAPPluginCall) {
        guard let encoded = call.getString("imageData"), !encoded.isEmpty,
              let data = Data(base64Encoded: encoded) else {
            call.reject("The image could not be prepared.")
            return
        }

        let requestedName = call.getString("filename") ?? "level-up-summary.png"
        let safeName = requestedName
            .replacingOccurrences(of: "/", with: "-")
            .replacingOccurrences(of: "\\", with: "-")
        let filename = safeName.lowercased().hasSuffix(".png") ? safeName : "\(safeName).png"
        let fileURL = FileManager.default.temporaryDirectory.appendingPathComponent(filename)

        do {
            try data.write(to: fileURL, options: .atomic)
        } catch {
            call.reject("The image could not be prepared.", nil, error)
            return
        }

        presentShareSheet(fileURL: fileURL, call: call)
    }

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
            let renderer = LevelUpPDFPageRenderer()
            renderer.addPrintFormatter(formatter, startingAtPageAt: 0)

            let pageCount = renderer.numberOfPages
            guard pageCount > 0 && pageCount <= 40 else {
                call.reject("The PDF layout could not be prepared.")
                return
            }
            renderer.prepare(forDrawingPages: NSRange(location: 0, length: pageCount))

            let data = NSMutableData()
            UIGraphicsBeginPDFContextToData(data, renderer.paperRect, [
                kCGPDFContextCreator as String: "Level Up",
                kCGPDFContextTitle as String: filename
            ])
            for pageIndex in 0..<pageCount {
                autoreleasepool {
                    UIGraphicsBeginPDFPageWithInfo(renderer.paperRect, nil)
                    renderer.drawPage(at: pageIndex, in: renderer.paperRect)
                }
            }
            UIGraphicsEndPDFContext()

            do {
                try (data as Data).write(to: fileURL, options: .atomic)
            } catch {
                call.reject("The PDF could not be prepared.", nil, error)
                return
            }

            self.presentShareSheet(fileURL: fileURL, call: call)
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

    private func presentShareSheet(fileURL: URL, call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self, let presenter = self.bridge?.viewController else {
                try? FileManager.default.removeItem(at: fileURL)
                call.reject("The iOS share menu could not be opened.")
                return
            }

            if presenter.presentedViewController != nil {
                try? FileManager.default.removeItem(at: fileURL)
                call.reject("Close the current sheet before sharing.")
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

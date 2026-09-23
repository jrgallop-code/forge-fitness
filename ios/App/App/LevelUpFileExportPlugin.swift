import UIKit
import WebKit
import Capacitor

private final class LevelUpPDFPageRenderer: UIPrintPageRenderer {
    private let levelUpPaperRect = CGRect(x: 0, y: 0, width: 612, height: 792)
    override var paperRect: CGRect { levelUpPaperRect }
    override var printableRect: CGRect { levelUpPaperRect.insetBy(dx: 28, dy: 28) }
}

private final class LevelUpPDFWebJob: NSObject, WKNavigationDelegate {
    let id = UUID()
    private let html: String
    private let fileURL: URL
    private let webView: WKWebView
    private let completion: (Result<URL, Error>) -> Void
    private var finished = false

    init(html: String, fileURL: URL, completion: @escaping (Result<URL, Error>) -> Void) {
        self.html = html
        self.fileURL = fileURL
        self.completion = completion
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .nonPersistent()
        self.webView = WKWebView(frame: CGRect(x: -2200, y: 0, width: 612, height: 792), configuration: configuration)
        super.init()
        self.webView.navigationDelegate = self
        self.webView.isOpaque = false
        self.webView.backgroundColor = .white
        self.webView.scrollView.backgroundColor = .white
    }

    func start(in presenter: UIViewController) {
        presenter.view.addSubview(webView)
        let publicURL = Bundle.main.url(forResource: "public", withExtension: nil)
        webView.loadHTMLString(html, baseURL: publicURL)
        DispatchQueue.main.asyncAfter(deadline: .now() + 12) { [weak self] in
            guard let self, !self.finished else { return }
            self.finish(.failure(NSError(
                domain: "LevelUpPDF",
                code: 1,
                userInfo: [NSLocalizedDescriptionKey: "The PDF took too long to prepare."]
            )))
        }
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) { [weak self] in
            self?.renderPDF()
        }
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        finish(.failure(error))
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        finish(.failure(error))
    }

    private func renderPDF() {
        guard !finished else { return }

        let renderer = LevelUpPDFPageRenderer()
        let formatter = webView.viewPrintFormatter()
        renderer.addPrintFormatter(formatter, startingAtPageAt: 0)
        renderer.prepare(forDrawingPages: NSRange(location: 0, length: renderer.numberOfPages))

        let pageCount = renderer.numberOfPages
        guard pageCount > 0 && pageCount <= 40 else {
            finish(.failure(NSError(
                domain: "LevelUpPDF",
                code: 2,
                userInfo: [NSLocalizedDescriptionKey: "The PDF layout could not be prepared."]
            )))
            return
        }

        let data = NSMutableData()
        UIGraphicsBeginPDFContextToData(data, renderer.paperRect, [
            kCGPDFContextCreator as String: "Level Up",
            kCGPDFContextTitle as String: fileURL.lastPathComponent
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
            finish(.success(fileURL))
        } catch {
            finish(.failure(error))
        }
    }

    private func finish(_ result: Result<URL, Error>) {
        guard !finished else { return }
        finished = true
        webView.navigationDelegate = nil
        webView.stopLoading()
        webView.removeFromSuperview()
        completion(result)
    }
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
    private var pdfJobs: [UUID: LevelUpPDFWebJob] = [:]


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
            if presenter.presentedViewController != nil {
                call.reject("Close the current sheet before exporting the PDF.")
                return
            }

            var job: LevelUpPDFWebJob?
            job = LevelUpPDFWebJob(html: html, fileURL: fileURL) { [weak self] result in
                guard let self, let job else { return }
                self.pdfJobs.removeValue(forKey: job.id)
                switch result {
                case .success(let url):
                    self.presentShareSheet(fileURL: url, call: call)
                case .failure(let error):
                    try? FileManager.default.removeItem(at: fileURL)
                    call.reject("The PDF could not be prepared.", nil, error)
                }
            }
            guard let job else {
                call.reject("The PDF could not be prepared.")
                return
            }
            self.pdfJobs[job.id] = job
            job.start(in: presenter)
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

import UIKit
import SQLite3

final class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options: UIScene.ConnectionOptions) {
        guard let scene = scene as? UIWindowScene else { return }
        let window = UIWindow(windowScene: scene)
        window.rootViewController = RecoveryViewController()
        self.window = window
        window.makeKeyAndVisible()
    }
}

private final class RecoveryViewController: UIViewController {
    private let status = UILabel()
    private let export = UIButton(type: .system)
    private var exportURL: URL?

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        let title = UILabel()
        title.text = "Level Up Recovery"
        title.font = .preferredFont(forTextStyle: .title1)
        status.text = "Reading the on-device SQLite copy…"
        status.numberOfLines = 0
        status.font = .preferredFont(forTextStyle: .body)
        export.setTitle("Share recovery export", for: .normal)
        export.isEnabled = false
        export.addTarget(self, action: #selector(share), for: .touchUpInside)

        let stack = UIStackView(arrangedSubviews: [title, status, export])
        stack.axis = .vertical
        stack.spacing = 20
        stack.alignment = .leading
        stack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(stack)
        let safe = view.safeAreaLayoutGuide
        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: safe.topAnchor, constant: 32),
            stack.leadingAnchor.constraint(equalTo: safe.leadingAnchor, constant: 24),
            stack.trailingAnchor.constraint(equalTo: safe.trailingAnchor, constant: -24)
        ])

        DispatchQueue.global(qos: .userInitiated).async {
            let result = Result { try RecoveryReader.read() }
            DispatchQueue.main.async { [weak self] in
                guard let self = self else { return }
                switch result {
                case .success(let recovery):
                    self.status.text = recovery.summary
                    self.exportURL = recovery.url
                    self.export.isEnabled = true
                case .failure(let error):
                    self.status.text = error.localizedDescription
                }
            }
        }
    }

    @objc private func share() {
        guard let url = exportURL else { return }
        let sheet = UIActivityViewController(activityItems: [url], applicationActivities: nil)
        sheet.popoverPresentationController?.sourceView = export
        sheet.popoverPresentationController?.sourceRect = export.bounds
        present(sheet, animated: true)
    }
}

private enum RecoveryReader {
    static func read() throws -> (summary: String, url: URL) {
        let files = FileManager.default
        let source = try files.url(for: .applicationSupportDirectory, in: .userDomainMask,
                                   appropriateFor: nil, create: false)
            .appendingPathComponent("LevelUpData/level-up.sqlite3")
        guard files.fileExists(atPath: source.path) else {
            throw failure("No Level Up SQLite file was found on this device.")
        }

        let folder = files.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try files.createDirectory(at: folder, withIntermediateDirectories: true,
                                  attributes: [.protectionKey: FileProtectionType.complete])
        let copy = folder.appendingPathComponent("snapshot.sqlite3")
        defer {
            for suffix in ["", "-wal", "-shm"] {
                try? files.removeItem(atPath: copy.path + suffix)
            }
        }
        try files.copyItem(at: source, to: copy)
        let wal = source.path + "-wal"
        if files.fileExists(atPath: wal) {
            try files.copyItem(atPath: wal, toPath: copy.path + "-wal")
        }

        var db: OpaquePointer?
        defer { sqlite3_close(db) }
        guard sqlite3_open_v2(copy.path, &db, SQLITE_OPEN_READONLY, nil) == SQLITE_OK else {
            throw failure("The SQLite copy could not be opened.")
        }
        var query: OpaquePointer?
        defer { sqlite3_finalize(query) }
        let sql = "SELECT key, value FROM kv_store WHERE key IN ('forge_workout_sessions', 'forge_weight_entries', 'level_up_food_log_v1');"
        guard sqlite3_prepare_v2(db, sql, -1, &query, nil) == SQLITE_OK else {
            throw failure("The SQLite copy could not be read.")
        }

        var entries: [String: String] = [:]
        var step = sqlite3_step(query)
        while step == SQLITE_ROW {
            if let key = sqlite3_column_text(query, 0), let value = sqlite3_column_text(query, 1) {
                entries[String(cString: key)] = String(cString: value)
            }
            step = sqlite3_step(query)
        }
        guard step == SQLITE_DONE else { throw failure("Reading the SQLite copy was interrupted.") }

        let workouts = latestDate(entries["forge_workout_sessions"])
        let weights = latestDate(entries["forge_weight_entries"])
        let food = latestDate(entries["level_up_food_log_v1"])
        let summary = ["Latest workout: " + workouts, "Latest weigh-in: " + weights,
                       "Latest food log: " + food].joined(separator: "\n")
        let url = folder.appendingPathComponent("level-up-sqlite-recovery.json")
        let data = try JSONEncoder().encode(entries)
        try data.write(to: url, options: [.atomic, .completeFileProtection])
        return (summary, url)
    }

    private static func latestDate(_ value: String?) -> String {
        guard let data = value?.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) else { return "None found" }
        let candidates: [String]
        if let rows = json as? [[String: Any]] {
            candidates = rows.compactMap { $0["date"] as? String }
        } else if let days = json as? [String: Any] {
            candidates = Array(days.keys)
        } else {
            return "None found"
        }
        return candidates.filter {
            $0.range(of: #"^\d{4}-\d{2}-\d{2}$"#, options: .regularExpression) != nil
        }.max() ?? "None found"
    }

    private static func failure(_ message: String) -> NSError {
        NSError(domain: "LevelUpRecovery", code: 1, userInfo: [NSLocalizedDescriptionKey: message])
    }
}

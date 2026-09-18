import Capacitor
import SwiftUI

private let levelUpNavigationPages: Set<String> = [
    "home", "workout", "progress", "energy", "more"
]

final class LevelUpNavigationState: ObservableObject {
    @Published var selectedPage = "home"
    @Published var isVisible = false
}

@available(iOS 26.0, *)
private struct LevelUpLiquidGlassNavigation: View {
    @ObservedObject var state: LevelUpNavigationState
    let selectPage: (String) -> Void

    private let items: [(page: String, title: String, symbol: String)] = [
        ("home", "Dashboard", "square.grid.2x2.fill"),
        ("workout", "Workout", "dumbbell.fill"),
        ("progress", "Progress", "chart.line.uptrend.xyaxis"),
        ("energy", "Nutrition", "fork.knife"),
        ("more", "More", "ellipsis")
    ]

    var body: some View {
        HStack(spacing: 4) {
            ForEach(items, id: \.page) { item in
                navigationButton(item)
            }
        }
        .frame(maxWidth: 546)
        .padding(.horizontal, 21)
        .padding(.bottom, 7)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
        .opacity(state.isVisible ? 1 : 0)
        .allowsHitTesting(state.isVisible)
        .animation(.easeInOut(duration: 0.16), value: state.isVisible)
    }

    @ViewBuilder
    private func navigationButton(
        _ item: (page: String, title: String, symbol: String)
    ) -> some View {
        if state.selectedPage == item.page {
            buttonLabel(item)
                .buttonStyle(.glass)
                .foregroundStyle(Color(red: 1.0, green: 0.29, blue: 0.33))
        } else {
            buttonLabel(item)
                .buttonStyle(.plain)
                .foregroundStyle(Color(uiColor: .secondaryLabel))
        }
    }

    private func buttonLabel(
        _ item: (page: String, title: String, symbol: String)
    ) -> some View {
        Button {
            state.selectedPage = item.page
            selectPage(item.page)
        } label: {
            VStack(spacing: 3) {
                Image(systemName: item.symbol)
                    .font(.system(size: 19, weight: .semibold))
                Text(item.title)
                    .font(.system(size: 9.5, weight: .semibold))
                    .lineLimit(1)
                    .minimumScaleFactor(0.76)
            }
            .frame(maxWidth: .infinity, minHeight: 55)
            .contentShape(Rectangle())
        }
        .buttonBorderShape(.roundedRectangle(radius: 17))
        .accessibilityLabel(item.title)
    }
}

@objc(LevelUpNativeNavigationPlugin)
final class LevelUpNativeNavigationPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "LevelUpNativeNavigationPlugin"
    let jsName = "LevelUpNativeNavigation"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setActive", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setVisible", returnType: CAPPluginReturnPromise)
    ]

    @objc func isAvailable(_ call: CAPPluginCall) {
        if #available(iOS 26.0, *) {
            call.resolve(["available": true])
        } else {
            call.resolve(["available": false])
        }
    }

    @objc func setActive(_ call: CAPPluginCall) {
        guard
            let page = call.getString("page"),
            levelUpNavigationPages.contains(page)
        else {
            call.reject("Unknown navigation page.")
            return
        }

        DispatchQueue.main.async { [weak self] in
            (self?.bridge?.viewController as? LevelUpBridgeViewController)?
                .setNativeNavigationPage(page)
            call.resolve()
        }
    }

    @objc func setVisible(_ call: CAPPluginCall) {
        let visible = call.getBool("visible") ?? false
        DispatchQueue.main.async { [weak self] in
            (self?.bridge?.viewController as? LevelUpBridgeViewController)?
                .setNativeNavigationVisible(visible)
            call.resolve()
        }
    }
}

extension LevelUpBridgeViewController {
    @MainActor
    func installLiquidGlassNavigation() {
        guard #available(iOS 26.0, *), nativeNavigationHost == nil else {
            return
        }

        let root = LevelUpLiquidGlassNavigation(
            state: nativeNavigationState,
            selectPage: { [weak self] page in
                self?.selectWebNavigationPage(page)
            }
        )
        let host = UIHostingController(rootView: root)
        host.view.backgroundColor = .clear
        host.view.translatesAutoresizingMaskIntoConstraints = false
        addChild(host)
        view.addSubview(host.view)
        NSLayoutConstraint.activate([
            host.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            host.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            host.view.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            host.view.heightAnchor.constraint(equalToConstant: 106)
        ])
        host.didMove(toParent: self)
        nativeNavigationHost = host
    }

    @MainActor
    func setNativeNavigationPage(_ page: String) {
        guard levelUpNavigationPages.contains(page) else { return }
        nativeNavigationState.selectedPage = page
    }

    @MainActor
    func setNativeNavigationVisible(_ visible: Bool) {
        nativeNavigationState.isVisible = visible
    }

    @MainActor
    private func selectWebNavigationPage(_ page: String) {
        guard levelUpNavigationPages.contains(page) else { return }
        let script = "document.querySelector('.bottom-nav .nav-btn[data-page=\"\(page)\"]')?.click();"
        bridge?.webView?.evaluateJavaScript(script)
    }
}

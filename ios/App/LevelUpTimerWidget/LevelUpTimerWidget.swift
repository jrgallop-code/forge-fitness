import ActivityKit
import AppIntents
import WidgetKit
import SwiftUI

@main
struct LevelUpTimerWidgetBundle: WidgetBundle {
    var body: some Widget { LevelUpTimerLiveActivity() }
}

private struct TimerPalette {
    let background: Color
    let raised: Color
    let heading: Color
    let muted: Color
    let accent: Color
    let accentContrast: Color

    static func forTheme(_ theme: String) -> TimerPalette {
        switch theme {
        case "arctic":
            return .init(background: Color(red: 0.95, green: 0.97, blue: 0.99), raised: .white, heading: Color(red: 0.04, green: 0.09, blue: 0.17), muted: Color(red: 0.32, green: 0.38, blue: 0.48), accent: Color(red: 0.09, green: 0.41, blue: 0.88), accentContrast: .white)
        case "pure":
            return .init(background: Color(red: 0.96, green: 0.96, blue: 0.95), raised: .white, heading: Color(red: 0.05, green: 0.05, blue: 0.06), muted: Color(red: 0.38, green: 0.38, blue: 0.40), accent: Color(red: 0.09, green: 0.09, blue: 0.10), accentContrast: .white)
        case "ocean":
            return .init(background: Color(red: 0.93, green: 0.97, blue: 1.0), raised: .white, heading: Color(red: 0.03, green: 0.14, blue: 0.25), muted: Color(red: 0.31, green: 0.42, blue: 0.51), accent: Color(red: 0.03, green: 0.60, blue: 0.85), accentContrast: Color(red: 0.03, green: 0.14, blue: 0.25))
        case "midnight":
            return .init(background: Color(red: 0.02, green: 0.04, blue: 0.09), raised: Color(red: 0.07, green: 0.13, blue: 0.22), heading: .white, muted: Color(red: 0.57, green: 0.64, blue: 0.74), accent: Color(red: 0.20, green: 0.47, blue: 0.96), accentContrast: Color(red: 0.02, green: 0.04, blue: 0.09))
        case "slate":
            return .init(background: Color(red: 0.05, green: 0.07, blue: 0.09), raised: Color(red: 0.11, green: 0.15, blue: 0.19), heading: .white, muted: Color(red: 0.60, green: 0.66, blue: 0.71), accent: Color(red: 0.45, green: 0.59, blue: 0.72), accentContrast: Color(red: 0.03, green: 0.06, blue: 0.09))
        case "pulse":
            return .init(background: Color(red: 0.07, green: 0.04, blue: 0.07), raised: Color(red: 0.18, green: 0.08, blue: 0.17), heading: .white, muted: Color(red: 0.72, green: 0.57, blue: 0.67), accent: Color(red: 1.0, green: 0.18, blue: 0.58), accentContrast: Color(red: 0.09, green: 0.04, blue: 0.07))
        default:
            return .init(background: Color(red: 0.04, green: 0.04, blue: 0.05), raised: Color(red: 0.11, green: 0.11, blue: 0.13), heading: .white, muted: Color(red: 0.61, green: 0.61, blue: 0.65), accent: Color(red: 0.94, green: 0.08, blue: 0.12), accentContrast: .white)
        }
    }
}

private struct LevelUpArrow: Shape {
    func path(in rect: CGRect) -> Path {
        let w = rect.width
        let h = rect.height
        let mid = w / 2
        let headHalf = w * 0.23
        let shaftHalf = w * 0.075
        let headY = h * 0.34
        let bottomY = h * 0.82
        var path = Path()
        path.move(to: CGPoint(x: mid, y: h * 0.06))
        path.addLine(to: CGPoint(x: mid + headHalf, y: headY))
        path.addLine(to: CGPoint(x: mid + shaftHalf, y: headY))
        path.addLine(to: CGPoint(x: mid + shaftHalf, y: bottomY))
        path.addLine(to: CGPoint(x: mid - shaftHalf, y: bottomY))
        path.addLine(to: CGPoint(x: mid - shaftHalf, y: headY))
        path.addLine(to: CGPoint(x: mid - headHalf, y: headY))
        path.closeSubpath()
        return path
    }
}

private struct LevelUpThemeLogo: View {
    let theme: String
    let size: CGFloat
    let cornerRadius: CGFloat

    var body: some View {
        let palette = TimerPalette.forTheme(theme)
        ZStack {
            RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                .fill(palette.raised)
            Capsule()
                .fill(palette.accent)
                .frame(width: size * 0.58, height: max(2, size * 0.09))
                .offset(y: size * 0.20)
            RoundedRectangle(cornerRadius: size * 0.035, style: .continuous)
                .fill(palette.accent)
                .frame(width: size * 0.10, height: size * 0.30)
                .offset(x: -size * 0.25, y: size * 0.20)
            RoundedRectangle(cornerRadius: size * 0.035, style: .continuous)
                .fill(palette.accent)
                .frame(width: size * 0.10, height: size * 0.30)
                .offset(x: size * 0.25, y: size * 0.20)
            LevelUpArrow()
                .fill(palette.accent)
                .frame(width: size * 0.44, height: size * 0.58)
                .offset(y: -size * 0.08)
        }
        .frame(width: size, height: size)
        .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
        .accessibilityHidden(true)
    }
}

@available(iOS 17.0, *)
struct DismissLevelUpTimerIntent: AppIntent {
    static var title: LocalizedStringResource = "Dismiss Level Up timer"
    static var openAppWhenRun = false
    @Parameter(title: "Timer ID") var timerID: String

    init() {}
    init(timerID: String) { self.timerID = timerID }

    func perform() async throws -> some IntentResult {
        for activity in Activity<LevelUpTimerAttributes>.activities where activity.attributes.timerID == timerID {
            await activity.end(nil, dismissalPolicy: .immediate)
        }
        return .result()
    }
}

struct LevelUpTimerLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: LevelUpTimerAttributes.self) { context in
            let palette = TimerPalette.forTheme(context.attributes.theme)
            HStack(spacing: 12) {
                RoundedRectangle(cornerRadius: 3).fill(palette.accent).frame(width: 5)
                timerLogo(theme: context.attributes.theme, size: 38, cornerRadius: 11)
                VStack(alignment: .leading, spacing: 2) {
                    Text(context.attributes.kind == "cardio" ? "CARDIO TIMER" : "REST TIMER")
                        .font(.caption2.weight(.heavy)).tracking(1.1).foregroundStyle(palette.accent)
                    Text(context.attributes.detail)
                        .font(.subheadline.weight(.semibold)).foregroundStyle(palette.heading).lineLimit(1)
                }
                Spacer(minLength: 6)
                VStack(alignment: .trailing, spacing: 5) {
                    Text(timerInterval: context.state.startedAt...context.state.endAt, countsDown: true)
                        .font(.title3.monospacedDigit().weight(.heavy)).foregroundStyle(palette.accent)
                    dismissControl(context: context, palette: palette)
                }
            }
            .padding(.vertical, 12).padding(.horizontal, 13)
            .activityBackgroundTint(palette.background)
            .activitySystemActionForegroundColor(palette.heading)
        } dynamicIsland: { context in
            let palette = TimerPalette.forTheme(context.attributes.theme)
            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 6) {
                        timerLogo(theme: context.attributes.theme, size: 24, cornerRadius: 7)
                        Text("Level Up").font(.caption.weight(.semibold)).foregroundStyle(palette.accent)
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(timerInterval: context.state.startedAt...context.state.endAt, countsDown: true)
                        .monospacedDigit().fontWeight(.bold).foregroundStyle(palette.accent)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(context.attributes.kind == "cardio" ? "CARDIO TIMER" : "REST TIMER")
                                .font(.caption2.weight(.heavy)).foregroundStyle(palette.accent)
                            Text(context.attributes.detail).font(.caption).foregroundStyle(palette.muted).lineLimit(1)
                        }
                        Spacer()
                        dismissControl(context: context, palette: palette)
                    }
                }
            } compactLeading: {
                timerLogo(theme: context.attributes.theme, size: 20, cornerRadius: 6)
            } compactTrailing: {
                Text(timerInterval: context.state.startedAt...context.state.endAt, countsDown: true).monospacedDigit().foregroundStyle(palette.accent).frame(width: 42)
            } minimal: {
                timerLogo(theme: context.attributes.theme, size: 20, cornerRadius: 6)
            }
            .keylineTint(palette.accent)
        }
    }

    private func timerLogo(theme: String, size: CGFloat, cornerRadius: CGFloat) -> some View {
        LevelUpThemeLogo(theme: theme, size: size, cornerRadius: cornerRadius)
    }

    @ViewBuilder
    private func dismissControl(context: ActivityViewContext<LevelUpTimerAttributes>, palette: TimerPalette) -> some View {
        if #available(iOS 17.0, *) {
            Button(intent: DismissLevelUpTimerIntent(timerID: context.attributes.timerID)) {
                Image(systemName: "xmark").font(.caption.weight(.bold)).frame(width: 24, height: 24)
            }
            .buttonStyle(.plain).foregroundStyle(palette.heading).background(palette.raised, in: Circle())
            .accessibilityLabel("Dismiss timer")
        } else {
            Link(destination: dismissURL(context.attributes.timerID)) {
                Image(systemName: "xmark").font(.caption.weight(.bold)).foregroundStyle(palette.heading)
                    .frame(width: 24, height: 24).background(palette.raised, in: Circle())
            }
            .accessibilityLabel("Dismiss timer")
        }
    }

    private func dismissURL(_ timerID: String) -> URL {
        var components = URLComponents()
        components.scheme = "leveluphypertrophy"
        components.host = "timer"
        components.path = "/dismiss"
        components.queryItems = [URLQueryItem(name: "key", value: timerID)]
        return components.url ?? URL(string: "leveluphypertrophy://timer/dismiss")!
    }
}

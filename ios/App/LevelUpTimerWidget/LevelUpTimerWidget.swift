import ActivityKit
import WidgetKit
import SwiftUI

@main
struct LevelUpTimerWidgetBundle: WidgetBundle {
    var body: some Widget { LevelUpTimerLiveActivity() }
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

    var body: some View {
        let accent = timerAccent(for: theme)
        ZStack {
            RoundedRectangle(cornerRadius: size * 0.24, style: .continuous)
                .fill(timerLogoSurface(for: theme))
            Capsule()
                .fill(accent)
                .frame(width: size * 0.58, height: max(2, size * 0.09))
                .offset(y: size * 0.20)
            RoundedRectangle(cornerRadius: size * 0.035, style: .continuous)
                .fill(accent)
                .frame(width: size * 0.10, height: size * 0.30)
                .offset(x: -size * 0.25, y: size * 0.20)
            RoundedRectangle(cornerRadius: size * 0.035, style: .continuous)
                .fill(accent)
                .frame(width: size * 0.10, height: size * 0.30)
                .offset(x: size * 0.25, y: size * 0.20)
            LevelUpArrow()
                .fill(accent)
                .frame(width: size * 0.44, height: size * 0.58)
                .offset(y: -size * 0.08)
        }
        .frame(width: size, height: size)
        .accessibilityHidden(true)
    }
}

private func timerAccent(for theme: String) -> Color {
    switch theme {
    case "level-up": return Color(red: 0.94, green: 0.20, blue: 0.28)
    case "arctic": return Color(red: 0.12, green: 0.43, blue: 0.86)
    case "pure": return Color(red: 0.12, green: 0.13, blue: 0.15)
    case "ocean": return Color(red: 0.08, green: 0.58, blue: 0.78)
    case "midnight": return Color(red: 0.39, green: 0.56, blue: 1.0)
    case "slate": return Color(red: 0.48, green: 0.60, blue: 0.74)
    case "pulse": return Color(red: 0.94, green: 0.31, blue: 0.66)
    default: return Color(red: 0.94, green: 0.20, blue: 0.28)
    }
}

private func timerLogoSurface(for theme: String) -> Color {
    switch theme {
    case "arctic", "pure", "ocean": return Color.black.opacity(0.06)
    default: return Color.white.opacity(0.10)
    }
}

private func timerBackground(for theme: String) -> Color {
    switch theme {
    case "arctic", "pure", "ocean": return Color(red: 0.94, green: 0.97, blue: 1.0)
    case "pulse": return Color(red: 0.10, green: 0.05, blue: 0.10)
    case "midnight": return Color(red: 0.03, green: 0.05, blue: 0.10)
    case "slate": return Color(red: 0.08, green: 0.10, blue: 0.13)
    default: return Color(red: 0.04, green: 0.06, blue: 0.10)
    }
}

private func timerForeground(for theme: String) -> Color {
    ["arctic", "pure", "ocean"].contains(theme) ? .primary : .white
}

struct LevelUpTimerLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: LevelUpTimerAttributes.self) { context in
            HStack(spacing: 14) {
                LevelUpThemeLogo(theme: context.attributes.theme, size: 42)
                VStack(alignment: .leading, spacing: 3) {
                    Text(context.attributes.title)
                        .font(.headline)
                        .foregroundStyle(timerForeground(for: context.attributes.theme))
                        .lineLimit(1)
                    Text(context.attributes.detail)
                        .font(.caption)
                        .foregroundStyle(timerForeground(for: context.attributes.theme).opacity(0.72))
                        .lineLimit(1)
                }
                Spacer(minLength: 8)
                Text(timerInterval: context.state.startedAt...context.state.endAt, countsDown: true)
                    .font(.title3.monospacedDigit().weight(.bold))
                    .foregroundStyle(timerAccent(for: context.attributes.theme))
            }
            .padding(.horizontal, 16)
            .activityBackgroundTint(timerBackground(for: context.attributes.theme))
            .activitySystemActionForegroundColor(timerForeground(for: context.attributes.theme))
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 6) {
                        LevelUpThemeLogo(theme: context.attributes.theme, size: 24)
                        Text("Level Up").font(.caption.weight(.semibold))
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(timerInterval: context.state.startedAt...context.state.endAt, countsDown: true)
                        .monospacedDigit()
                        .fontWeight(.bold)
                        .foregroundStyle(timerAccent(for: context.attributes.theme))
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(context.attributes.title).font(.headline)
                        Text(context.attributes.detail).font(.caption).foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            } compactLeading: {
                LevelUpThemeLogo(theme: context.attributes.theme, size: 20)
            } compactTrailing: {
                Text(timerInterval: context.state.startedAt...context.state.endAt, countsDown: true)
                    .monospacedDigit()
                    .frame(width: 42)
                    .foregroundStyle(timerAccent(for: context.attributes.theme))
            } minimal: {
                LevelUpThemeLogo(theme: context.attributes.theme, size: 18)
            }
        }
    }
}

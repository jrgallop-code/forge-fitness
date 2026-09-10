import ActivityKit
import AppIntents
import WidgetKit
import SwiftUI
import UIKit

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

private enum TimerLogoRenderer {
    private static let cache = NSCache<NSString, UIImage>()
    private static let defaultAssetName = "TimerLogoLevelUp"

    static func image(named requestedName: String) -> UIImage? {
        let cacheKey = requestedName as NSString
        if let cached = cache.object(forKey: cacheKey) { return cached }

        let candidates = requestedName == defaultAssetName
            ? [defaultAssetName]
            : [requestedName, defaultAssetName]

        for name in candidates {
            guard let source = UIImage(named: name) else { continue }
            guard let transparent = removeBackground(from: source) else { continue }
            cache.setObject(transparent, forKey: cacheKey)
            return transparent
        }
        return nil
    }

    // Home-screen app icons are intentionally opaque. For the Live Activity,
    // estimate the icon's background from its four corners, then convert that
    // background to alpha while preserving the exact selected logo artwork.
    private static func removeBackground(from source: UIImage) -> UIImage? {
        let targetSize = CGSize(width: 128, height: 128)
        let format = UIGraphicsImageRendererFormat.default()
        format.scale = 1
        format.opaque = false
        let resized = UIGraphicsImageRenderer(size: targetSize, format: format).image { _ in
            source.draw(in: CGRect(origin: .zero, size: targetSize))
        }
        guard let cgImage = resized.cgImage else { return nil }

        let width = cgImage.width
        let height = cgImage.height
        let bytesPerPixel = 4
        let bytesPerRow = width * bytesPerPixel
        var pixels = [UInt8](repeating: 0, count: height * bytesPerRow)
        let colorSpace = CGColorSpaceCreateDeviceRGB()
        let bitmapInfo = CGBitmapInfo.byteOrder32Big.rawValue | CGImageAlphaInfo.premultipliedLast.rawValue

        return pixels.withUnsafeMutableBytes { rawBuffer -> UIImage? in
            guard let baseAddress = rawBuffer.baseAddress,
                  let context = CGContext(
                    data: baseAddress,
                    width: width,
                    height: height,
                    bitsPerComponent: 8,
                    bytesPerRow: bytesPerRow,
                    space: colorSpace,
                    bitmapInfo: bitmapInfo
                  ) else { return nil }

            context.interpolationQuality = .high
            context.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))
            let bytes = rawBuffer.bindMemory(to: UInt8.self)

            func rgb(_ x: Int, _ y: Int) -> (Double, Double, Double) {
                let index = y * bytesPerRow + x * bytesPerPixel
                return (Double(bytes[index]), Double(bytes[index + 1]), Double(bytes[index + 2]))
            }

            let topLeft = rgb(0, 0)
            let topRight = rgb(width - 1, 0)
            let bottomLeft = rgb(0, height - 1)
            let bottomRight = rgb(width - 1, height - 1)
            let lowThreshold = 10.0
            let highThreshold = 54.0

            func interpolate(_ a: Double, _ b: Double, _ amount: Double) -> Double {
                a + (b - a) * amount
            }

            for y in 0..<height {
                let fy = height > 1 ? Double(y) / Double(height - 1) : 0
                for x in 0..<width {
                    let fx = width > 1 ? Double(x) / Double(width - 1) : 0
                    let index = y * bytesPerRow + x * bytesPerPixel

                    let expectedTopR = interpolate(topLeft.0, topRight.0, fx)
                    let expectedTopG = interpolate(topLeft.1, topRight.1, fx)
                    let expectedTopB = interpolate(topLeft.2, topRight.2, fx)
                    let expectedBottomR = interpolate(bottomLeft.0, bottomRight.0, fx)
                    let expectedBottomG = interpolate(bottomLeft.1, bottomRight.1, fx)
                    let expectedBottomB = interpolate(bottomLeft.2, bottomRight.2, fx)
                    let expectedR = interpolate(expectedTopR, expectedBottomR, fy)
                    let expectedG = interpolate(expectedTopG, expectedBottomG, fy)
                    let expectedB = interpolate(expectedTopB, expectedBottomB, fy)

                    let dr = Double(bytes[index]) - expectedR
                    let dg = Double(bytes[index + 1]) - expectedG
                    let db = Double(bytes[index + 2]) - expectedB
                    let distance = sqrt((dr * dr + dg * dg + db * db) / 3.0)

                    let opacity: Double
                    if distance <= lowThreshold { opacity = 0 }
                    else if distance >= highThreshold { opacity = 1 }
                    else { opacity = (distance - lowThreshold) / (highThreshold - lowThreshold) }

                    if opacity < 1 {
                        bytes[index] = UInt8((Double(bytes[index]) * opacity).rounded())
                        bytes[index + 1] = UInt8((Double(bytes[index + 1]) * opacity).rounded())
                        bytes[index + 2] = UInt8((Double(bytes[index + 2]) * opacity).rounded())
                        bytes[index + 3] = UInt8((Double(bytes[index + 3]) * opacity).rounded())
                    }
                }
            }

            guard let output = context.makeImage() else { return nil }
            return UIImage(cgImage: output, scale: 1, orientation: .up)
        }
    }
}

struct LevelUpTimerLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: LevelUpTimerAttributes.self) { context in
            let palette = TimerPalette.forTheme(context.attributes.theme)
            VStack(spacing: 8) {
                HStack(spacing: 9) {
                    RoundedRectangle(cornerRadius: 3).fill(palette.accent).frame(width: 4)
                    timerLogo(icon: context.attributes.icon, size: 34)
                    VStack(alignment: .leading, spacing: 1) {
                        Text(activityHeading(context))
                            .font(.caption2.weight(.heavy)).tracking(.8).foregroundStyle(palette.accent).lineLimit(1)
                        Text(activityTitle(context))
                            .font(.subheadline.weight(.bold)).foregroundStyle(palette.heading).lineLimit(1)
                        if context.attributes.kind == "rest" {
                            Text(activityDetails(context))
                                .font(.caption2.weight(.medium)).foregroundStyle(palette.muted).lineLimit(1)
                        }
                    }
                    Spacer(minLength: 4)
                    timerText(context: context, palette: palette, font: .title2)
                }
                if context.attributes.kind == "rest" {
                    restControls(context: context, palette: palette)
                } else {
                    HStack {
                        Spacer()
                        dismissControl(context: context, palette: palette)
                    }
                }
            }
            .padding(.vertical, 10).padding(.horizontal, 13)
            .activityBackgroundTint(palette.background)
            .activitySystemActionForegroundColor(palette.heading)
        } dynamicIsland: { context in
            let palette = TimerPalette.forTheme(context.attributes.theme)
            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 6) {
                        timerLogo(icon: context.attributes.icon, size: 24)
                        Text("Level Up").font(.caption.weight(.semibold)).foregroundStyle(palette.accent)
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    timerText(context: context, palette: palette, font: .headline)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(spacing: 7) {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(activityHeading(context)).font(.caption2.weight(.heavy)).foregroundStyle(palette.accent).lineLimit(1)
                                Text(activityTitle(context)).font(.caption.weight(.semibold)).foregroundStyle(palette.heading).lineLimit(1)
                                if context.attributes.kind == "rest" {
                                    Text(activityDetails(context)).font(.caption2).foregroundStyle(palette.muted).lineLimit(1)
                                }
                            }
                            Spacer()
                            if context.attributes.kind != "rest" { dismissControl(context: context, palette: palette) }
                        }
                        if context.attributes.kind == "rest" { restControls(context: context, palette: palette) }
                    }
                }
            } compactLeading: {
                timerLogo(icon: context.attributes.icon, size: 20)
            } compactTrailing: {
                timerText(context: context, palette: palette, font: .caption).frame(width: 46)
            } minimal: {
                timerLogo(icon: context.attributes.icon, size: 20)
            }
            .keylineTint(palette.accent)
        }
    }

    private func activityHeading(_ context: ActivityViewContext<LevelUpTimerAttributes>) -> String {
        if context.attributes.kind == "cardio" { return "CARDIO TIMER" }
        let workout = context.attributes.workoutName.trimmingCharacters(in: .whitespacesAndNewlines)
        return workout.isEmpty || workout == "Workout" ? "REST TIMER" : "REST TIMER · \(workout.uppercased())"
    }

    private func activityTitle(_ context: ActivityViewContext<LevelUpTimerAttributes>) -> String {
        let exercise = context.attributes.exerciseName.trimmingCharacters(in: .whitespacesAndNewlines)
        if context.attributes.kind != "rest" { return exercise.isEmpty ? context.attributes.detail : exercise }
        let name = exercise.isEmpty ? context.attributes.detail : exercise
        return context.attributes.setNumber > 0 ? "Next: \(name) · Set \(context.attributes.setNumber)" : name
    }

    private func activityDetails(_ context: ActivityViewContext<LevelUpTimerAttributes>) -> String {
        var parts: [String] = []
        let target = context.attributes.targetReps.trimmingCharacters(in: .whitespacesAndNewlines)
        let previous = context.attributes.previousPerformance.trimmingCharacters(in: .whitespacesAndNewlines)
        if !target.isEmpty { parts.append("Target \(target) reps") }
        if !previous.isEmpty { parts.append("Previous \(previous)") }
        return parts.isEmpty ? "Next working set" : parts.joined(separator: "  ·  ")
    }

    @ViewBuilder
    private func timerText(context: ActivityViewContext<LevelUpTimerAttributes>, palette: TimerPalette, font: Font) -> some View {
        if context.state.status == "paused" {
            Text(formatDuration(context.state.remainingSeconds))
                .font(font).monospacedDigit().fontWeight(.heavy).foregroundStyle(palette.accent)
        } else {
            Text(timerInterval: context.state.startedAt...context.state.endAt, countsDown: true)
                .font(font).monospacedDigit().fontWeight(.heavy).foregroundStyle(palette.accent)
        }
    }

    private func formatDuration(_ seconds: Int) -> String {
        let safe = max(0, seconds)
        return "\(safe / 60):\(String(format: "%02d", safe % 60))"
    }

    @ViewBuilder
    private func restControls(context: ActivityViewContext<LevelUpTimerAttributes>, palette: TimerPalette) -> some View {
        if #available(iOS 17.0, *) {
            HStack(spacing: 7) {
                timerButton("−15", intent: AdjustLevelUpTimerIntent(timerID: context.attributes.timerID, seconds: -15), palette: palette)
                timerButton(context.state.status == "paused" ? "Resume" : "Pause", intent: ToggleLevelUpTimerIntent(timerID: context.attributes.timerID), palette: palette, emphasized: true)
                timerButton("+15", intent: AdjustLevelUpTimerIntent(timerID: context.attributes.timerID, seconds: 15), palette: palette)
                timerButton("Skip", intent: SkipLevelUpTimerIntent(timerID: context.attributes.timerID), palette: palette)
            }
        } else {
            Link(destination: timerURL(context.attributes.timerID)) {
                Text("Open Level Up for timer controls").font(.caption.weight(.semibold)).frame(maxWidth: .infinity)
            }
            .foregroundStyle(palette.accent)
        }
    }

    @available(iOS 17.0, *)
    private func timerButton<I: AppIntent>(_ title: String, intent: I, palette: TimerPalette, emphasized: Bool = false) -> some View {
        Button(intent: intent) {
            Text(title).font(.caption2.weight(.bold)).lineLimit(1).frame(maxWidth: .infinity, minHeight: 27)
        }
        .buttonStyle(.plain)
        .foregroundStyle(emphasized ? palette.accentContrast : palette.heading)
        .background(emphasized ? palette.accent : palette.raised, in: RoundedRectangle(cornerRadius: 8))
    }

    private func timerLogoName(for icon: String) -> String {
        switch icon {
        case "arctic": return "TimerLogoArctic"
        case "pure": return "TimerLogoPure"
        case "ocean": return "TimerLogoOcean"
        case "midnight": return "TimerLogoMidnight"
        case "slate": return "TimerLogoSlate"
        case "pulse": return "TimerLogoPulse"
        default: return "TimerLogoLevelUp"
        }
    }

    @ViewBuilder
    private func timerLogo(icon: String, size: CGFloat) -> some View {
        if let image = TimerLogoRenderer.image(named: timerLogoName(for: icon)) {
            Image(uiImage: image)
                .renderingMode(.original)
                .resizable()
                .interpolation(.high)
                .antialiased(true)
                .scaledToFit()
                .frame(width: size, height: size)
                .accessibilityHidden(true)
        }
    }

    @ViewBuilder
    private func dismissControl(context: ActivityViewContext<LevelUpTimerAttributes>, palette: TimerPalette) -> some View {
        if #available(iOS 17.0, *) {
            Button(intent: SkipLevelUpTimerIntent(timerID: context.attributes.timerID)) {
                Image(systemName: "xmark").font(.caption.weight(.bold)).frame(width: 24, height: 24)
            }
            .buttonStyle(.plain).foregroundStyle(palette.heading).background(palette.raised, in: Circle())
            .accessibilityLabel("Dismiss timer")
        } else {
            Link(destination: timerURL(context.attributes.timerID)) {
                Image(systemName: "xmark").font(.caption.weight(.bold)).foregroundStyle(palette.heading)
                    .frame(width: 24, height: 24).background(palette.raised, in: Circle())
            }
            .accessibilityLabel("Dismiss timer")
        }
    }

    private func timerURL(_ timerID: String) -> URL {
        var components = URLComponents()
        components.scheme = "leveluphypertrophy"
        components.host = "timer"
        components.path = "/dismiss"
        components.queryItems = [URLQueryItem(name: "key", value: timerID)]
        return components.url ?? URL(string: "leveluphypertrophy://timer/dismiss")!
    }
}

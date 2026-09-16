import WidgetKit
import SwiftUI

private let dashboardKind = "LevelUpDashboardWidget"

private struct DashboardSnapshot: Codable {
    var updatedAt = ""
    var theme = "level-up"
    var enabled = true
    var caloriesConsumed = 0
    var calorieTarget = 0
    var proteinConsumed = 0
    var proteinTarget = 0
    var nextWorkout = "Open Level Up to sync"
    var nextWorkoutDate = ""
    var completedThisWeek = 0
}

private struct DashboardEntry: TimelineEntry {
    let date: Date
    let snapshot: DashboardSnapshot
}

private struct DashboardProvider: TimelineProvider {
    func placeholder(in context: Context) -> DashboardEntry {
        DashboardEntry(date: .now, snapshot: .init(caloriesConsumed: 1840, calorieTarget: 2725, proteinConsumed: 132, proteinTarget: 180, nextWorkout: "Upper A", nextWorkoutDate: "Today", completedThisWeek: 3))
    }

    func getSnapshot(in context: Context, completion: @escaping (DashboardEntry) -> Void) { completion(entry()) }
    func getTimeline(in context: Context, completion: @escaping (Timeline<DashboardEntry>) -> Void) {
        completion(Timeline(entries: [entry()], policy: .after(Calendar.current.date(byAdding: .minute, value: 5, to: .now) ?? .now.addingTimeInterval(300))))
    }

    private func entry() -> DashboardEntry {
        guard let defaults = UserDefaults(suiteName: "group.com.leveluphypertrophy.app.widgets"),
              let text = defaults.string(forKey: "dashboardSnapshot"),
              let data = text.data(using: .utf8),
              let snapshot = try? JSONDecoder().decode(DashboardSnapshot.self, from: data) else {
            return DashboardEntry(date: .now, snapshot: DashboardSnapshot())
        }
        return DashboardEntry(date: .now, snapshot: snapshot)
    }
}

private struct ProgressBar: View {
    let value: Int
    let target: Int
    let palette: TimerPalette
    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                Capsule().fill(palette.heading.opacity(0.12))
                Capsule().fill(palette.accent).frame(width: geometry.size.width * min(1, max(0, target > 0 ? CGFloat(value) / CGFloat(target) : 0)))
            }
        }.frame(height: 6)
    }
}

private struct DashboardWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: DashboardEntry
    private var palette: TimerPalette { TimerPalette.forTheme(entry.snapshot.theme) }

    var body: some View {
        Group {
            if family == .systemSmall { small } else { medium }
        }
        .widgetURL(URL(string: "leveluphypertrophy://dashboard"))
        .modifier(WidgetBackground(color: palette.background))
    }

    private var small: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack { Text("LEVEL UP").font(.caption2.weight(.black)).tracking(1).foregroundStyle(palette.accent); Spacer(); Image(systemName: "bolt.fill").font(.caption).foregroundStyle(palette.accent) }
            if entry.snapshot.enabled && entry.snapshot.calorieTarget > 0 {
                Text("\(entry.snapshot.caloriesConsumed)").font(.system(size: 30, weight: .black, design: .rounded)).foregroundStyle(palette.heading).minimumScaleFactor(0.7)
                Text("of \(entry.snapshot.calorieTarget) cal").font(.caption.weight(.semibold)).foregroundStyle(palette.muted)
                ProgressBar(value: entry.snapshot.caloriesConsumed, target: entry.snapshot.calorieTarget, palette: palette)
            } else {
                Text("\(entry.snapshot.completedThisWeek)").font(.system(size: 30, weight: .black, design: .rounded)).foregroundStyle(palette.heading)
                Text("workouts this week").font(.caption.weight(.semibold)).foregroundStyle(palette.muted)
            }
            Spacer(minLength: 0)
            Text(entry.snapshot.nextWorkoutDate.isEmpty ? entry.snapshot.nextWorkout : "\(entry.snapshot.nextWorkoutDate) · \(entry.snapshot.nextWorkout)").font(.caption2.weight(.bold)).foregroundStyle(palette.heading).lineLimit(1)
        }.padding(15)
    }

    private var medium: some View {
        HStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 7) {
                Text("TODAY").font(.caption2.weight(.black)).tracking(1).foregroundStyle(palette.accent)
                if entry.snapshot.enabled && entry.snapshot.calorieTarget > 0 {
                    Text("\(entry.snapshot.caloriesConsumed) / \(entry.snapshot.calorieTarget)").font(.title2.weight(.black)).foregroundStyle(palette.heading).minimumScaleFactor(0.7).lineLimit(1)
                    Text("calories").font(.caption.weight(.semibold)).foregroundStyle(palette.muted)
                    ProgressBar(value: entry.snapshot.caloriesConsumed, target: entry.snapshot.calorieTarget, palette: palette)
                    Text("Protein  \(entry.snapshot.proteinConsumed) / \(entry.snapshot.proteinTarget) g").font(.caption2.weight(.bold)).foregroundStyle(palette.heading)
                } else {
                    Text("\(entry.snapshot.completedThisWeek) workouts").font(.title2.weight(.black)).foregroundStyle(palette.heading)
                    Text("completed this week").font(.caption.weight(.semibold)).foregroundStyle(palette.muted)
                }
            }.frame(maxWidth: .infinity, alignment: .leading)
            Divider().overlay(palette.heading.opacity(0.12))
            VStack(alignment: .leading, spacing: 6) {
                Image(systemName: "dumbbell.fill").foregroundStyle(palette.accent)
                Text(entry.snapshot.nextWorkoutDate.isEmpty ? "NEXT WORKOUT" : entry.snapshot.nextWorkoutDate.uppercased()).font(.caption2.weight(.black)).foregroundStyle(palette.muted)
                Text(entry.snapshot.nextWorkout).font(.headline.weight(.bold)).foregroundStyle(palette.heading).lineLimit(2)
                Spacer(minLength: 0)
                Text("\(entry.snapshot.completedThisWeek) this week").font(.caption2.weight(.semibold)).foregroundStyle(palette.muted)
            }.frame(maxWidth: .infinity, alignment: .leading)
        }.padding(16)
    }
}

private struct WidgetBackground: ViewModifier {
    let color: Color
    func body(content: Content) -> some View {
        if #available(iOSApplicationExtension 17.0, *) { content.containerBackground(color, for: .widget) }
        else { content.background(color) }
    }
}

struct LevelUpDashboardWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: dashboardKind, provider: DashboardProvider()) { DashboardWidgetView(entry: $0) }
            .configurationDisplayName("Level Up Dashboard")
            .description("Today’s nutrition and your next workout at a glance.")
            .supportedFamilies([.systemSmall, .systemMedium])
    }
}

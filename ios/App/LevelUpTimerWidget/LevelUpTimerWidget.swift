import ActivityKit
import WidgetKit
import SwiftUI

@main
struct LevelUpTimerWidgetBundle: WidgetBundle {
    var body: some Widget { LevelUpTimerLiveActivity() }
}

struct LevelUpTimerLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: LevelUpTimerAttributes.self) { context in
            HStack(spacing: 14) {
                Image(systemName: context.attributes.kind == "cardio" ? "figure.run" : "dumbbell.fill")
                    .font(.title2.weight(.bold))
                    .foregroundStyle(Color(red: 0.33, green: 0.72, blue: 1.0))
                    .frame(width: 42, height: 42)
                    .background(Color(red: 0.05, green: 0.13, blue: 0.25), in: RoundedRectangle(cornerRadius: 12))
                VStack(alignment: .leading, spacing: 3) {
                    Text(context.attributes.title).font(.headline).lineLimit(1)
                    Text(context.attributes.detail).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                }
                Spacer(minLength: 8)
                Text(timerInterval: context.state.startedAt...context.state.endAt, countsDown: true)
                    .font(.title3.monospacedDigit().weight(.bold))
                    .foregroundStyle(Color(red: 0.12, green: 0.43, blue: 0.86))
            }
            .padding(.horizontal, 16)
            .activityBackgroundTint(Color(red: 0.94, green: 0.97, blue: 1.0))
            .activitySystemActionForegroundColor(.primary)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Label("Level Up", systemImage: context.attributes.kind == "cardio" ? "figure.run" : "dumbbell.fill")
                        .font(.caption.weight(.semibold))
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(timerInterval: context.state.startedAt...context.state.endAt, countsDown: true).monospacedDigit().fontWeight(.bold)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(context.attributes.title).font(.headline)
                        Text(context.attributes.detail).font(.caption).foregroundStyle(.secondary)
                    }.frame(maxWidth: .infinity, alignment: .leading)
                }
            } compactLeading: {
                Image(systemName: context.attributes.kind == "cardio" ? "figure.run" : "dumbbell.fill")
                    .foregroundStyle(Color(red: 0.33, green: 0.72, blue: 1.0))
            } compactTrailing: {
                Text(timerInterval: context.state.startedAt...context.state.endAt, countsDown: true).monospacedDigit().frame(width: 42)
            } minimal: {
                Image(systemName: "timer").foregroundStyle(Color(red: 0.33, green: 0.72, blue: 1.0))
            }
        }
    }
}

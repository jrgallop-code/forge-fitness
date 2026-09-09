import Foundation
import ActivityKit

@available(iOS 16.1, *)
struct LevelUpTimerAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var startedAt: Date
        var endAt: Date
    }

    var timerID: String
    var title: String
    var detail: String
    var kind: String
    var theme: String
}

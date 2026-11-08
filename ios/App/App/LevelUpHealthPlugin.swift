import Capacitor
import HealthKit

@objc(LevelUpHealthPlugin)
final class LevelUpHealthPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "LevelUpHealthPlugin"
    let jsName = "LevelUpHealth"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestAccess", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "recentWorkouts", returnType: CAPPluginReturnPromise)
    ]

    private lazy var store = HKHealthStore()
    private let workoutType = HKObjectType.workoutType()

    @objc func requestAccess(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("Apple Health is unavailable on this device.")
            return
        }

        store.requestAuthorization(toShare: [], read: [workoutType]) { completed, error in
            // Completion means the prompt finished, even if read access was declined.
            if completed {
                call.resolve()
            } else {
                call.reject("Apple Health permissions could not be opened.", nil, error)
            }
        }
    }

    @objc func recentWorkouts(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("Apple Health is unavailable on this device.")
            return
        }

        let now = Date()
        let start = Calendar.current.date(byAdding: .day, value: -14, to: now) ?? now
        let predicate = HKQuery.predicateForSamples(withStart: start, end: now, options: .strictStartDate)
        let order = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)
        let query = HKSampleQuery(sampleType: workoutType, predicate: predicate, limit: 50, sortDescriptors: [order]) { _, samples, error in
            if let healthError = error as? HKError, healthError.code == .errorNoData {
                call.resolve(["workouts": []])
                return
            }
            if let error {
                call.reject("Apple Health workouts could not be read.", nil, error)
                return
            }

            let workouts = (samples as? [HKWorkout] ?? []).map { workout -> [String: Any] in
                [
                    "source": workout.sourceRevision.source.name,
                    "activity": Self.activityName(workout.workoutActivityType),
                    "startedAt": workout.startDate.timeIntervalSince1970 * 1000,
                    "durationSeconds": workout.duration
                ]
            }
            call.resolve(["workouts": workouts])
        }
        store.execute(query)
    }

    private static func activityName(_ type: HKWorkoutActivityType) -> String {
        switch type {
        case .running: return "Run"
        case .walking: return "Walk"
        case .cycling: return "Ride"
        case .hiking: return "Hike"
        case .swimming: return "Swim"
        case .rowing: return "Row"
        case .elliptical: return "Elliptical"
        case .traditionalStrengthTraining, .functionalStrengthTraining: return "Strength training"
        case .highIntensityIntervalTraining: return "Interval training"
        default: return "Workout"
        }
    }
}

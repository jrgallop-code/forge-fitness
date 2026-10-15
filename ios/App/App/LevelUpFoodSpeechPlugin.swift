import AVFoundation
import Speech
import Capacitor
import UIKit

@objc(LevelUpFoodSpeechPlugin)
final class LevelUpFoodSpeechPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "LevelUpFoodSpeechPlugin"
    let jsName = "LevelUpFoodSpeech"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancel", returnType: CAPPluginReturnPromise)
    ]
    private let engine = AVAudioEngine()
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?
    private var recognizer: SFSpeechRecognizer?
    private var sessionID: String?
    private var transcript = ""
    private var completedTranscript = ""
    private var currentTranscript = ""
    private var stopping = false
    private var taskID = UUID()
    private var utterance = 0
    private var tapped = false
    private var deadline: DispatchWorkItem?
    private var silenceDeadline: DispatchWorkItem?
    private var backgroundObserver: NSObjectProtocol?

    override func load() {
        backgroundObserver = NotificationCenter.default.addObserver(forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: .main) { [weak self] _ in
            self?.finish(error: "Recording stopped when the app entered the background.")
        }
    }
    @objc func start(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard self.sessionID == nil else { call.reject("Voice recording is already active."); return }
            let id = call.getString("sessionID") ?? UUID().uuidString
            self.sessionID = id
            SFSpeechRecognizer.requestAuthorization { status in
                DispatchQueue.main.async {
                    guard self.sessionID == id else { call.reject("Recording cancelled."); return }
                    guard status == .authorized else { self.sessionID = nil; call.reject("Allow Speech Recognition in iOS Settings to use voice logging."); return }
                    AVAudioSession.sharedInstance().requestRecordPermission { allowed in
                        DispatchQueue.main.async {
                            guard self.sessionID == id else { call.reject("Recording cancelled."); return }
                            guard allowed else { self.sessionID = nil; call.reject("Allow Microphone access in iOS Settings to record a meal."); return }
                            self.begin(call, id: id)
                        }
                    }
                }
            }
        }
    }
    private func begin(_ call: CAPPluginCall, id: String) {
        do {
            let locale = Locale(identifier: call.getString("locale") ?? "en-CA")
            guard let recognizer = SFSpeechRecognizer(locale: locale), recognizer.isAvailable else {
                sessionID = nil; call.reject("Speech recognition is unavailable. Type your foods or try again later."); return
            }
            self.recognizer = recognizer
            transcript = ""
            completedTranscript = ""; currentTranscript = ""; stopping = false; utterance = 0
            let audio = AVAudioSession.sharedInstance()
            try audio.setCategory(.record, mode: .measurement, options: [.duckOthers])
            try audio.setActive(true)
            let input = engine.inputNode
            let format = input.outputFormat(forBus: 0)
            guard format.sampleRate > 0, format.channelCount > 0 else { finish(); call.reject("No microphone is available."); return }
            input.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in self?.request?.append(buffer) }
            tapped = true
            beginUtterance(id: id)
            engine.prepare()
            try engine.start()
            let limit = DispatchWorkItem { [weak self] in self?.finish() }
            deadline = limit
            DispatchQueue.main.asyncAfter(deadline: .now() + 55, execute: limit)
            call.resolve(["sessionID": id])
        } catch { finish(); call.reject("The microphone could not start. Try again or type your meal.") }
    }
    private func beginUtterance(id: String) {
        guard sessionID == id, let recognizer else { return }
        let token = UUID(); taskID = token
        currentTranscript = ""
        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = true
        request.taskHint = .dictation
        if recognizer.supportsOnDeviceRecognition { request.requiresOnDeviceRecognition = true }
        request.contextualStrings = ["grams", "ounces", "tablespoons", "blueberries", "Greek yogurt", "Kirkland", "chicken breast"]
        self.request = request
        task = recognizer.recognitionTask(with: request) { [weak self] result, error in
            DispatchQueue.main.async {
                guard let self, self.sessionID == id, self.taskID == token else { return }
                if let result {
                    self.currentTranscript = result.bestTranscription.formattedString
                    self.transcript = [self.completedTranscript, self.currentTranscript].filter { !$0.isEmpty }.joined(separator: "; ")
                    self.notifyListeners("speechResult", data: ["sessionID": id, "transcript": self.transcript, "pendingTranscript": self.currentTranscript, "final": false])
                    if result.isFinal { self.completeUtterance(id: id, token: token); return }
                    self.silenceDeadline?.cancel()
                    if !self.stopping && !self.currentTranscript.isEmpty {
                        let pause = DispatchWorkItem { [weak self] in self?.completeUtterance(id: id, token: token) }
                        self.silenceDeadline = pause
                        DispatchQueue.main.asyncAfter(deadline: .now() + 1.8, execute: pause)
                    }
                }
                if error != nil { self.finish(error: self.transcript.isEmpty ? "Speech could not be understood. Try again or type your meal." : nil) }
            }
        }
    }
    private func completeUtterance(id: String, token: UUID) {
        guard sessionID == id, taskID == token else { return }
        silenceDeadline?.cancel(); silenceDeadline = nil
        let text = currentTranscript
        completedTranscript = transcript
        currentTranscript = ""
        utterance += 1
        taskID = UUID() // Retire the old callback before cancelling its task.
        request?.endAudio(); task?.cancel()
        notifyListeners("speechResult", data: ["sessionID": id, "transcript": transcript, "pendingTranscript": "", "utteranceText": text, "utteranceID": utterance, "final": false])
        if stopping { finish() } else { beginUtterance(id: id) }
    }
    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.stopping = true
            self.silenceDeadline?.cancel()
            self.stopAudio()
            self.request?.endAudio()
            let id = self.sessionID
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) { if self.sessionID == id { self.finish() } }
            call.resolve()
        }
    }
    @objc func cancel(_ call: CAPPluginCall) {
        DispatchQueue.main.async { self.finish(notify: false); call.resolve() }
    }
    private func stopAudio() {
        engine.stop()
        if tapped { engine.inputNode.removeTap(onBus: 0); tapped = false }
    }
    private func finish(error: String? = nil, notify: Bool = true) {
        guard let id = sessionID else { return }
        sessionID = nil
        deadline?.cancel(); deadline = nil
        silenceDeadline?.cancel(); silenceDeadline = nil
        stopAudio()
        request?.endAudio(); request = nil
        task?.cancel(); task = nil; recognizer = nil
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        if notify { notifyListeners("speechResult", data: ["sessionID": id, "transcript": transcript, "pendingTranscript": currentTranscript, "final": true, "error": error ?? ""]) }
        transcript = ""
    }
}

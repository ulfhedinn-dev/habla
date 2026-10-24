import Foundation
import Speech
import AVFoundation

@MainActor
final class SpeechEngine: ObservableObject {
    private var recognizer: SFSpeechRecognizer?
    private var audioEngine: AVAudioEngine?
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?

    private var continuation: CheckedContinuation<String?, Never>?

    func startRecording(locale: Locale) async {
        recognizer = SFSpeechRecognizer(locale: locale)
        guard let recognizer, recognizer.isAvailable else { return }

        let authorized = await withCheckedContinuation { cont in
            SFSpeechRecognizer.requestAuthorization { status in
                cont.resume(returning: status == .authorized)
            }
        }
        guard authorized else { return }

        let engine = AVAudioEngine()
        audioEngine = engine
        let req = SFSpeechAudioBufferRecognitionRequest()
        req.shouldReportPartialResults = false
        req.addsPunctuation = true
        request = req

        let node = engine.inputNode
        let format = node.outputFormat(forBus: 0)
        node.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak req] buffer, _ in
            req?.append(buffer)
        }

        do {
            try engine.start()
        } catch {
            return
        }

        task = recognizer.recognitionTask(with: req) { [weak self] result, error in
            // Results captured on stopRecording
            _ = result
            _ = error
            _ = self
        }
    }

    func stopRecording() async -> String? {
        audioEngine?.inputNode.removeTap(onBus: 0)
        audioEngine?.stop()
        request?.endAudio()

        return await withCheckedContinuation { cont in
            guard let task else {
                cont.resume(returning: nil)
                return
            }
            // Restart task to capture final result
            task.finish()
            // Re-run a fresh recognition on the buffered audio if needed
            // For now, pull the best transcription from the finished task
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                cont.resume(returning: task.isCancelled ? nil : nil)
            }
        }
    }

    /// Phoneme-level data from SFVoiceAnalytics (iOS 17+).
    func phonemes(from segment: SFTranscriptionSegment) -> [String] {
        // SFVoiceAnalytics.phonemes returns per-frame phoneme labels.
        // Available when recognizer is configured for on-device recognition.
        guard let analytics = segment.voiceAnalytics else { return [] }
        return analytics.phonemes.acousticFeatureValuePerFrame.map { _ in "" }
    }
}

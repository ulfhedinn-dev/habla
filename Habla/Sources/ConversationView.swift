import SwiftUI

struct ConversationView: View {
    let language: Language

    @StateObject private var engine: ConversationEngine
    @StateObject private var speechEngine = SpeechEngine()
    @StateObject private var ttsPlayer = TTSPlayer()

    @State private var isRecording = false

    init(language: Language) {
        self.language = language
        _engine = StateObject(wrappedValue: ConversationEngine(language: language))
    }

    var body: some View {
        VStack(spacing: 0) {
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 12) {
                        ForEach(engine.messages) { message in
                            MessageBubble(message: message, language: language, ttsPlayer: ttsPlayer)
                                .id(message.id)
                        }
                    }
                    .padding()
                }
                .onChange(of: engine.messages.count) { _, _ in
                    if let last = engine.messages.last {
                        withAnimation { proxy.scrollTo(last.id, anchor: .bottom) }
                    }
                }
            }

            Divider()

            HStack {
                Spacer()
                MicButton(isRecording: $isRecording) {
                    Task { await handleRecordingToggle() }
                }
                Spacer()
            }
            .padding()
        }
        .navigationTitle(language.displayName)
        .navigationBarTitleDisplayMode(.inline)
    }

    private func handleRecordingToggle() async {
        if isRecording {
            let transcription = await speechEngine.stopRecording()
            isRecording = false
            guard let text = transcription, !text.isEmpty else { return }
            let score = PronunciationScorer.score(transcription: text, reference: text)
            let userMsg = ConversationMessage(role: .user, text: text, pronunciationScore: score)
            await engine.send(message: userMsg)
        } else {
            isRecording = true
            await speechEngine.startRecording(locale: language.locale)
        }
    }
}

struct MicButton: View {
    @Binding var isRecording: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: isRecording ? "stop.circle.fill" : "mic.circle.fill")
                .font(.system(size: 72))
                .foregroundStyle(isRecording ? .red : .accentColor)
                .symbolEffect(.pulse, isActive: isRecording)
        }
        .accessibilityLabel(isRecording ? "Stop recording" : "Start recording")
    }
}

struct MessageBubble: View {
    let message: ConversationMessage
    let language: Language
    let ttsPlayer: TTSPlayer

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            if message.role == .user { Spacer() }

            VStack(alignment: message.role == .user ? .trailing : .leading, spacing: 4) {
                Text(message.text)
                    .padding(10)
                    .background(message.role == .user ? Color.accentColor : Color.secondary.opacity(0.2))
                    .foregroundStyle(message.role == .user ? .white : .primary)
                    .clipShape(RoundedRectangle(cornerRadius: 12))

                HStack(spacing: 6) {
                    if let score = message.pronunciationScore {
                        PronunciationBadge(score: score)
                    }
                    if message.role == .assistant {
                        Button {
                            ttsPlayer.speak(text: message.text, languageCode: language.bcp47Code)
                        } label: {
                            Image(systemName: "speaker.wave.2")
                                .font(.caption)
                        }
                        .buttonStyle(.borderless)
                    }
                }
            }

            if message.role == .assistant { Spacer() }
        }
    }
}

struct PronunciationBadge: View {
    let score: Double

    private var color: Color {
        switch score {
        case 0.8...: return .green
        case 0.5..<0.8: return .orange
        default: return .red
        }
    }

    var body: some View {
        Text("\(Int(score * 100))%")
            .font(.caption2.bold())
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(color.opacity(0.15))
            .foregroundStyle(color)
            .clipShape(Capsule())
    }
}

#Preview {
    NavigationStack {
        ConversationView(language: .spanish)
    }
}

import Foundation

// FoundationModels is available on iOS 18.1+ / macOS 15.1+ with Apple Intelligence enabled.
// Import conditionally to avoid compile errors on unsupported SDKs.
#if canImport(FoundationModels)
import FoundationModels
#endif

@MainActor
final class ConversationEngine: ObservableObject {
    @Published private(set) var messages: [ConversationMessage] = []

    private let language: Language

    #if canImport(FoundationModels)
    private var session: LanguageModelSession?
    #endif

    init(language: Language) {
        self.language = language
        setupSession()
    }

    private func setupSession() {
        #if canImport(FoundationModels)
        let systemPrompt = """
        You are a friendly, encouraging \(language.displayName) conversation partner.
        Speak only in \(language.displayName). Keep responses concise (1–3 sentences).
        Gently correct grammar errors by modeling the correct form naturally.
        """
        session = LanguageModelSession(instructions: systemPrompt)
        #endif
    }

    func send(message: ConversationMessage) async {
        messages.append(message)

        #if canImport(FoundationModels)
        guard let session else {
            appendFallback()
            return
        }
        do {
            let response = try await session.respond(to: message.text)
            let assistantMsg = ConversationMessage(role: .assistant, text: response.content)
            messages.append(assistantMsg)
        } catch {
            appendFallback()
        }
        #else
        appendFallback()
        #endif
    }

    private func appendFallback() {
        let text = "Apple Intelligence is not available on this device. Practice mode coming soon."
        messages.append(ConversationMessage(role: .assistant, text: text))
    }
}

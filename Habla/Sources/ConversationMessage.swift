import Foundation

enum MessageRole {
    case user, assistant
}

struct ConversationMessage: Identifiable {
    let id: UUID
    let role: MessageRole
    let text: String
    let pronunciationScore: Double?
    let timestamp: Date

    init(
        id: UUID = UUID(),
        role: MessageRole,
        text: String,
        pronunciationScore: Double? = nil,
        timestamp: Date = .now
    ) {
        self.id = id
        self.role = role
        self.text = text
        self.pronunciationScore = pronunciationScore
        self.timestamp = timestamp
    }
}

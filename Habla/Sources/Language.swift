import Foundation

enum Language: String, CaseIterable, Identifiable {
    case spanish = "es"
    case french = "fr"
    case japanese = "ja"
    case mandarin = "zh"
    case portuguese = "pt"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .spanish: return "Spanish"
        case .french: return "French"
        case .japanese: return "Japanese"
        case .mandarin: return "Mandarin"
        case .portuguese: return "Portuguese"
        }
    }

    /// BCP-47 tag used for TTS voice selection.
    var bcp47Code: String {
        switch self {
        case .spanish: return "es-ES"
        case .french: return "fr-FR"
        case .japanese: return "ja-JP"
        case .mandarin: return "zh-CN"
        case .portuguese: return "pt-BR"
        }
    }

    /// Locale used for SFSpeechRecognizer.
    var locale: Locale {
        Locale(identifier: bcp47Code)
    }
}

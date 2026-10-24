import Foundation

enum PronunciationScorer {
    /// Returns a 0.0–1.0 score comparing the user's transcription to a reference string.
    /// Currently uses naive word-match; placeholder for phoneme-level diff.
    static func score(transcription: String, reference: String) -> Double {
        let userWords = tokens(transcription)
        let refWords = tokens(reference)
        guard !refWords.isEmpty else { return 1.0 }

        let matches = userWords.filter { refWords.contains($0) }.count
        return Double(matches) / Double(refWords.count)
    }

    private static func tokens(_ text: String) -> [String] {
        text.lowercased()
            .components(separatedBy: .punctuationCharacters).joined()
            .components(separatedBy: .whitespaces)
            .filter { !$0.isEmpty }
    }
}

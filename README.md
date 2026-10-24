# Habla

Habla is a native iOS and macOS app for language conversation practice and pronunciation feedback, powered by Apple Intelligence (on-device LLM via FoundationModels), Speech framework, and AVFoundation.

## Platform Requirements

- **iOS 26+** (Apple Intelligence required for AI conversation partner)
- **macOS 26+**
- Xcode 26+

## Features

- Conversational practice in Spanish, French, Japanese, Mandarin, and Portuguese
- On-device speech recognition via `SFSpeechRecognizer`
- Pronunciation scoring after each user turn
- Native TTS playback of assistant responses via `AVSpeechSynthesizer`
- AI conversation partner via `FoundationModels` (`LanguageModelSession`)

## Build

1. Install [xcodegen](https://github.com/yonaskolb/XcodeGen):
   ```sh
   brew install xcodegen
   ```

2. Generate the Xcode project:
   ```sh
   xcodegen generate
   ```

3. Open the project:
   ```sh
   open Habla.xcodeproj
   ```

4. Select the **Habla** scheme, choose an iOS 26+ simulator or device, and build.

## Architecture

| File | Role |
|---|---|
| `HablaApp.swift` | App entry point |
| `ContentView.swift` | Language picker + session list |
| `ConversationView.swift` | Practice UI with mic, transcript, scores |
| `SpeechEngine.swift` | `SFSpeechRecognizer` wrapper |
| `PronunciationScorer.swift` | Word-match scorer (phoneme diff TBD) |
| `ConversationEngine.swift` | `FoundationModels` `LanguageModelSession` wrapper |
| `TTSPlayer.swift` | `AVSpeechSynthesizer` wrapper |
| `ConversationMessage.swift` | Message model |
| `Language.swift` | Supported language enum |

## License

Private.

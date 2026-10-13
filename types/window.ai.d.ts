interface AILanguageModelCapabilities {
  available: "readily" | "after-download" | "no";
}

interface AILanguageModelSession {
  prompt(input: string): Promise<string>;
  promptStreaming(input: string): ReadableStream;
  destroy(): void;
}

interface AILanguageModelCreateOptions {
  systemPrompt?: string;
  temperature?: number;
  topK?: number;
}

interface AILanguageModel {
  capabilities(): Promise<AILanguageModelCapabilities>;
  create(options?: AILanguageModelCreateOptions): Promise<AILanguageModelSession>;
}

interface AI {
  languageModel: AILanguageModel;
}

interface Window {
  ai?: AI;
}

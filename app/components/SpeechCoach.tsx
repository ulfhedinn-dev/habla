"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Anthropic from "@anthropic-ai/sdk";

type Difficulty = "beginner" | "intermediate" | "advanced";

const TOPIC_SUGGESTIONS = [
  "Tell me about your favorite food.",
  "Describe your best friend.",
  "What did you do this weekend?",
  "Tell me about your family.",
  "What is your favorite animal and why?",
  "Describe your home or bedroom.",
  "What do you like to do after school?",
  "Tell me about a movie or show you enjoyed.",
];

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  beginner: "bg-green-500 hover:bg-green-600",
  intermediate: "bg-yellow-500 hover:bg-yellow-600",
  advanced: "bg-red-500 hover:bg-red-600",
};

const DIFFICULTY_CONTEXT: Record<Difficulty, string> = {
  beginner:
    "The student is a beginner. Be very gentle with corrections, focus on major errors only, and give lots of encouragement. Praise effort heavily.",
  intermediate:
    "The student is at an intermediate level. Point out grammatical mistakes and vocabulary improvements, but keep corrections encouraging and constructive.",
  advanced:
    "The student is at an advanced level. Be thorough with corrections — grammar, vocabulary, fluency, and natural phrasing all matter. Still be encouraging but more detailed.",
};

const API_KEY_STORAGE = "habla_anthropic_key";

function ApiKeySetup({ onSave }: { onSave: (key: string) => void }) {
  const [value, setValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed.startsWith("sk-")) return;
    localStorage.setItem(API_KEY_STORAGE, trimmed);
    onSave(trimmed);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-blue-700 text-center mb-2">🗣️ habla</h1>
        <p className="text-gray-500 text-sm text-center mb-6">
          Enter your Anthropic API key to get started. It&apos;s stored only in your browser.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="sk-ant-..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!value.trim().startsWith("sk-")}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-semibold py-3 rounded-xl transition-all"
          >
            Start practicing
          </button>
        </form>
        <p className="text-xs text-gray-400 text-center mt-4">
          Get your key at{" "}
          <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" className="text-blue-400 underline">
            console.anthropic.com
          </a>
        </p>
      </div>
    </div>
  );
}

export default function SpeechCoach() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [isRecording, setIsRecording] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [coaching, setCoaching] = useState("");
  const [error, setError] = useState("");
  const [topicIndex, setTopicIndex] = useState(0);
  const [supported, setSupported] = useState(true);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const holdingRef = useRef(false);
  const interimRef = useRef("");

  useEffect(() => {
    const stored = localStorage.getItem(API_KEY_STORAGE);
    if (stored) setApiKey(stored);

    const SpeechRecognitionClass =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) setSupported(false);
  }, []);

  const startRecognition = useCallback(() => {
    const SpeechRecognitionClass =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return;

    const recognition = new SpeechRecognitionClass();
    recognition.lang = "es-ES";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      if (final) interimRef.current += final;
      setTranscript(interimRef.current + interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== "no-speech" && event.error !== "aborted") {
        setError(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      if (holdingRef.current) recognition.start();
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  const stopAndEvaluate = useCallback(async () => {
    holdingRef.current = false;
    setIsRecording(false);

    const finalTranscript = transcript.trim();

    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    if (!finalTranscript) {
      setError("No speech detected. Try again!");
      return;
    }

    setIsEvaluating(true);
    setCoaching("");
    setError("");

    try {
      const client = new Anthropic({
        apiKey: apiKey!,
        dangerouslyAllowBrowser: true,
      });

      const systemPrompt = `You are a friendly Spanish language coach helping a student practice speaking Spanish.
The student has just said something in Spanish. Evaluate what they said:
- Note what was grammatically correct or well-expressed
- Gently correct any mistakes with a brief explanation
- Give a word of encouragement

Keep your response to 2-3 sentences max. Always respond in English. Be warm and encouraging — this is a kid learning.

${DIFFICULTY_CONTEXT[difficulty]}`;

      const message = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 256,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: `The student said in Spanish: "${finalTranscript}"`,
          },
        ],
      });

      const coachingText =
        message.content[0].type === "text" ? message.content[0].text : "";
      setCoaching(coachingText);

      const utterance = new SpeechSynthesisUtterance(coachingText);
      utterance.lang = "en-US";
      utterance.rate = 0.9;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsEvaluating(false);
    }
  }, [transcript, difficulty, apiKey]);

  const handlePointerDown = useCallback(() => {
    if (isEvaluating) return;
    holdingRef.current = true;
    interimRef.current = "";
    setTranscript("");
    setCoaching("");
    setError("");
    setIsRecording(true);
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    startRecognition();
  }, [isEvaluating, startRecognition]);

  const handlePointerUp = useCallback(() => {
    if (!isRecording) return;
    stopAndEvaluate();
  }, [isRecording, stopAndEvaluate]);

  if (!apiKey) {
    return <ApiKeySetup onSave={setApiKey} />;
  }

  if (!supported) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <p className="text-2xl mb-4">😔</p>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Browser Not Supported
          </h2>
          <p className="text-gray-600">
            Please use Chrome or Edge for speech recognition support.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col items-center justify-start p-6 pt-10">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-blue-700 tracking-tight">
            🗣️ habla
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Practice your Spanish speaking skills
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Difficulty
          </p>
          <div className="flex gap-2">
            {(["beginner", "intermediate", "advanced"] as Difficulty[]).map(
              (level) => (
                <button
                  key={level}
                  onClick={() => setDifficulty(level)}
                  className={`flex-1 py-2 px-3 rounded-xl text-white text-sm font-semibold transition-all ${
                    difficulty === level
                      ? DIFFICULTY_COLORS[level] + " ring-2 ring-offset-2 ring-blue-300 scale-105"
                      : "bg-gray-200 text-gray-500 hover:bg-gray-300"
                  }`}
                >
                  {DIFFICULTY_LABELS[level]}
                </button>
              )
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4 flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div className="flex-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Try saying...
            </p>
            <p className="text-gray-700 font-medium">
              {TOPIC_SUGGESTIONS[topicIndex]}
            </p>
          </div>
          <button
            onClick={() => setTopicIndex((i) => (i + 1) % TOPIC_SUGGESTIONS.length)}
            className="text-blue-400 hover:text-blue-600 text-xs font-semibold mt-1 shrink-0"
          >
            New topic
          </button>
        </div>

        <div className="flex flex-col items-center gap-4 py-4">
          <button
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            disabled={isEvaluating}
            className={`w-40 h-40 rounded-full font-bold text-white text-lg shadow-xl transition-all select-none touch-none
              ${isRecording
                ? "bg-red-500 scale-110 shadow-red-300 shadow-2xl"
                : isEvaluating
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600 active:scale-95"
              }`}
            style={{ WebkitUserSelect: "none" }}
          >
            {isRecording ? (
              <span className="flex flex-col items-center gap-2">
                <span className="text-3xl animate-pulse">🎙️</span>
                <span className="text-sm">Recording…</span>
              </span>
            ) : isEvaluating ? (
              <span className="flex flex-col items-center gap-2">
                <span className="text-3xl animate-spin">⏳</span>
                <span className="text-sm">Thinking…</span>
              </span>
            ) : (
              <span className="flex flex-col items-center gap-2">
                <span className="text-3xl">🎤</span>
                <span className="text-sm">Hold to Speak</span>
              </span>
            )}
          </button>

          {isRecording && (
            <div className="flex gap-1 items-center">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="w-2 bg-red-400 rounded-full animate-pulse"
                  style={{
                    height: `${8 + ((i * 7) % 20)}px`,
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-600 text-sm text-center">
            {error}
          </div>
        )}

        {transcript && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              What you said (Spanish)
            </p>
            <p className="text-gray-800 text-base italic">&ldquo;{transcript}&rdquo;</p>
          </div>
        )}

        {coaching && (
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-100 rounded-2xl shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider">
                Coach says
              </p>
              {isSpeaking && (
                <span className="text-xs text-blue-400 animate-pulse">
                  🔊 speaking…
                </span>
              )}
            </div>
            <p className="text-gray-800 text-base leading-relaxed">{coaching}</p>
          </div>
        )}

        <div className="text-center">
          <button
            onClick={() => {
              localStorage.removeItem(API_KEY_STORAGE);
              setApiKey(null);
            }}
            className="text-xs text-gray-300 hover:text-gray-500"
          >
            Change API key
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useRef, useCallback, useEffect } from "react";

type Difficulty = "beginner" | "intermediate" | "advanced";
type Language = "Spanish" | "Icelandic" | "Japanese";

type TopicCategory = { category: string; prompts: string[] };
type LanguageTopics = Record<Language, TopicCategory[]>;

type SessionEntry = {
  id: string;
  timestamp: number;
  language: Language;
  difficulty: string;
  transcript: string;
  coaching: string;
};

const LANGUAGES: { name: Language; flag: string; code: string }[] = [
  { name: "Spanish", flag: "🇪🇸", code: "es-ES" },
  { name: "Icelandic", flag: "🇮🇸", code: "is-IS" },
  { name: "Japanese", flag: "🇯🇵", code: "ja-JP" },
];

const TOPICS: LanguageTopics = {
  Spanish: [
    {
      category: "Daily Life",
      prompts: [
        "Tell me about your favorite food.",
        "Describe the weather today.",
        "What did you do after school?",
        "Describe your home or bedroom.",
        "What do you like to do on weekends?",
      ],
    },
    {
      category: "Family & Friends",
      prompts: [
        "Tell me about your best friend.",
        "Describe someone in your family.",
        "What does your family like to do together?",
        "Tell me about a family tradition.",
        "Describe your neighborhood.",
      ],
    },
    {
      category: "Favorites",
      prompts: [
        "What is your favorite animal and why?",
        "Describe a movie or show you love.",
        "What's your favorite subject in school?",
        "Tell me about your favorite food.",
        "Describe a hobby you enjoy.",
      ],
    },
    {
      category: "Grammar Drills",
      prompts: [
        "Tell me what you did yesterday (practice past tense).",
        "Describe what you will do tomorrow (practice future tense).",
        "Tell me what you are doing right now (practice present progressive).",
        "Describe something you used to do as a child (practice imperfect).",
        "Tell me something you would do if you could (practice conditional).",
      ],
    },
  ],
  Icelandic: [
    {
      category: "Daily Life",
      prompts: [
        "Tell me about your favorite Icelandic food.",
        "Describe the weather today in Iceland.",
        "What did you do after school?",
        "Describe your home.",
        "What do you like to do on weekends?",
      ],
    },
    {
      category: "Family & Friends",
      prompts: [
        "Tell me about your best friend.",
        "Describe someone in your family.",
        "What does your family like to do together?",
        "Tell me about a family tradition in Iceland.",
        "Describe your neighborhood or town.",
      ],
    },
    {
      category: "Favorites",
      prompts: [
        "What is your favorite animal and why?",
        "Describe a movie or show you love.",
        "What's your favorite subject in school?",
        "Tell me about something you enjoy doing outdoors.",
        "Describe a holiday you celebrate.",
      ],
    },
    {
      category: "Grammar Drills",
      prompts: [
        "Tell me what you did yesterday (practice past tense).",
        "Describe what you will do tomorrow (practice future tense).",
        "Tell me what you are doing right now (practice present tense).",
        "Describe a place you have visited (practice past perfect).",
        "Tell me about your daily routine (practice habitual present).",
      ],
    },
  ],
  Japanese: [
    {
      category: "Daily Life",
      prompts: [
        "Tell me about your favorite Japanese food.",
        "Describe your morning routine.",
        "What did you do after school?",
        "Describe your home or room.",
        "What do you like to do on weekends?",
      ],
    },
    {
      category: "Family & Friends",
      prompts: [
        "Tell me about your best friend.",
        "Describe someone in your family.",
        "What does your family like to do together?",
        "Tell me about a family tradition.",
        "Describe a teacher or classmate.",
      ],
    },
    {
      category: "Favorites",
      prompts: [
        "What is your favorite animal and why?",
        "Describe an anime or show you love.",
        "What's your favorite subject in school?",
        "Tell me about a food you really enjoy.",
        "Describe a season you like and why.",
      ],
    },
    {
      category: "Grammar Drills",
      prompts: [
        "Tell me what you did yesterday (practice past tense -ました).",
        "Describe what you will do tomorrow (practice volitional form).",
        "Tell me what you are doing right now (practice -ています).",
        "Describe something you want to do (practice -たいです).",
        "Explain something you can do (practice -ことができます).",
      ],
    },
  ],
};

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

const SESSION_KEY = "habla_sessions";
const MAX_SESSIONS = 50;

const DIFFICULTY_CONTEXT: Record<Difficulty, string> = {
  beginner:
    "The student is a beginner. Be very gentle with corrections, focus on major errors only, and give lots of encouragement. Praise effort heavily.",
  intermediate:
    "The student is at an intermediate level. Point out grammatical mistakes and vocabulary improvements, but keep corrections encouraging and constructive.",
  advanced:
    "The student is at an advanced level. Be thorough with corrections — grammar, vocabulary, fluency, and natural phrasing all matter. Still be encouraging but more detailed.",
};

function relativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

function loadSessions(): SessionEntry[] {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: SessionEntry[]) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessions));
  } catch {
    // localStorage may be unavailable
  }
}

export default function SpeechCoach() {
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);
  const [language, setLanguage] = useState<Language>("Spanish");
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [coaching, setCoaching] = useState("");
  const [error, setError] = useState("");
  const [topicIndex, setTopicIndex] = useState(0);
  const [supported, setSupported] = useState(true);
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const holdingRef = useRef(false);
  const interimRef = useRef("");
  const languageRef = useRef<Language>(language);
  const difficultyRef = useRef<Difficulty>(difficulty);
  useEffect(() => { languageRef.current = language; }, [language]);
  useEffect(() => { difficultyRef.current = difficulty; }, [difficulty]);

  useEffect(() => {
    const SpeechRecognitionClass =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) setSupported(false);
    setSessions(loadSessions());

    if (window.ai?.languageModel) {
      window.ai.languageModel.capabilities().then((caps) => {
        setAiAvailable(caps.available !== "no");
      }).catch(() => setAiAvailable(false));
    } else {
      setAiAvailable(false);
    }
  }, []);

  useEffect(() => {
    setSelectedCategory(0);
    setTopicIndex(0);
  }, [language]);

  useEffect(() => {
    setTopicIndex(0);
  }, [selectedCategory]);

  const currentCategories = TOPICS[language];
  const currentPrompts = currentCategories[selectedCategory].prompts;
  const currentLangCode =
    LANGUAGES.find((l) => l.name === language)?.code ?? "es-ES";

  const startRecognition = useCallback(() => {
    const SpeechRecognitionClass =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return;

    const recognition = new SpeechRecognitionClass();
    recognition.lang = currentLangCode;
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
  }, [currentLangCode]);

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

    const currentLang = languageRef.current;
    const currentDiff = difficultyRef.current;

    try {
      const systemPrompt = `You are a friendly language coach helping a student practice speaking ${currentLang}.
The student has just said something in ${currentLang}. Evaluate what they said:
- Note what was grammatically correct or well-expressed
- Gently correct any mistakes with a brief explanation
- Give a word of encouragement

Keep your response to 2-3 sentences max. Always respond in English. Be warm and encouraging — this is a kid learning.

${DIFFICULTY_CONTEXT[currentDiff]}`;

      const session = await window.ai!.languageModel.create({ systemPrompt });
      const coachingText = await session.prompt(
        `The student said in ${currentLang}: "${finalTranscript}"`
      );
      session.destroy();
      setCoaching(coachingText);

      const entry: SessionEntry = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        language: currentLang,
        difficulty: currentDiff,
        transcript: finalTranscript,
        coaching: coachingText,
      };
      setSessions((prev) => {
        const updated = [entry, ...prev].slice(0, MAX_SESSIONS);
        saveSessions(updated);
        return updated;
      });

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
  }, [transcript]);

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

  const newTopic = () => {
    setTopicIndex((i) => (i + 1) % currentPrompts.length);
  };

  const clearHistory = () => {
    setSessions([]);
    saveSessions([]);
  };

  if (aiAvailable === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <p className="text-3xl mb-4">🤖</p>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">window.ai not available</h2>
          <p className="text-gray-600 text-sm mb-4">
            This app uses Chrome&apos;s built-in AI. You need Chrome Canary with the Prompt API enabled.
          </p>
          <a
            href="https://developer.chrome.com/docs/ai/built-in"
            target="_blank"
            rel="noreferrer"
            className="text-blue-500 underline text-sm"
          >
            How to enable Chrome built-in AI →
          </a>
        </div>
      </div>
    );
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
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-blue-700 tracking-tight">
            🗣️ habla
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Practice your language speaking skills
          </p>
        </div>

        {/* Language Selector */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Language
          </p>
          <div className="flex gap-2">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.name}
                onClick={() => setLanguage(lang.name)}
                className={`flex-1 py-2 px-3 rounded-xl text-sm font-semibold transition-all ${
                  language === lang.name
                    ? "bg-blue-500 text-white ring-2 ring-offset-2 ring-blue-300 scale-105"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {lang.flag} {lang.name}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty Selector */}
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
                      ? DIFFICULTY_COLORS[level] +
                        " ring-2 ring-offset-2 ring-blue-300 scale-105"
                      : "bg-gray-200 text-gray-500 hover:bg-gray-300"
                  }`}
                >
                  {DIFFICULTY_LABELS[level]}
                </button>
              )
            )}
          </div>
        </div>

        {/* Topic Suggestion */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="flex flex-wrap gap-2 mb-3">
            {currentCategories.map((cat, i) => (
              <button
                key={cat.category}
                onClick={() => setSelectedCategory(i)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  selectedCategory === i
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {cat.category}
              </button>
            ))}
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                Try saying...
              </p>
              <p className="text-gray-700 font-medium">
                {currentPrompts[topicIndex % currentPrompts.length]}
              </p>
            </div>
            <button
              onClick={newTopic}
              className="text-blue-400 hover:text-blue-600 text-xs font-semibold mt-1 shrink-0"
            >
              New topic
            </button>
          </div>
        </div>

        {/* Record Button */}
        <div className="flex flex-col items-center gap-4 py-4">
          <button
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            disabled={isEvaluating}
            className={`w-40 h-40 rounded-full font-bold text-white text-lg shadow-xl transition-all select-none touch-none
              ${
                isRecording
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

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-600 text-sm text-center">
            {error}
          </div>
        )}

        {/* Transcript */}
        {transcript && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              What you said ({language})
            </p>
            <p className="text-gray-800 text-base italic">"{transcript}"</p>
          </div>
        )}

        {/* Coaching */}
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

        {/* Recent Sessions */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => setHistoryOpen((o) => !o)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
          >
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Recent Sessions{sessions.length > 0 ? ` (${sessions.length})` : ""}
            </span>
            <span className="text-gray-400 text-sm">{historyOpen ? "▲" : "▼"}</span>
          </button>

          {historyOpen && (
            <div className="border-t border-gray-100">
              {sessions.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-6">
                  No sessions yet. Practice something!
                </p>
              ) : (
                <>
                  <div className="p-3 space-y-3 max-h-96 overflow-y-auto">
                    {sessions.slice(0, 10).map((s) => (
                      <div
                        key={s.id}
                        className="bg-gray-50 rounded-xl p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">
                            {relativeTime(s.timestamp)}
                          </span>
                          <div className="flex gap-1">
                            <span className="bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full font-medium">
                              {s.language}
                            </span>
                            <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full font-medium capitalize">
                              {s.difficulty}
                            </span>
                          </div>
                        </div>
                        <p className="text-gray-700 text-sm italic">
                          &ldquo;
                          {s.transcript.length > 80
                            ? s.transcript.slice(0, 80) + "…"
                            : s.transcript}
                          &rdquo;
                        </p>
                        <p className="text-gray-500 text-xs">
                          {s.coaching.length > 120
                            ? s.coaching.slice(0, 120) + "…"
                            : s.coaching}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 border-t border-gray-100">
                    <button
                      onClick={clearHistory}
                      className="text-red-400 hover:text-red-600 text-xs font-semibold transition-colors"
                    >
                      Clear history
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

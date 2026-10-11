import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

const DIFFICULTY_CONTEXT: Record<string, string> = {
  beginner:
    "The student is a beginner. Be very gentle with corrections, focus on major errors only, and give lots of encouragement. Praise effort heavily.",
  intermediate:
    "The student is at an intermediate level. Point out grammatical mistakes and vocabulary improvements, but keep corrections encouraging and constructive.",
  advanced:
    "The student is at an advanced level. Be thorough with corrections — grammar, vocabulary, fluency, and natural phrasing all matter. Still be encouraging but more detailed.",
};

export async function POST(req: NextRequest) {
  const { transcript, difficulty = "beginner" } = await req.json();

  if (!transcript || typeof transcript !== "string") {
    return NextResponse.json(
      { error: "Missing transcript" },
      { status: 400 }
    );
  }

  const difficultyNote =
    DIFFICULTY_CONTEXT[difficulty] || DIFFICULTY_CONTEXT.beginner;

  const systemPrompt = `You are a friendly Spanish language coach helping a student practice speaking Spanish.
The student has just said something in Spanish. Evaluate what they said:
- Note what was grammatically correct or well-expressed
- Gently correct any mistakes with a brief explanation
- Give a word of encouragement

Keep your response to 2-3 sentences max. Always respond in English. Be warm and encouraging — this is a kid learning.

${difficultyNote}`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 256,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `The student said in Spanish: "${transcript}"`,
      },
    ],
  });

  const coaching =
    message.content[0].type === "text" ? message.content[0].text : "";

  return NextResponse.json({ coaching });
}

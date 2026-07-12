import Anthropic from "@anthropic-ai/sdk";

// Default per Anthropic's current guidance: always use the most capable
// model unless the operator explicitly chooses otherwise (CLAUDE_MODEL).
export const CLAUDE_MODEL = process.env.CLAUDE_MODEL ?? "claude-opus-4-8";

let client: Anthropic | undefined;

export function getAnthropicClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY must be set to run AI-backed agents.");
  }
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

import * as z from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import { CLAUDE_MODEL, getAnthropicClient } from "../anthropic-client";

const QaReportSchema = z.object({
  summary: z.string().describe("One or two sentences on overall quality/readiness."),
  issues: z.array(z.string()).describe("Specific problems found, most severe first. Empty array if none."),
  suggestions: z.array(z.string()).describe("Optional improvements that aren't blocking issues."),
});

export type QaReport = z.infer<typeof QaReportSchema>;

export interface QaReviewInput {
  title: string;
  brief: string | null;
  content: string;
}

const SYSTEM_PROMPT = `You are the Dev/QA Agent for a small AI agency, reviewing a technical
deliverable before it goes to a client. You do not execute code or run
tests yourself — this is a static read-through. Point out correctness bugs,
missing error handling at real boundaries, and anything that contradicts
the brief. Do not invent issues to seem thorough; an empty issues list is a
valid, good outcome. Never claim you ran or tested the code.`;

export async function reviewDeliverable(input: QaReviewInput): Promise<QaReport> {
  const client = getAnthropicClient();

  const message = await client.messages.parse({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [`Deliverable: ${input.title}`, input.brief && `Brief: ${input.brief}`, `---\n${input.content}`]
          .filter(Boolean)
          .join("\n"),
      },
    ],
    output_config: { format: zodOutputFormat(QaReportSchema) },
  });

  if (message.stop_reason === "refusal") {
    throw new Error("QA Agent: request was declined by safety classifiers.");
  }
  if (!message.parsed_output) {
    throw new Error("QA Agent: model did not return a parseable report.");
  }

  return message.parsed_output;
}

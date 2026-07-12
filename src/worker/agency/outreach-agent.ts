import * as z from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import { CLAUDE_MODEL, getAnthropicClient } from "../anthropic-client";

const OutreachDraftSchema = z.object({
  subject: z.string().describe("Email subject line. Omit or leave short for a DM."),
  body: z.string().describe("The full outreach message body, ready to send after review."),
});

export type OutreachDraft = z.infer<typeof OutreachDraftSchema>;

export interface DraftOutreachInput {
  clientName: string;
  contactName: string | null;
  channel: "email" | "dm";
  notes: string | null;
}

const SYSTEM_PROMPT = `You are the Outreach Agent for a small AI agency. Draft a short,
specific prospecting message for the given lead — never generic template
filler. Reference something concrete from the notes if provided. No false
claims about past work or availability. Keep it under 150 words for email,
under 60 for a DM.`;

export async function draftOutreachMessage(input: DraftOutreachInput): Promise<OutreachDraft> {
  const client = getAnthropicClient();

  const message = await client.messages.parse({
    model: CLAUDE_MODEL,
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          `Lead: ${input.clientName}`,
          input.contactName && `Contact: ${input.contactName}`,
          `Channel: ${input.channel}`,
          input.notes && `Notes: ${input.notes}`,
        ]
          .filter(Boolean)
          .join("\n"),
      },
    ],
    output_config: { format: zodOutputFormat(OutreachDraftSchema) },
  });

  if (message.stop_reason === "refusal") {
    throw new Error("Outreach Agent: request was declined by safety classifiers.");
  }
  if (!message.parsed_output) {
    throw new Error("Outreach Agent: model did not return a parseable draft.");
  }

  return message.parsed_output;
}

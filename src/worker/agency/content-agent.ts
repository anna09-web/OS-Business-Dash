import * as z from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import { CLAUDE_MODEL, getAnthropicClient } from "../anthropic-client";

const DeliverableDraftSchema = z.object({
  content: z.string().describe("The full drafted deliverable, ready for the owner to review."),
});

export type DeliverableDraft = z.infer<typeof DeliverableDraftSchema>;

export interface DraftDeliverableInput {
  clientName: string;
  title: string;
  brief: string | null;
}

const SYSTEM_PROMPT = `You are the Content Agent for a small AI agency. Draft the requested
client deliverable (copy, a brief, a report, or similar written work) based
on the brief given. Match the tone and scope implied by the brief. Flag any
assumptions you had to make inline in the draft rather than inventing facts
about the client's business.`;

export async function draftDeliverable(input: DraftDeliverableInput): Promise<DeliverableDraft> {
  const client = getAnthropicClient();

  const message = await client.messages.parse({
    model: CLAUDE_MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [`Client: ${input.clientName}`, `Deliverable: ${input.title}`, input.brief && `Brief: ${input.brief}`]
          .filter(Boolean)
          .join("\n"),
      },
    ],
    output_config: { format: zodOutputFormat(DeliverableDraftSchema) },
  });

  if (message.stop_reason === "refusal") {
    throw new Error("Content Agent: request was declined by safety classifiers.");
  }
  if (!message.parsed_output) {
    throw new Error("Content Agent: model did not return a parseable draft.");
  }

  return message.parsed_output;
}

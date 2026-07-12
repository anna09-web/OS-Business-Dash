import * as z from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import { CLAUDE_MODEL, getAnthropicClient } from "../anthropic-client";

const ReminderDraftSchema = z.object({
  reminder: z.string().describe("A polite, brief overdue-payment reminder, ready to send after review."),
});

export type ReminderDraft = z.infer<typeof ReminderDraftSchema>;

export interface DraftReminderInput {
  clientName: string;
  amount: number;
  currency: string;
  daysOverdue: number;
}

const SYSTEM_PROMPT = `You are the Billing Agent for a small AI agency, drafting a payment
reminder for an overdue invoice. Keep it brief, polite, and assume good
faith (an oversight, not bad intent) unless it's been overdue a long time.
Never threaten legal action or late fees unless told to.`;

export async function draftOverdueReminder(input: DraftReminderInput): Promise<ReminderDraft> {
  const client = getAnthropicClient();

  const message = await client.messages.parse({
    model: CLAUDE_MODEL,
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Client: ${input.clientName}\nAmount due: ${input.amount} ${input.currency}\nDays overdue: ${input.daysOverdue}`,
      },
    ],
    output_config: { format: zodOutputFormat(ReminderDraftSchema) },
  });

  if (message.stop_reason === "refusal") {
    throw new Error("Billing Agent: request was declined by safety classifiers.");
  }
  if (!message.parsed_output) {
    throw new Error("Billing Agent: model did not return a parseable reminder.");
  }

  return message.parsed_output;
}

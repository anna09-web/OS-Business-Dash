import * as z from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import { CLAUDE_MODEL, getAnthropicClient } from "../anthropic-client";

const BuyerReplySchema = z.object({
  draft_reply: z.string().describe("A warm, professional reply ready to send to the buyer."),
  is_negative: z.boolean().describe("True if the buyer's message expresses a complaint, dispute, or negative sentiment."),
});

export type BuyerReplyDraft = z.infer<typeof BuyerReplySchema>;

export interface DraftReplyInput {
  listingTitle: string;
  buyerMessage: string;
}

const SYSTEM_PROMPT = `You are the Support Agent for a Vinted/Depop resale business. Given a
buyer's message about a specific listing, draft a warm, professional reply
the seller can review and send. Never make promises about refunds, returns,
or shipping timelines the seller hasn't authorized — keep those vague and
say "I'll sort this out for you" rather than committing to specifics. Flag
messages that are complaints, disputes, or express dissatisfaction as
negative so the seller reviews them personally.`;

export async function draftBuyerReply(input: DraftReplyInput): Promise<BuyerReplyDraft> {
  const client = getAnthropicClient();

  const message = await client.messages.parse({
    model: CLAUDE_MODEL,
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Listing: ${input.listingTitle}\n\nBuyer message: ${input.buyerMessage}`,
      },
    ],
    output_config: { format: zodOutputFormat(BuyerReplySchema) },
  });

  if (message.stop_reason === "refusal") {
    throw new Error("Support Agent: request was declined by safety classifiers.");
  }
  if (!message.parsed_output) {
    throw new Error("Support Agent: model did not return a parseable reply.");
  }

  return message.parsed_output;
}

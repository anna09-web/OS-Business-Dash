import * as z from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import { CLAUDE_MODEL, getAnthropicClient } from "../anthropic-client";

const ListingDraftSchema = z.object({
  title: z.string().describe("Marketplace-ready listing title, under 80 characters."),
  description: z.string().describe("Honest, specific listing description a buyer would trust."),
  category: z.string().describe("Best-fit clothing/item category."),
  suggested_price: z.number().describe("Suggested list price in the item's currency, as a plain number."),
  keywords: z.array(z.string()).describe("5-10 search keywords buyers would use to find this item."),
});

export type ListingDraft = z.infer<typeof ListingDraftSchema>;

export interface DraftListingInput {
  title: string;
  brand: string | null;
  category: string | null;
  condition: string | null;
  description: string | null;
  costPrice: number;
  marketplace: "vinted" | "depop";
  photoUrl: string | null;
}

const SYSTEM_PROMPT = `You are the Lister Agent for a Vinted/Depop resale business. Given
details about a physical item, draft a listing: a compelling, honest title
and description, the best-fit category, a suggested price, and search
keywords. Never invent condition details, brand, or flaws you weren't told
about or can't see in the photo. Price to sell at a reasonable margin above
cost, informed by typical resale prices for similar items.`;

export async function draftListing(input: DraftListingInput): Promise<ListingDraft> {
  const client = getAnthropicClient();

  const itemSummary = [
    `Title hint: ${input.title}`,
    input.brand && `Brand: ${input.brand}`,
    input.category && `Category hint: ${input.category}`,
    input.condition && `Condition: ${input.condition}`,
    input.description && `Notes: ${input.description}`,
    `Cost price: ${input.costPrice}`,
    `Marketplace: ${input.marketplace}`,
  ]
    .filter(Boolean)
    .join("\n");

  const message = await client.messages.parse({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: input.photoUrl
          ? [
              { type: "image", source: { type: "url", url: input.photoUrl } },
              { type: "text", text: itemSummary },
            ]
          : itemSummary,
      },
    ],
    output_config: { format: zodOutputFormat(ListingDraftSchema) },
  });

  if (message.stop_reason === "refusal") {
    throw new Error("Lister Agent: request was declined by safety classifiers.");
  }
  if (!message.parsed_output) {
    throw new Error("Lister Agent: model did not return a parseable listing draft.");
  }

  return message.parsed_output;
}

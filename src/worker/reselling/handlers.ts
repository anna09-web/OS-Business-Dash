import type { TaskRow } from "../logic";
import type { RegistryEntry, ServiceClient } from "../registry";
import { computeRepriceSuggestion } from "./pricing";
import { draftListing } from "./lister-agent";
import { draftBuyerReply } from "./support-agent";

async function handleDraftListing(task: TaskRow, supabase: ServiceClient) {
  const { inventory_item_id, marketplace } = task.payload as {
    inventory_item_id: string;
    marketplace: "vinted" | "depop";
  };

  const { data: item, error: itemError } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("id", inventory_item_id)
    .single();

  if (itemError || !item) {
    throw new Error(`Inventory item ${inventory_item_id} not found.`);
  }

  let listingId: string;
  const { data: existing } = await supabase
    .from("listings")
    .select("id")
    .eq("inventory_item_id", inventory_item_id)
    .eq("marketplace", marketplace)
    .maybeSingle();

  if (existing) {
    listingId = existing.id;
  } else {
    const { data: created, error: createError } = await supabase
      .from("listings")
      .insert({ inventory_item_id, marketplace, status: "pending_review" })
      .select("id")
      .single();
    if (createError || !created) {
      throw new Error(`Failed to create listing: ${createError?.message}`);
    }
    listingId = created.id;
  }

  const draft = await draftListing({
    title: item.title,
    brand: item.brand,
    category: item.category,
    condition: item.condition,
    description: item.description,
    costPrice: item.cost_price,
    marketplace,
    photoUrl: item.photo_url,
  });

  const { error: approvalError } = await supabase.from("approvals").insert({
    unit: "reselling",
    kind: "listing_draft",
    task_id: task.id,
    title: `Listing draft: ${draft.title}`,
    summary: `${marketplace} · suggested £${draft.suggested_price}`,
    after: { listing_id: listingId, ...draft },
    requested_by: "lister",
  });

  if (approvalError) {
    throw new Error(`Failed to create approval: ${approvalError.message}`);
  }

  return { listing_id: listingId, draft };
}

async function handleRepriceCheck(task: TaskRow, supabase: ServiceClient) {
  const { listing_id } = task.payload as { listing_id: string };

  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("*")
    .eq("id", listing_id)
    .single();

  if (listingError || !listing) {
    throw new Error(`Listing ${listing_id} not found.`);
  }
  if (listing.competitor_price === null || listing.list_price === null) {
    return { skipped: "no competitor price or list price set" };
  }

  const { data: inventoryItem, error: itemError } = await supabase
    .from("inventory_items")
    .select("cost_price")
    .eq("id", listing.inventory_item_id)
    .single();

  if (itemError || !inventoryItem) {
    throw new Error(`Inventory item for listing ${listing_id} not found.`);
  }

  const suggestion = computeRepriceSuggestion({
    costPrice: inventoryItem.cost_price,
    currentPrice: listing.list_price,
    competitorPrice: listing.competitor_price,
    minMarginPct: listing.min_margin_pct,
    maxDiscountPct: listing.max_discount_pct,
  });

  if (suggestion.suggestedPrice === null) {
    return { no_change: true, reason: suggestion.reason };
  }

  const { error: approvalError } = await supabase.from("approvals").insert({
    unit: "reselling",
    kind: "reprice_suggestion",
    task_id: task.id,
    title: `Reprice suggestion: £${listing.list_price} → £${suggestion.suggestedPrice}`,
    summary: suggestion.reason,
    before: { list_price: listing.list_price },
    after: { listing_id, new_price: suggestion.suggestedPrice },
    requested_by: "repricer",
  });

  if (approvalError) {
    throw new Error(`Failed to create approval: ${approvalError.message}`);
  }

  return { suggestion };
}

async function handleDraftReply(task: TaskRow, supabase: ServiceClient) {
  const { buyer_message_id } = task.payload as { buyer_message_id: string };

  const { data: buyerMessage, error: messageError } = await supabase
    .from("buyer_messages")
    .select("*")
    .eq("id", buyer_message_id)
    .single();

  if (messageError || !buyerMessage) {
    throw new Error(`Buyer message ${buyer_message_id} not found.`);
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("title")
    .eq("id", buyerMessage.listing_id)
    .single();

  const listingTitle = listing?.title ?? "the listing";

  const draft = await draftBuyerReply({
    listingTitle,
    buyerMessage: buyerMessage.from_buyer,
  });

  const { error: approvalError } = await supabase.from("approvals").insert({
    unit: "reselling",
    kind: "buyer_reply_draft",
    task_id: task.id,
    title: `Reply draft for "${listingTitle}"`,
    summary: draft.is_negative ? "Flagged: negative sentiment" : undefined,
    after: { buyer_message_id, ...draft },
    requested_by: "support",
  });

  if (approvalError) {
    throw new Error(`Failed to create approval: ${approvalError.message}`);
  }

  return { draft };
}

export const resellingHandlers: Record<string, RegistryEntry> = {
  "reselling:draft_listing": { agent: "lister", handler: handleDraftListing },
  "reselling:reprice_check": { agent: "repricer", handler: handleRepriceCheck },
  "reselling:draft_reply": { agent: "support", handler: handleDraftReply },
};

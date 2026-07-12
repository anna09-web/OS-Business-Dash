"use server";

import { revalidatePath } from "next/cache";

import { getProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import type { Marketplace } from "@/types/database";

async function requireOwner() {
  const profile = await getProfile();
  if (profile.role !== "owner") {
    throw new Error("Only the owner can do this.");
  }
  return profile;
}

function emptyToNull(value: FormDataEntryValue | null): string | null {
  const s = value ? String(value).trim() : "";
  return s.length > 0 ? s : null;
}

export async function addInventoryItem(formData: FormData) {
  await requireOwner();
  const supabase = await createClient();

  const sku = String(formData.get("sku") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  if (!sku || !title) {
    throw new Error("SKU and title are required.");
  }

  const { error } = await supabase.from("inventory_items").insert({
    sku,
    title,
    brand: emptyToNull(formData.get("brand")),
    category: emptyToNull(formData.get("category")),
    condition: emptyToNull(formData.get("condition")),
    description: emptyToNull(formData.get("description")),
    photo_url: emptyToNull(formData.get("photo_url")),
    cost_price: Number(formData.get("cost_price") ?? 0),
    quantity_on_hand: Number(formData.get("quantity_on_hand") ?? 1),
    reorder_point: formData.get("reorder_point") ? Number(formData.get("reorder_point")) : null,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/reselling");
}

function parseCsv(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => line.split(",").map((cell) => cell.trim().replace(/^"(.*)"$/, "$1")));
}

export async function importInventoryCsv(formData: FormData) {
  await requireOwner();
  const supabase = await createClient();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose a CSV file first.");
  }

  const rows = parseCsv(await file.text());
  if (rows.length < 2) {
    return;
  }

  const [header, ...dataRows] = rows;
  const col = (name: string) => header.indexOf(name);
  const skuIdx = col("sku");
  const titleIdx = col("title");
  if (skuIdx === -1 || titleIdx === -1) {
    throw new Error("CSV must have at least 'sku' and 'title' columns.");
  }

  const items = dataRows
    .filter((row) => row[skuIdx]?.trim() && row[titleIdx]?.trim())
    .map((row) => ({
      sku: row[skuIdx].trim(),
      title: row[titleIdx].trim(),
      brand: row[col("brand")]?.trim() || null,
      category: row[col("category")]?.trim() || null,
      condition: row[col("condition")]?.trim() || null,
      cost_price: Number(row[col("cost_price")] || 0),
      quantity_on_hand: Number(row[col("quantity_on_hand")] || 1),
      reorder_point: row[col("reorder_point")] ? Number(row[col("reorder_point")]) : null,
    }));

  if (items.length === 0) {
    return;
  }

  const { error } = await supabase.from("inventory_items").upsert(items, { onConflict: "sku" });
  if (error) throw new Error(error.message);

  revalidatePath("/reselling");
}

export async function requestListingDraft(inventoryItemId: string, marketplace: Marketplace) {
  await requireOwner();
  const supabase = await createClient();

  const { error } = await supabase.from("tasks").insert({
    unit: "reselling",
    type: "draft_listing",
    payload: { inventory_item_id: inventoryItemId, marketplace },
  });
  if (error) throw new Error(error.message);

  revalidatePath("/reselling");
  revalidatePath("/agents");
}

export async function setCompetitorPrice(formData: FormData) {
  await requireOwner();
  const supabase = await createClient();

  const listingId = String(formData.get("listing_id"));
  const price = Number(formData.get("competitor_price"));
  if (!listingId || Number.isNaN(price)) {
    throw new Error("A valid competitor price is required.");
  }

  const { error } = await supabase
    .from("listings")
    .update({ competitor_price: price, updated_at: new Date().toISOString() })
    .eq("id", listingId);
  if (error) throw new Error(error.message);

  revalidatePath("/reselling");
}

export async function requestRepriceCheck(listingId: string) {
  await requireOwner();
  const supabase = await createClient();

  const { error } = await supabase.from("tasks").insert({
    unit: "reselling",
    type: "reprice_check",
    payload: { listing_id: listingId },
  });
  if (error) throw new Error(error.message);

  revalidatePath("/reselling");
  revalidatePath("/agents");
}

export async function markListingActive(formData: FormData) {
  await requireOwner();
  const supabase = await createClient();

  const listingId = String(formData.get("listing_id"));
  const externalUrl = emptyToNull(formData.get("external_url"));
  const now = new Date().toISOString();

  const { data: listing, error } = await supabase
    .from("listings")
    .update({ status: "active", external_url: externalUrl, listed_at: now, updated_at: now })
    .eq("id", listingId)
    .select("inventory_item_id")
    .single();
  if (error) throw new Error(error.message);

  if (listing) {
    await supabase
      .from("inventory_items")
      .update({ status: "listed", updated_at: now })
      .eq("id", listing.inventory_item_id);
  }

  revalidatePath("/reselling");
}

export async function markListingSold(formData: FormData) {
  await requireOwner();
  const supabase = await createClient();

  const listingId = String(formData.get("listing_id"));
  const soldPrice = Number(formData.get("sold_price") ?? 0);
  const fee = formData.get("marketplace_fee") ? Number(formData.get("marketplace_fee")) : null;
  const shipping = formData.get("shipping_cost") ? Number(formData.get("shipping_cost")) : null;
  const now = new Date().toISOString();

  const { data: listing, error } = await supabase
    .from("listings")
    .update({
      status: "sold",
      sold_price: soldPrice,
      marketplace_fee: fee,
      shipping_cost: shipping,
      sold_at: now,
      updated_at: now,
    })
    .eq("id", listingId)
    .select("inventory_item_id")
    .single();
  if (error) throw new Error(error.message);

  if (listing) {
    await supabase
      .from("inventory_items")
      .update({ status: "sold", updated_at: now })
      .eq("id", listing.inventory_item_id);
  }

  revalidatePath("/reselling");
}

export async function addBuyerMessage(formData: FormData) {
  await requireOwner();
  const supabase = await createClient();

  const listingId = String(formData.get("listing_id"));
  const fromBuyer = String(formData.get("from_buyer") ?? "").trim();
  if (!listingId || !fromBuyer) {
    throw new Error("A listing and the buyer's message text are required.");
  }

  const { error } = await supabase
    .from("buyer_messages")
    .insert({ listing_id: listingId, from_buyer: fromBuyer });
  if (error) throw new Error(error.message);

  revalidatePath("/reselling");
}

export async function requestDraftReply(buyerMessageId: string) {
  await requireOwner();
  const supabase = await createClient();

  const { error } = await supabase.from("tasks").insert({
    unit: "reselling",
    type: "draft_reply",
    payload: { buyer_message_id: buyerMessageId },
  });
  if (error) throw new Error(error.message);

  revalidatePath("/reselling");
  revalidatePath("/agents");
}

export async function markBuyerMessageSent(buyerMessageId: string) {
  await requireOwner();
  const supabase = await createClient();

  const { error } = await supabase
    .from("buyer_messages")
    .update({ status: "sent", updated_at: new Date().toISOString() })
    .eq("id", buyerMessageId);
  if (error) throw new Error(error.message);

  revalidatePath("/reselling");
}

import { csvResponse, toCsv } from "@/lib/csv";
import { getProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

const HEADER = [
  "marketplace",
  "sku",
  "title",
  "sold_at",
  "sold_price",
  "cost_price",
  "marketplace_fee",
  "shipping_cost",
  "profit",
];

export async function GET() {
  await getProfile();
  const supabase = await createClient();

  const [{ data: soldListings }, { data: items }] = await Promise.all([
    supabase.from("listings").select("*").eq("status", "sold").order("sold_at", { ascending: false }),
    supabase.from("inventory_items").select("id, sku, cost_price"),
  ]);

  const itemsById = new Map((items ?? []).map((i) => [i.id, i]));

  const rows = (soldListings ?? []).map((listing) => {
    const item = itemsById.get(listing.inventory_item_id);
    const cost = item?.cost_price ?? 0;
    const fee = listing.marketplace_fee ?? 0;
    const shipping = listing.shipping_cost ?? 0;
    const revenue = listing.sold_price ?? 0;
    return [
      listing.marketplace,
      item?.sku ?? "",
      listing.title ?? "",
      listing.sold_at ?? "",
      revenue.toFixed(2),
      cost.toFixed(2),
      fee.toFixed(2),
      shipping.toFixed(2),
      (revenue - cost - fee - shipping).toFixed(2),
    ];
  });

  return csvResponse(toCsv(HEADER, rows), "reselling-pl.csv");
}

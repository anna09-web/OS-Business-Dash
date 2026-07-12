import { NextResponse } from "next/server";

import { getProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

const HEADER = [
  "sku",
  "title",
  "brand",
  "category",
  "condition",
  "cost_price",
  "quantity_on_hand",
  "reorder_point",
  "status",
];

function escapeCsv(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export async function GET() {
  await getProfile();
  const supabase = await createClient();

  const { data } = await supabase
    .from("inventory_items")
    .select("*")
    .order("created_at", { ascending: false });

  const rows = (data ?? []).map((item) => [
    item.sku,
    item.title,
    item.brand ?? "",
    item.category ?? "",
    item.condition ?? "",
    String(item.cost_price),
    String(item.quantity_on_hand),
    item.reorder_point?.toString() ?? "",
    item.status,
  ]);

  const csv = [HEADER, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=inventory.csv",
    },
  });
}

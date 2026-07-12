import { AlertTriangle, Clock, Package, TrendingUp } from "lucide-react";

import {
  addBuyerMessage,
  addInventoryItem,
  importInventoryCsv,
  markBuyerMessageSent,
  markListingActive,
  markListingSold,
  requestDraftReply,
  requestListingDraft,
  requestRepriceCheck,
  setCompetitorPrice,
} from "@/app/actions/reselling";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type InventoryItem = Database["public"]["Tables"]["inventory_items"]["Row"];
type Listing = Database["public"]["Tables"]["listings"]["Row"];

const DEAD_STOCK_DAYS = 30;

export default async function ResellingPage() {
  const profile = await getProfile();
  const isOwner = profile.role === "owner";
  const supabase = await createClient();

  const [{ data: inventory }, { data: listings }, { data: buyerMessages }] = await Promise.all([
    supabase.from("inventory_items").select("*").order("created_at", { ascending: false }),
    supabase.from("listings").select("*").order("updated_at", { ascending: false }),
    supabase.from("buyer_messages").select("*").order("created_at", { ascending: false }),
  ]);

  const inventoryItems = inventory ?? [];
  const allListings = listings ?? [];
  const messages = buyerMessages ?? [];

  const itemsById = new Map(inventoryItems.map((item) => [item.id, item]));
  const listingsById = new Map(allListings.map((l) => [l.id, l]));

  const inventoryValue = inventoryItems
    .filter((i) => i.status === "sourcing" || i.status === "listed")
    .reduce((sum, i) => sum + i.cost_price * i.quantity_on_hand, 0);

  const lowStock = inventoryItems.filter(
    (i) => i.reorder_point !== null && i.quantity_on_hand <= i.reorder_point
  );

  // eslint-disable-next-line react-hooks/purity -- Server Component computed once per request, not re-rendered client-side.
  const now = Date.now();
  const deadStock = allListings.filter(
    (l) =>
      l.status === "active" &&
      l.listed_at &&
      now - new Date(l.listed_at).getTime() > DEAD_STOCK_DAYS * 24 * 60 * 60 * 1000
  );

  const soldListings = allListings.filter((l) => l.status === "sold");
  const plByMarketplace = new Map<string, { revenue: number; cost: number }>();
  let totalRevenue = 0;
  let totalCost = 0;
  for (const l of soldListings) {
    const cost =
      (itemsById.get(l.inventory_item_id)?.cost_price ?? 0) +
      (l.marketplace_fee ?? 0) +
      (l.shipping_cost ?? 0);
    const revenue = l.sold_price ?? 0;
    totalRevenue += revenue;
    totalCost += cost;
    const bucket = plByMarketplace.get(l.marketplace) ?? { revenue: 0, cost: 0 };
    bucket.revenue += revenue;
    bucket.cost += cost;
    plByMarketplace.set(l.marketplace, bucket);
  }
  const totalMargin = totalRevenue - totalCost;

  return (
    <div>
      <PageHeader
        title="Reselling"
        description="Vinted & Depop inventory, listings, and fulfillment. No seller API exists for either marketplace, so listings are drafted here and posted manually."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Inventory value" value={`£${inventoryValue.toFixed(2)}`} icon={Package} />
        <KpiCard
          label="Active listings"
          value={String(allListings.filter((l) => l.status === "active").length)}
          icon={TrendingUp}
        />
        <KpiCard
          label="Low stock"
          value={String(lowStock.length)}
          icon={AlertTriangle}
          accent={lowStock.length ? "warning" : undefined}
        />
        <KpiCard
          label="Dead stock"
          value={String(deadStock.length)}
          icon={Clock}
          accent={deadStock.length ? "warning" : undefined}
        />
      </div>

      <Card className="mb-6">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Profit &amp; loss</CardTitle>
          {isOwner && soldListings.length > 0 && (
            <a href="/reselling/export/pl" className="text-xs text-primary hover:underline">
              Export CSV
            </a>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Revenue</p>
              <p className="text-lg font-semibold tabular-nums">£{totalRevenue.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cost + fees</p>
              <p className="text-lg font-semibold tabular-nums">£{totalCost.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Margin</p>
              <p
                className={`text-lg font-semibold tabular-nums ${totalMargin >= 0 ? "text-success" : "text-destructive"}`}
              >
                £{totalMargin.toFixed(2)}
              </p>
            </div>
          </div>
          {plByMarketplace.size > 0 ? (
            <ul className="mt-4 divide-y divide-border border-t border-border">
              {[...plByMarketplace.entries()].map(([marketplace, { revenue, cost }]) => (
                <li key={marketplace} className="flex items-center justify-between py-2 text-sm">
                  <span className="capitalize">{marketplace}</span>
                  <span className="tabular-nums text-muted-foreground">
                    £{revenue.toFixed(2)} revenue · £{(revenue - cost).toFixed(2)} margin
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 border-t border-border pt-4 text-center text-sm text-muted-foreground">
              No sales recorded yet — P/L fills in once listings are marked sold.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Inventory</CardTitle>
          {isOwner && (
            <a href="/reselling/export" className="text-xs text-primary hover:underline">
              Export CSV
            </a>
          )}
        </CardHeader>
        <CardContent>
          {inventoryItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="pb-2 pr-3 font-medium">SKU</th>
                    <th className="pb-2 pr-3 font-medium">Title</th>
                    <th className="pb-2 pr-3 font-medium">Cost</th>
                    <th className="pb-2 pr-3 font-medium">Qty</th>
                    <th className="pb-2 pr-3 font-medium">Status</th>
                    {isOwner && <th className="pb-2 font-medium">List</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {inventoryItems.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2 pr-3 font-mono text-xs">{item.sku}</td>
                      <td className="py-2 pr-3">
                        {item.title}
                        {item.reorder_point !== null && item.quantity_on_hand <= item.reorder_point && (
                          <Badge variant="warning" className="ml-2">
                            reorder
                          </Badge>
                        )}
                      </td>
                      <td className="py-2 pr-3 tabular-nums">£{item.cost_price.toFixed(2)}</td>
                      <td className="py-2 pr-3 tabular-nums">{item.quantity_on_hand}</td>
                      <td className="py-2 pr-3 capitalize text-muted-foreground">{item.status}</td>
                      {isOwner && (
                        <td className="py-2">
                          <div className="flex gap-1.5">
                            <form action={requestListingDraft.bind(null, item.id, "vinted")}>
                              <Button type="submit" size="sm" variant="outline">
                                Draft: Vinted
                              </Button>
                            </form>
                            <form action={requestListingDraft.bind(null, item.id, "depop")}>
                              <Button type="submit" size="sm" variant="outline">
                                Draft: Depop
                              </Button>
                            </form>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No inventory yet — add an item below or import a CSV.
            </p>
          )}

          {isOwner && (
            <div className="mt-6 grid gap-6 border-t border-border pt-6 sm:grid-cols-2">
              <form action={addInventoryItem} className="flex flex-col gap-3">
                <p className="text-sm font-medium">Add item</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="sku">SKU</Label>
                    <Input id="sku" name="sku" required />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="cost_price">Cost price</Label>
                    <Input id="cost_price" name="cost_price" type="number" step="0.01" defaultValue={0} />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" name="title" required />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="brand">Brand</Label>
                    <Input id="brand" name="brand" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="category">Category</Label>
                    <Input id="category" name="category" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="condition">Condition</Label>
                    <Input id="condition" name="condition" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="quantity_on_hand">Quantity</Label>
                    <Input id="quantity_on_hand" name="quantity_on_hand" type="number" defaultValue={1} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="reorder_point">Reorder point</Label>
                    <Input id="reorder_point" name="reorder_point" type="number" />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="photo_url">Photo URL (optional)</Label>
                  <Input id="photo_url" name="photo_url" placeholder="https://…" />
                </div>
                <Button type="submit" className="mt-1 self-start">
                  Add item
                </Button>
              </form>

              <form action={importInventoryCsv} className="flex flex-col gap-3">
                <p className="text-sm font-medium">Import CSV</p>
                <p className="text-xs text-muted-foreground">
                  Columns: sku, title, brand, category, condition, cost_price,
                  quantity_on_hand, reorder_point. Existing SKUs are updated.
                </p>
                <Input type="file" name="file" accept=".csv" required />
                <Button type="submit" variant="secondary" className="self-start">
                  Import
                </Button>
              </form>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Listings</CardTitle>
        </CardHeader>
        <CardContent>
          {allListings.length > 0 ? (
            <ul className="divide-y divide-border">
              {allListings.map((listing) => (
                <ListingRow
                  key={listing.id}
                  listing={listing}
                  item={itemsById.get(listing.inventory_item_id)}
                  isOwner={isOwner}
                  isDeadStock={deadStock.some((d) => d.id === listing.id)}
                />
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No listings yet. Draft one from an inventory item above.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Buyer messages</CardTitle>
        </CardHeader>
        <CardContent>
          {messages.length > 0 ? (
            <ul className="divide-y divide-border">
              {messages.map((message) => (
                <li key={message.id} className="py-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">
                        {listingsById.get(message.listing_id)?.title ?? "Unknown listing"}
                        {message.is_negative && (
                          <Badge variant="destructive" className="ml-2">
                            negative
                          </Badge>
                        )}
                      </p>
                      <p>{message.from_buyer}</p>
                      {message.draft_reply && (
                        <p className="mt-1 rounded-md bg-muted px-3 py-2 text-muted-foreground">
                          {message.draft_reply}
                        </p>
                      )}
                    </div>
                    {isOwner && message.status === "pending_draft" && (
                      <form action={requestDraftReply.bind(null, message.id)}>
                        <Button type="submit" size="sm" variant="outline">
                          Draft reply
                        </Button>
                      </form>
                    )}
                    {isOwner && message.status === "drafted" && (
                      <form action={markBuyerMessageSent.bind(null, message.id)}>
                        <Button type="submit" size="sm" variant="secondary">
                          Mark sent
                        </Button>
                      </form>
                    )}
                    {message.status === "sent" && (
                      <Badge variant="secondary" className="shrink-0">
                        sent
                      </Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No buyer messages logged yet.
            </p>
          )}

          {isOwner && allListings.length > 0 && (
            <form
              action={addBuyerMessage}
              className="mt-6 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-end"
            >
              <div className="flex flex-1 flex-col gap-1">
                <Label htmlFor="listing_id">Listing</Label>
                <select
                  id="listing_id"
                  name="listing_id"
                  className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                  required
                >
                  {allListings.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title ?? l.id} ({l.marketplace})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <Label htmlFor="from_buyer">Buyer message</Label>
                <Input id="from_buyer" name="from_buyer" required />
              </div>
              <Button type="submit">Log message</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ListingRow({
  listing,
  item,
  isOwner,
  isDeadStock,
}: {
  listing: Listing;
  item: InventoryItem | undefined;
  isOwner: boolean;
  isDeadStock: boolean;
}) {
  return (
    <li className="py-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{listing.title ?? item?.title ?? "Untitled"}</span>
        <Badge variant="outline" className="capitalize">
          {listing.marketplace}
        </Badge>
        <Badge variant={listing.status === "active" ? "success" : "secondary"} className="capitalize">
          {listing.status.replace("_", " ")}
        </Badge>
        {isDeadStock && <Badge variant="warning">dead stock</Badge>}
        {listing.list_price !== null && (
          <span className="text-xs text-muted-foreground">£{listing.list_price.toFixed(2)}</span>
        )}
      </div>

      {isOwner && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <form action={setCompetitorPrice} className="flex items-center gap-1.5">
            <input type="hidden" name="listing_id" value={listing.id} />
            <Input
              name="competitor_price"
              type="number"
              step="0.01"
              placeholder="Competitor £"
              defaultValue={listing.competitor_price ?? undefined}
              className="h-8 w-28"
            />
            <Button type="submit" size="sm" variant="outline">
              Save
            </Button>
          </form>

          {listing.competitor_price !== null && listing.list_price !== null && (
            <form action={requestRepriceCheck.bind(null, listing.id)}>
              <Button type="submit" size="sm" variant="outline">
                Check price
              </Button>
            </form>
          )}

          {listing.status === "draft" && (
            <form action={markListingActive} className="flex items-center gap-1.5">
              <input type="hidden" name="listing_id" value={listing.id} />
              <Input name="external_url" placeholder="Live listing URL" className="h-8 w-40" />
              <Button type="submit" size="sm" variant="secondary">
                Mark active
              </Button>
            </form>
          )}

          {listing.status === "active" && (
            <form action={markListingSold} className="flex items-center gap-1.5">
              <input type="hidden" name="listing_id" value={listing.id} />
              <Input
                name="sold_price"
                type="number"
                step="0.01"
                placeholder="Sold £"
                className="h-8 w-24"
                required
              />
              <Input name="marketplace_fee" type="number" step="0.01" placeholder="Fee £" className="h-8 w-20" />
              <Input
                name="shipping_cost"
                type="number"
                step="0.01"
                placeholder="Ship £"
                className="h-8 w-20"
              />
              <Button type="submit" size="sm" variant="secondary">
                Mark sold
              </Button>
            </form>
          )}
        </div>
      )}
    </li>
  );
}

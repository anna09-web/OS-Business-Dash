import { AlertTriangle, Briefcase, ListChecks, PoundSterling } from "lucide-react";

import {
  addClient,
  addDeliverable,
  addInvoice,
  addOutreachMessage,
  markDeliverableDelivered,
  markInvoicePaid,
  markInvoiceSent,
  markOutreachSent,
  requestDeliverableDraft,
  requestOutreachDraft,
  requestOverdueReminder,
  requestQaReview,
  updateClientStatus,
} from "@/app/actions/agency";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import type { ClientStatus } from "@/types/database";

const PIPELINE: ClientStatus[] = ["lead", "proposal", "active", "delivered", "billed"];

export default async function AgencyPage() {
  const profile = await getProfile();
  const isOwner = profile.role === "owner";
  const supabase = await createClient();

  const [
    { data: clients },
    { data: deliverables },
    { data: outreach },
    { data: invoices },
    { count: pendingApprovalsCount },
  ] = await Promise.all([
    supabase.from("clients").select("*").order("created_at", { ascending: false }),
    supabase.from("deliverables").select("*").order("updated_at", { ascending: false }),
    supabase.from("outreach_messages").select("*").order("updated_at", { ascending: false }),
    supabase.from("invoices").select("*").order("updated_at", { ascending: false }),
    supabase.from("approvals").select("id", { count: "exact", head: true }).eq("unit", "agency").eq("status", "pending"),
  ]);

  const allClients = clients ?? [];
  const allDeliverables = deliverables ?? [];
  const allOutreach = outreach ?? [];
  const allInvoices = invoices ?? [];
  const clientsById = new Map(allClients.map((c) => [c.id, c]));

  const today = new Date();
  const overdueInvoices = allInvoices.filter(
    (i) => i.status === "sent" && i.due_date && new Date(i.due_date) < today
  );
  const pipelineValue = allClients
    .filter((c) => c.status === "lead" || c.status === "proposal")
    .reduce((sum, c) => sum + (c.value ?? 0), 0);

  return (
    <div>
      <PageHeader
        title="AI Agency"
        description="Client pipeline, deliverables, outreach, and billing. Every client-facing or financial draft goes through approval before you send it."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Active clients"
          value={String(allClients.filter((c) => c.status === "active").length)}
          icon={Briefcase}
        />
        <KpiCard label="Pipeline value" value={`£${pipelineValue.toFixed(2)}`} icon={PoundSterling} />
        <KpiCard
          label="Overdue invoices"
          value={String(overdueInvoices.length)}
          icon={AlertTriangle}
          accent={overdueInvoices.length ? "warning" : undefined}
        />
        <KpiCard label="Pending approvals" value={String(pendingApprovalsCount ?? 0)} icon={ListChecks} />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Client pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {PIPELINE.map((stage) => (
              <div key={stage} className="min-w-0">
                <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {stage} ({allClients.filter((c) => c.status === stage).length})
                </p>
                <ul className="flex flex-col gap-2">
                  {allClients
                    .filter((c) => c.status === stage)
                    .map((client) => (
                      <li key={client.id} className="glass rounded-md p-2.5 text-sm">
                        <p className="truncate font-medium">{client.name}</p>
                        {client.value !== null && (
                          <p className="text-xs text-muted-foreground">£{client.value.toFixed(2)}</p>
                        )}
                        {isOwner && (
                          <form action={updateClientStatus} className="mt-1.5">
                            <input type="hidden" name="client_id" value={client.id} />
                            <select
                              name="status"
                              defaultValue={client.status}
                              onChange={(e) => e.currentTarget.form?.requestSubmit()}
                              className="h-7 w-full rounded-md border border-input bg-transparent px-1.5 text-xs"
                            >
                              {PIPELINE.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </form>
                        )}
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>

          {isOwner && (
            <form
              action={addClient}
              className="mt-6 grid gap-3 border-t border-border pt-6 sm:grid-cols-2 lg:grid-cols-4"
            >
              <div className="flex flex-col gap-1">
                <Label htmlFor="name">Client name</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="contact_name">Contact name</Label>
                <Input id="contact_name" name="contact_name" />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="contact_email">Contact email</Label>
                <Input id="contact_email" name="contact_email" type="email" />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="value">Deal value</Label>
                <Input id="value" name="value" type="number" step="0.01" />
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-3">
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" name="notes" placeholder="Context the Outreach Agent can use" />
              </div>
              <Button type="submit" className="self-end">
                Add client
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Deliverables</CardTitle>
        </CardHeader>
        <CardContent>
          {allDeliverables.length > 0 ? (
            <ul className="divide-y divide-border">
              {allDeliverables.map((d) => (
                <li key={d.id} className="py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{d.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {clientsById.get(d.client_id)?.name ?? "Unknown client"}
                    </span>
                    <Badge variant="outline" className="capitalize">
                      {d.kind}
                    </Badge>
                    <Badge variant={d.status === "delivered" ? "success" : "secondary"} className="capitalize">
                      {d.status.replace("_", " ")}
                    </Badge>
                  </div>
                  {d.draft_content && (
                    <p className="mt-1.5 line-clamp-3 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                      {d.draft_content}
                    </p>
                  )}
                  {d.qa_notes && (
                    <p className="mt-1.5 whitespace-pre-line rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-xs">
                      {d.qa_notes}
                    </p>
                  )}
                  {isOwner && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <form action={requestDeliverableDraft.bind(null, d.id)}>
                        <Button type="submit" size="sm" variant="outline">
                          Draft with AI
                        </Button>
                      </form>
                      {d.kind === "code" && (
                        <form action={requestQaReview.bind(null, d.id)}>
                          <Button type="submit" size="sm" variant="outline">
                            QA review
                          </Button>
                        </form>
                      )}
                      {d.status !== "delivered" && (
                        <form action={markDeliverableDelivered.bind(null, d.id)}>
                          <Button type="submit" size="sm" variant="secondary">
                            Mark delivered
                          </Button>
                        </form>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">No deliverables yet.</p>
          )}

          {isOwner && allClients.length > 0 && (
            <form action={addDeliverable} className="mt-6 grid gap-3 border-t border-border pt-6 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="d_client_id">Client</Label>
                <select
                  id="d_client_id"
                  name="client_id"
                  className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                  required
                >
                  {allClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="kind">Kind</Label>
                <select
                  id="kind"
                  name="kind"
                  className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                  defaultValue="content"
                >
                  <option value="content">Content</option>
                  <option value="code">Code</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" required />
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <Label htmlFor="brief">Brief</Label>
                <Input id="brief" name="brief" placeholder="What should this deliverable cover?" />
              </div>
              <Button type="submit" className="self-start">
                Add deliverable
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Outreach</CardTitle>
        </CardHeader>
        <CardContent>
          {allOutreach.length > 0 ? (
            <ul className="divide-y divide-border">
              {allOutreach.map((message) => (
                <li key={message.id} className="py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      {clientsById.get(message.client_id)?.name ?? "Unknown client"}
                    </span>
                    <Badge variant="outline" className="capitalize">
                      {message.channel}
                    </Badge>
                    <Badge variant={message.status === "sent" ? "success" : "secondary"} className="capitalize">
                      {message.status.replace("_", " ")}
                    </Badge>
                  </div>
                  {message.draft_body && (
                    <div className="mt-1.5 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                      {message.subject && <p className="mb-1 font-medium text-foreground">{message.subject}</p>}
                      <p className="whitespace-pre-line">{message.draft_body}</p>
                    </div>
                  )}
                  {isOwner && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {message.status === "pending_draft" && (
                        <form action={requestOutreachDraft.bind(null, message.id)}>
                          <Button type="submit" size="sm" variant="outline">
                            Draft with AI
                          </Button>
                        </form>
                      )}
                      {message.status === "drafted" && (
                        <form action={markOutreachSent.bind(null, message.id)}>
                          <Button type="submit" size="sm" variant="secondary">
                            Mark sent
                          </Button>
                        </form>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">No outreach messages yet.</p>
          )}

          {isOwner && allClients.length > 0 && (
            <form
              action={addOutreachMessage}
              className="mt-6 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-end"
            >
              <div className="flex flex-1 flex-col gap-1">
                <Label htmlFor="o_client_id">Client</Label>
                <select
                  id="o_client_id"
                  name="client_id"
                  className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                  required
                >
                  {allClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="channel">Channel</Label>
                <select
                  id="channel"
                  name="channel"
                  className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                  defaultValue="email"
                >
                  <option value="email">Email</option>
                  <option value="dm">DM</option>
                </select>
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <Label htmlFor="to_contact">To (optional)</Label>
                <Input id="to_contact" name="to_contact" />
              </div>
              <Button type="submit">Queue message</Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {allInvoices.length > 0 ? (
            <ul className="divide-y divide-border">
              {allInvoices.map((invoice) => {
                const isOverdue =
                  invoice.status === "sent" && invoice.due_date && new Date(invoice.due_date) < today;
                return (
                  <li key={invoice.id} className="py-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">
                        {clientsById.get(invoice.client_id)?.name ?? "Unknown client"}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {invoice.amount.toFixed(2)} {invoice.currency}
                      </span>
                      <Badge variant={invoice.status === "paid" ? "success" : "secondary"} className="capitalize">
                        {invoice.status}
                      </Badge>
                      {isOverdue && <Badge variant="destructive">overdue</Badge>}
                      {invoice.due_date && (
                        <span className="text-xs text-muted-foreground">due {invoice.due_date}</span>
                      )}
                    </div>
                    {invoice.reminder_draft && (
                      <p className="mt-1.5 whitespace-pre-line rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                        {invoice.reminder_draft}
                      </p>
                    )}
                    {isOwner && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {invoice.status === "draft" && (
                          <form action={markInvoiceSent.bind(null, invoice.id)}>
                            <Button type="submit" size="sm" variant="outline">
                              Mark sent
                            </Button>
                          </form>
                        )}
                        {invoice.status !== "paid" && (
                          <form action={markInvoicePaid.bind(null, invoice.id)}>
                            <Button type="submit" size="sm" variant="secondary">
                              Mark paid
                            </Button>
                          </form>
                        )}
                        {isOverdue && !invoice.reminder_draft && (
                          <form action={requestOverdueReminder.bind(null, invoice.id)}>
                            <Button type="submit" size="sm" variant="outline">
                              Draft reminder
                            </Button>
                          </form>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">No invoices yet.</p>
          )}

          {isOwner && allClients.length > 0 && (
            <form
              action={addInvoice}
              className="mt-6 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-end"
            >
              <div className="flex flex-1 flex-col gap-1">
                <Label htmlFor="i_client_id">Client</Label>
                <select
                  id="i_client_id"
                  name="client_id"
                  className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                  required
                >
                  {allClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="amount">Amount</Label>
                <Input id="amount" name="amount" type="number" step="0.01" required className="w-28" />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="due_date">Due date</Label>
                <Input id="due_date" name="due_date" type="date" />
              </div>
              <Button type="submit">Create invoice</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

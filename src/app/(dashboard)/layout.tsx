import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { getProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Ensures every route under this layout is authenticated; redirects to
  // /login otherwise. Role-specific gating happens per-page via requireRole().
  await getProfile();

  const supabase = await createClient();
  const { data: areas } = await supabase
    .from("business_areas")
    .select("*")
    .order("sort_order", { ascending: true });

  return (
    <div className="flex min-h-svh">
      <Sidebar areas={areas ?? []} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

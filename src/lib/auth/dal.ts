import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Database, UserRole } from "@/types/database";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

// Memoized per request: safe to call from multiple layouts/pages without
// triggering duplicate auth round-trips.
export const verifySession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { userId: user.id, email: user.email! };
});

export const getProfile = cache(async (): Promise<Profile> => {
  const session = await verifySession();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.userId)
    .single();

  if (error || !data) {
    redirect("/login");
  }

  return data;
});

export async function requireRole(role: UserRole) {
  const profile = await getProfile();
  if (profile.role !== role) {
    redirect("/dashboard");
  }
  return profile;
}

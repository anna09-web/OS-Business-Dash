"use server";

import { revalidatePath } from "next/cache";

import { getProfile } from "@/lib/auth/dal";
import { isManuallyUnlockable } from "@/lib/business-areas";
import { createClient } from "@/lib/supabase/server";
import type { BusinessAreaSlug } from "@/types/database";

export async function unlockBusinessArea(slug: BusinessAreaSlug) {
  const profile = await getProfile();
  if (profile.role !== "owner") {
    throw new Error("Only the owner can unlock a business area.");
  }

  const supabase = await createClient();
  const { data: area, error: fetchError } = await supabase
    .from("business_areas")
    .select("*")
    .eq("slug", slug)
    .single();

  if (fetchError || !area) {
    throw new Error(fetchError?.message ?? "Business area not found.");
  }

  if (!isManuallyUnlockable(area)) {
    throw new Error(
      area.unlock_at
        ? "This area is date-gated and unlocks on its own — it can't be unlocked early."
        : "This area is already unlocked."
    );
  }

  const { error } = await supabase
    .from("business_areas")
    .update({ locked: false, updated_at: new Date().toISOString() })
    .eq("slug", slug);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  revalidatePath(`/business/${slug}`);
}

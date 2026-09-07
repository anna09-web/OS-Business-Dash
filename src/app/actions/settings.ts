"use server";

import { revalidatePath } from "next/cache";

import { getProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export async function setAutomationsPaused(paused: boolean) {
  const profile = await getProfile();
  if (profile.role !== "owner") {
    throw new Error("Only the owner can use the kill switch.");
  }
  const supabase = await createClient();

  const { error } = await supabase
    .from("system_settings")
    .update({
      automations_paused: paused,
      paused_at: paused ? new Date().toISOString() : null,
      paused_by: paused ? profile.id : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

export async function updateFullName(fullName: string) {
  const profile = await getProfile();
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", profile.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings");
}

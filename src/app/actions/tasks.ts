"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";

import { getProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import type { BusinessAreaSlug, TaskPriority, TaskStatus } from "@/types/database";

const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  priority: z.enum(["low", "medium", "high"]),
  due_date: z.string().optional(),
  business_area: z.string().optional(),
});

export async function createTask(formData: FormData) {
  const profile = await getProfile();
  if (profile.role !== "owner") {
    throw new Error("Only the owner can create tasks.");
  }

  const parsed = createTaskSchema.safeParse({
    title: formData.get("title"),
    priority: formData.get("priority") ?? "medium",
    due_date: formData.get("due_date") || undefined,
    business_area: formData.get("business_area") || undefined,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("tasks").insert({
    title: parsed.data.title,
    priority: parsed.data.priority as TaskPriority,
    due_date: parsed.data.due_date ?? null,
    business_area: (parsed.data.business_area as BusinessAreaSlug | undefined) ?? null,
    created_by: profile.id,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  if (parsed.data.business_area) {
    revalidatePath(`/business/${parsed.data.business_area}`);
  }
}

export async function setTaskStatus(id: string, status: TaskStatus) {
  const profile = await getProfile();
  if (profile.role !== "owner") {
    throw new Error("Only the owner can update tasks.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidatePath("/business/[slug]", "page");
}

export async function deleteTask(id: string) {
  const profile = await getProfile();
  if (profile.role !== "owner") {
    throw new Error("Only the owner can delete tasks.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidatePath("/business/[slug]", "page");
}

"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";

import { getProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import type { TransactionType } from "@/types/database";

const createTransactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  category: z.string().trim().min(1, "Category is required."),
  description: z.string().optional(),
  amount: z.coerce.number().positive("Amount must be greater than zero."),
  occurred_on: z.string().optional(),
});

export async function createTransaction(formData: FormData) {
  const profile = await getProfile();
  if (profile.role !== "owner") {
    throw new Error("Only the owner can record transactions.");
  }

  const parsed = createTransactionSchema.safeParse({
    type: formData.get("type"),
    category: formData.get("category"),
    description: formData.get("description") || undefined,
    amount: formData.get("amount"),
    occurred_on: formData.get("occurred_on") || undefined,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("transactions").insert({
    type: parsed.data.type as TransactionType,
    category: parsed.data.category,
    description: parsed.data.description ?? null,
    amount: parsed.data.amount,
    occurred_on: parsed.data.occurred_on ?? undefined,
    created_by: profile.id,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/finances");
  revalidatePath("/dashboard");
}

export async function deleteTransaction(id: string) {
  const profile = await getProfile();
  if (profile.role !== "owner") {
    throw new Error("Only the owner can delete transactions.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("transactions").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/finances");
  revalidatePath("/dashboard");
}

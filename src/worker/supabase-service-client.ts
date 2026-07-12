import { createClient } from "@supabase/supabase-js";

import type { Database } from "../types/database";

// Service-role client for the Manager Agent worker only. This bypasses row
// level security, so it must never run in the browser or be given to an
// agent's prompt/context — it's read by this standalone process alone.
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to run the worker."
    );
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

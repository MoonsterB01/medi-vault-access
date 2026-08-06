import type { SupabaseClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";

/**
 * MediVault privacy rule: the MCP connector may only ever expose records the
 * signed-in user personally owns, plus patients explicitly shared with them
 * through an active family-access grant.
 *
 * RLS alone is NOT enough here — a user who also happens to be hospital staff,
 * a doctor or an admin would otherwise be able to pull unrelated patients'
 * records through an AI assistant. This scope is applied on top of RLS so the
 * connector never widens beyond personal + explicitly-granted access.
 */
export async function accessiblePatientIds(
  supabase: SupabaseClient,
  ctx: ToolContext,
): Promise<string[]> {
  const userId = ctx.getUserId();
  if (!userId) return [];

  const [owned, family] = await Promise.all([
    supabase.from("patients").select("id").eq("created_by", userId),
    supabase
      .from("family_access")
      .select("patient_id")
      .eq("family_user_id", userId)
      .eq("is_active", true)
      .is("revoked_at", null),
  ]);

  const ids = new Set<string>();
  for (const row of owned.data ?? []) if (row?.id) ids.add(row.id as string);
  for (const row of family.data ?? []) if (row?.patient_id) ids.add(row.patient_id as string);
  return [...ids];
}

export const NO_ACCESS_MESSAGE =
  "No accessible records. This connector only exposes your own patient profiles and family accounts explicitly shared with you.";

export const NOT_ALLOWED_MESSAGE =
  "Not found, or this record does not belong to you or a family account shared with you.";

// Shared auth helpers for edge functions.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface CallerContext {
  /** True when the call is service-role (server-to-server). RLS-bypassing. */
  isServiceRole: boolean;
  /** Authenticated user id (when not service-role). */
  userId: string | null;
}

/**
 * Authenticate an incoming edge function request.
 * Accepts either:
 *   - Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>  (internal calls)
 *   - Authorization: Bearer <user JWT>                   (end users)
 * Returns null if unauthenticated.
 */
export async function authenticateRequest(req: Request): Promise<CallerContext | null> {
  const header = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  if (!token) return null;

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceRoleKey && token === serviceRoleKey) {
    return { isServiceRole: true, userId: null };
  }

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anonKey) return null;

  const client = createClient(url, anonKey);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) return null;
  return { isServiceRole: false, userId: data.user.id };
}

export function unauthorized(corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function forbidden(corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify({ error: "Forbidden" }), {
    status: 403,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Verifies the caller owns (created) the given patient. Service-role bypasses. */
export async function assertOwnsPatient(
  adminClient: any,
  caller: CallerContext,
  patientId: string,
): Promise<boolean> {
  if (caller.isServiceRole) return true;
  if (!caller.userId) return false;
  const { data } = await adminClient
    .from("patients")
    .select("id")
    .eq("id", patientId)
    .eq("created_by", caller.userId)
    .maybeSingle();
  return !!data;
}

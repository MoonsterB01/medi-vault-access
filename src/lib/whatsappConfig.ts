import { supabase } from "@/integrations/supabase/client";

/**
 * Single source of truth for the WhatsApp Business number used in deep links.
 *
 * Resolution order:
 *   1. `app_config` row with key `whatsapp_business_number` (runtime override, no redeploy needed)
 *   2. `VITE_WHATSAPP_BUSINESS_NUMBER` env var (build-time default)
 *   3. empty string (caller should disable the WhatsApp CTA)
 *
 * The returned value is digits only (no `+`, spaces, or dashes), ready for `wa.me/<number>`.
 */

const ENV_DEFAULT =
  (import.meta.env.VITE_WHATSAPP_BUSINESS_NUMBER as string | undefined) ?? "";

let cached: string | null = null;
let inflight: Promise<string> | null = null;

function normalize(raw: string | null | undefined): string {
  if (!raw) return "";
  const digits = raw.replace(/[^\d]/g, "");
  return digits;
}

export async function getWhatsAppBusinessNumber(): Promise<string> {
  if (cached !== null) return cached;
  if (inflight) return inflight;

  inflight = (async () => {
    let value = normalize(ENV_DEFAULT);
    try {
      const { data } = await supabase
        .from("app_config")
        .select("value")
        .eq("key", "whatsapp_business_number")
        .maybeSingle();
      const fromDb = normalize(data?.value);
      if (fromDb) value = fromDb;
    } catch {
      // fall back to env default
    }
    cached = value;
    return value;
  })();

  return inflight;
}

export function buildWhatsAppDeepLink(number: string, text: string): string {
  const n = normalize(number);
  const t = encodeURIComponent(text);
  return `https://wa.me/${n}?text=${t}`;
}

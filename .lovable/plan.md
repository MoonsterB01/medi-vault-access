## Why it's hardcoded today

In `src/pages/Settings.tsx` (line 762) the WABA number is inlined:

```ts
const waNumber = '918112244532';
window.open(`https://wa.me/${waNumber}?text=${message}`, '_blank');
```

It was written this way during the initial WhatsApp wiring as a quick way to get the deep link working. There is no shared config, no env var, and no DB row, so the string lives in exactly one component. If Meta ever issues a new WABA number (or we add a second region/sandbox number), the deep link silently points at the old number and every "Connect via WhatsApp" click fails — with no error, because `wa.me` happily opens any number.

## Goal

One source of truth for the WABA number, readable from both the frontend (Settings deep link) and edge functions (webhook replies, future templates), changeable without redeploying the app.

## Approach

Two layers, used together:

1. **Build-time default via Vite env** — `VITE_WHATSAPP_BUSINESS_NUMBER` in `.env`. Safe to expose (the number is public on `wa.me` anyway). Gives us a working default on every environment.
2. **Runtime override via `app_config` table** — a tiny key/value table read once on Settings mount. Lets us rotate the number from the Supabase dashboard with zero code change. Falls back to the env value if the row is missing.

Edge functions read the same value from a non-prefixed secret `WHATSAPP_BUSINESS_NUMBER` (already the convention for `WHATSAPP_VERIFY_TOKEN` etc.), so the webhook side is consistent.

## Changes

### 1. Frontend config module — `src/lib/whatsappConfig.ts` (new)
- Exports `getWhatsAppBusinessNumber()` that:
  - Reads `import.meta.env.VITE_WHATSAPP_BUSINESS_NUMBER` as default.
  - Queries `app_config` for key `whatsapp_business_number`; if present, returns it.
  - Strips `+`, spaces, dashes; validates it's digits only.
- Exports `buildWhatsAppDeepLink(number, text)` helper.

### 2. `.env`
- Add `VITE_WHATSAPP_BUSINESS_NUMBER="918112244532"` (current value, so behavior is unchanged on day one).

### 3. `app_config` table (new, tiny)
- `key text primary key`, `value text not null`, `updated_at timestamptz`.
- RLS: `SELECT` allowed to `anon` and `authenticated` (values are non-secret display config); `INSERT/UPDATE/DELETE` only via `service_role`.
- GRANTs included per the public-schema rule.
- Seed row: `('whatsapp_business_number', '918112244532')`.

### 4. `src/pages/Settings.tsx`
- Remove the inline `const waNumber = '918112244532'`.
- Call `getWhatsAppBusinessNumber()` (cached in a `useEffect` on mount) and use it in the deep link.
- If the lookup returns empty, disable the "Connect via WhatsApp" button with a tooltip ("WhatsApp number not configured — contact support").

### 5. Edge function side (no behavior change today, just consistency)
- Add `WHATSAPP_BUSINESS_NUMBER` to the secrets list expected by `whatsapp-webhook` (used later for outbound template sends). No code change in the webhook itself in this pass.

## Out of scope for this pass
- Moving OTP generation server-side, signature verification, phone normalization — already tracked from the earlier WhatsApp audit.
- Multi-number / per-region routing. The `app_config` row makes this trivial to add later (swap to a JSON value).

## Files touched
- `src/lib/whatsappConfig.ts` (new)
- `src/pages/Settings.tsx` (replace hardcoded number)
- `.env` (add `VITE_WHATSAPP_BUSINESS_NUMBER`)
- New migration: create `app_config` + GRANTs + RLS + seed row

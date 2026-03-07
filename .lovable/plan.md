

# MediBot WhatsApp Integration Plan

## How It Works

WhatsApp Business API (via Meta Cloud API) sends webhook events to a Supabase Edge Function whenever a user messages the MediBot WhatsApp number. The edge function processes files and text, links them to the user's MediVault account via phone number, and triggers the existing analysis pipeline.

```text
User sends file/message on WhatsApp
        │
        ▼
Meta Cloud API → Webhook POST
        │
        ▼
Supabase Edge Function: whatsapp-webhook
        │
        ├─ File message → Download media → Upload to storage
        │                  → Run AI analysis → Save to documents table
        │                  → Reply with summary on WhatsApp
        │
        ├─ Text message → Route to medibot-chat
        │                → Reply with AI response on WhatsApp
        │
        └─ "link" command → Generate OTP → Link phone to account
```

---

## Implementation Steps

### 1. Database: Phone linking table

New `whatsapp_links` table to map WhatsApp phone numbers to MediVault user accounts:
- `id`, `user_id` (FK to auth.users), `phone_number` (unique), `verified` (boolean), `otp_code`, `otp_expires_at`, `created_at`
- RLS: users can manage their own rows

### 2. Edge Function: `whatsapp-webhook`

Single edge function handling:
- **GET**: Webhook verification (Meta sends a challenge token)
- **POST**: Incoming messages
  - **Text "link [code]"**: Verify OTP and link phone to account
  - **Text (general)**: Look up user by phone → call `medibot-chat` logic → reply via WhatsApp API
  - **Media (image/PDF/doc)**: Download from Meta API → base64 → call existing `upload-document` pipeline → reply with confirmation + summary

Requires secrets: `WHATSAPP_VERIFY_TOKEN` (custom string), `WHATSAPP_ACCESS_TOKEN` (from Meta), `WHATSAPP_PHONE_NUMBER_ID` (from Meta).

### 3. Settings Page: WhatsApp Linking UI

Add a "WhatsApp Integration" section to the existing Settings page:
- Input field for phone number
- "Send OTP" button → generates a 6-digit code, stores in `whatsapp_links`
- "Enter OTP" field → user enters code they receive (or types `link CODE` in WhatsApp)
- Shows linked status with option to unlink

### 4. Reply Function

Helper to send WhatsApp replies using the Meta Cloud API:
```
POST https://graph.facebook.com/v21.0/{phone_number_id}/messages
Authorization: Bearer {access_token}
Body: { messaging_product: "whatsapp", to: phone, type: "text", text: { body: message } }
```

### 5. Config Updates

- `supabase/config.toml`: Add `[functions.whatsapp-webhook]` with `verify_jwt = false` (webhook from Meta, not authenticated)
- Secrets needed: `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`

---

## Files to Create/Edit

| File | Action |
|------|--------|
| DB migration | Create `whatsapp_links` table with RLS |
| `supabase/functions/whatsapp-webhook/index.ts` | New edge function for webhook |
| `supabase/config.toml` | Add webhook function config |
| `src/pages/Settings.tsx` | Add WhatsApp linking section |

---

## Prerequisites (User Action Required)

Before implementation can work end-to-end, you need:

1. **Meta Business Account** with WhatsApp Business API access
2. **WhatsApp Business Phone Number** registered in Meta Developer Console
3. **Access Token** and **Phone Number ID** from Meta Cloud API
4. Set the webhook URL to: `https://qiqepumdtaozjzfjbggl.supabase.co/functions/v1/whatsapp-webhook`

I can build all the code infrastructure now, and once you provide the Meta API credentials, the integration will be live.


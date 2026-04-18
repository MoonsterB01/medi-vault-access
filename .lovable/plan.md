

## Family Access — Complete Workflow Plan

### Roles
- **P** = Patient whose account is being managed (owns the data)
- **F** = Family member who gains access via P's Patient Shareable ID (PID)

### Core Flow
1. F opens **Family Access** tab → enters P's PID → clicks "Link Account"
2. System validates PID, creates an **active** access link (no approval needed per your spec)
3. **P receives a notification** ("F now has access to your records") — P can revoke anytime
4. F can now switch context to manage P's account

---

### Database Design (safe, no recursion)

**New table: `family_access`** (rebuilt cleanly)
- `id` uuid PK
- `patient_id` uuid (P — the owner)
- `family_user_id` uuid (F — the helper)
- `granted_at` timestamptz
- `revoked_at` timestamptz nullable
- `is_active` boolean default true
- `permissions` jsonb → `{ view: true, upload: true, appointments: true }`
- UNIQUE (patient_id, family_user_id)

**Critical lesson from past failure**: All RLS policies on `family_access` and policies on other tables that reference family access will use **SECURITY DEFINER functions** — never inline subqueries to `family_access` inside `family_access`'s own policies. We will:
- Create `public.user_has_family_access(_user_id uuid, _patient_id uuid)` returns boolean
- Create `public.get_family_accessible_patient_ids()` returns table of uuid
- Use these in all dependent policies (documents, appointments, summaries, etc.)

**RLS on `family_access` itself** (simple, no self-reference):
- F can INSERT rows where `family_user_id = auth.uid()`
- F can SELECT/DELETE their own rows (`family_user_id = auth.uid()`) — this is "leave"
- P can SELECT/UPDATE/DELETE rows where they own the patient (`patient_id IN (SELECT id FROM patients WHERE created_by = auth.uid())`) — this is "revoke"

**Extending existing table policies** (additive, won't break current ones):
For `documents`, `appointments`, `patient_summaries`, `patients` — add new policies using the security definer helper so F gets read/write per granted permissions. Existing owner policies remain untouched.

---

### UI Components

**1. Family Access tab** (`#family` — already in sidebar)
- Two sub-sections:
  - **"People I'm Helping"** — list of patients F is linked to (revoke = leave)
  - **"People With Access to My Records"** — list of family members who can manage P's account (P can revoke)
- "Add Family Member" button → dialog asking for PID → validates → creates link → toasts success

**2. Account Switcher** (header, top-right of AppLayout)
- Dropdown showing: "My Account (current)" + linked patients
- Switching sets a context (React Context + localStorage `activePatientId`)
- All data hooks (`fetchPatientData`, summary, documents, appointments) read from active context, not just `auth.uid()`'s own patient
- Visual indicator (banner): "Viewing P's account — Family access mode" with "Switch back" button

**3. Notification to P**
- Use existing `notifications` table + `create_notification` RPC
- Type: `family_access_granted`, message: "F now has access to your medical records"
- Shows in NotificationCenter bell

---

### Permission Enforcement
F's allowed actions when context = P:
- ✅ View all records, summary, appointments
- ✅ Upload documents (uploaded_by = F's id, patient_id = P's id)
- ✅ Book/manage appointments for P
- ❌ Cannot edit P's demographics
- ❌ Cannot grant access to others
- ❌ Cannot delete P's account or remove other family links

---

### Edge Function: `link-family-access`
Validates PID → confirms patient exists → prevents self-linking → prevents duplicates → inserts family_access row → calls `create_notification` for P → returns success.

(Direct insert from client also works via RLS, but edge function gives us a clean place for validation + notification + audit logging.)

---

### Safety Measures (avoiding past disaster)

```text
┌─────────────────────────────────────────────────┐
│  RLS Recursion Prevention Strategy              │
├─────────────────────────────────────────────────┤
│  family_access policies → NEVER reference       │
│    family_access table inside themselves        │
│                                                 │
│  Other tables → use SECURITY DEFINER helper:    │
│    user_has_family_access(uid, patient_id)      │
│                                                 │
│  Helper function uses STABLE + SET search_path  │
│  → bypasses RLS, no recursion possible          │
└─────────────────────────────────────────────────┘
```

- Migration will be **additive only** — no DROP on existing policies
- New policies have unique names (e.g., "Family helpers can view documents")
- Tested helper function before applying dependent policies
- Self-link prevention: P cannot link their own PID to themselves

---

### Implementation Order (when approved)
1. **Migration**: Create `family_access` table + 2 security definer helpers + RLS on family_access
2. **Migration**: Add additive RLS policies on documents, appointments, patient_summaries, patients (read+write for family helpers)
3. **Edge function**: `link-family-access` (validation + notification)
4. **Frontend Context**: `ActivePatientContext` provider in `AppLayout`
5. **UI**: Family Access tab content (`FamilyAccessTab.tsx`) with both sub-sections + add dialog
6. **UI**: Account switcher dropdown in header + "viewing as" banner
7. **Refactor data hooks**: `fetchPatientData`, `usePatientSummary`, etc. to honor active patient context
8. **Wire notifications**: Verify P sees the access-granted notification

---

### Open Risks (called out, not blockers)
- Switching active patient must reset all React Query caches (`queryClient.clear()` on switch) to avoid stale data leaking between accounts
- Document uploads in family-mode must store F's `uploaded_by` for audit trail (already supported by schema)
- Mobile sidebar / bottom nav needs the same switcher for parity


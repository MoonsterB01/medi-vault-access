import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import logo from "@/assets/logo.png";

type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

/**
 * supabase-js v2 does not (yet) expose `supabase.auth.oauth`. When it is
 * missing we talk to the GoTrue OAuth 2.1 authorization endpoints directly.
 */
async function restCall(path: string, init?: RequestInit) {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/oauth/authorizations/${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
    });
    const text = await res.text();
    const body = text ? JSON.parse(text) : {};
    if (!res.ok) {
      return {
        data: null,
        error: {
          message:
            body?.error_description ??
            body?.msg ??
            body?.message ??
            `Authorization server returned ${res.status}.`,
        },
      };
    }
    return { data: body, error: null };
  } catch (e: any) {
    return { data: null, error: { message: e?.message ?? "Network error" } };
  }
}

function oauth(): OAuthApi {
  const sdk = (supabase.auth as unknown as { oauth?: Partial<OAuthApi> }).oauth;
  return {
    getAuthorizationDetails: (id) =>
      typeof sdk?.getAuthorizationDetails === "function"
        ? sdk.getAuthorizationDetails(id)
        : restCall(encodeURIComponent(id)),
    approveAuthorization: (id) =>
      typeof sdk?.approveAuthorization === "function"
        ? sdk.approveAuthorization(id)
        : restCall(`${encodeURIComponent(id)}/consent`, {
            method: "POST",
            body: JSON.stringify({ action: "approve" }),
          }),
    denyAuthorization: (id) =>
      typeof sdk?.denyAuthorization === "function"
        ? sdk.denyAuthorization(id)
        : restCall(`${encodeURIComponent(id)}/consent`, {
            method: "POST",
            body: JSON.stringify({ action: "deny" }),
          }),
  };
}

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Missing authorization_id");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      const { data, error: detailsError } = await oauth().getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (detailsError) {
        setError(detailsError.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error: decideError } = approve
      ? await oauth().approveAuthorization(authorizationId)
      : await oauth().denyAuthorization(authorizationId);
    if (decideError) {
      setBusy(false);
      setError(decideError.message);
      return;
    }
    let target = data?.redirect_url ?? data?.redirect_to;
    if (!target && !approve) {
      // Fall back to a standards-compliant access_denied response.
      const redirectUri = details?.redirect_uri ?? params.get("redirect_uri");
      if (redirectUri) {
        const url = new URL(redirectUri);
        url.searchParams.set("error", "access_denied");
        url.searchParams.set("error_description", "The user denied the authorization request.");
        const state = details?.state ?? params.get("state");
        if (state) url.searchParams.set("state", state);
        target = url.toString();
      }
    }
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? params.get("client_name") ?? "this app";
  const scopeString: string =
    details?.scope ?? (Array.isArray(details?.scopes) ? details.scopes.join(" ") : "") ?? params.get("scope") ?? "";
  const scopes = scopeString.split(/[\s,]+/).filter(Boolean);

  const scopeLabels: Record<string, string> = {
    openid: "Verify your identity",
    profile: "Read your basic profile",
    email: "Read your email address",
    offline_access: "Stay connected when you're away",
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <img src={logo} alt="MediVault" className="h-10 w-auto mx-auto" />
          {error ? (
            <>
              <CardTitle className="text-xl">Could not load this request</CardTitle>
              <CardDescription className="break-words">{error}</CardDescription>
            </>
          ) : !details ? (
            <>
              <CardTitle className="text-xl">Loading…</CardTitle>
              <CardDescription>Checking this connection request.</CardDescription>
            </>
          ) : (
            <>
              <CardTitle className="text-xl">Connect {clientName} to MediVault?</CardTitle>
              <CardDescription>
                {clientName} will be able to read your MediVault records — patients, documents and
                appointments — as you. You can disconnect it at any time.
              </CardDescription>
            </>
          )}
        </CardHeader>
        {details && !error && (
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">This app is requesting access to:</p>
              <ul className="space-y-1.5">
                {(scopes.length ? scopes : ["Your MediVault records (read-only)"]).map((s) => (
                  <li key={s} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span className="break-words">{scopeLabels[s] ?? s}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>
                Allow
              </Button>
              <Button className="flex-1" variant="outline" disabled={busy} onClick={() => decide(false)}>
                Deny
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    </main>
  );
}

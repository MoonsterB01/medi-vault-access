// Shared diagnostic utilities for edge functions
export const createRequestId = () => crypto.randomUUID();

export function maskHeaderValue(name: string, value: string | null): string | null {
  if (!value) return value;
  const lower = name.toLowerCase();
  if (lower.includes('authorization') || lower.includes('cookie') || lower.includes('token')) {
    return value.slice(0, 6) + '...' + value.slice(-4);
  }
  return value;
}

export function logRequest(requestId: string, req: Request) {
  const headersObj: Record<string, string | null> = {};
  for (const [k, v] of req.headers) {
    headersObj[k] = maskHeaderValue(k, v);
  }

  console.log(JSON.stringify({
    requestId,
    ts: new Date().toISOString(),
    method: req.method,
    url: new URL(req.url).pathname,
    query: new URL(req.url).search,
    headers: headersObj,
    userAgent: req.headers.get('user-agent') || null,
    ip: req.headers.get('x-forwarded-for') || null,
    contentLength: req.headers.get('content-length') || 'unknown'
  }));
}

export function logResponse(requestId: string, status: number, body?: any) {
  console.log(JSON.stringify({
    requestId,
    ts: new Date().toISOString(),
    status,
    responseBodyPreview: typeof body === 'string' ? body.slice(0, 200) : undefined
  }));
}

export function logAuthDiagnostics(requestId: string, req: Request) {
  const authHeader = req.headers.get('authorization') || null;
  const cookieHeader = req.headers.get('cookie') || null;
  
  console.log(JSON.stringify({
    requestId,
    hasAuthorization: Boolean(authHeader),
    hasCookie: Boolean(cookieHeader),
    authType: authHeader?.split(' ')[0] || null,
    cookieCount: cookieHeader?.split(';').length || 0
  }));
}

export function corsHeaders(origin?: string | null) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, X-Requested-With, X-Supabase-Auth, X-Client-Info, apikey',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '600'
  };
}

export async function parseRequestBody(req: Request, requestId: string): Promise<any> {
  try {
    const ct = req.headers.get('content-type') || '';
    
    if (ct.includes('application/json')) {
      return await req.json();
    } else if (ct.includes('application/x-www-form-urlencoded')) {
      const text = await req.text();
      return Object.fromEntries(new URLSearchParams(text));
    } else if (ct.includes('text/plain')) {
      return await req.text();
    } else if (ct.includes('multipart/form-data')) {
      return await req.formData();
    } else {
      // Unknown content type, try JSON first
      console.log(JSON.stringify({ requestId, warning: 'unknown_content_type', contentType: ct }));
      return await req.json();
    }
  } catch (err: any) {
    console.log(JSON.stringify({ 
      requestId, 
      error: 'invalid_body_format', 
      message: err.message,
      contentType: req.headers.get('content-type')
    }));
    throw new Error(`Invalid request body format: ${err.message}`);
  }
}

export function logDbQuery(requestId: string, table: string, operation: string, error: any, rowCount?: number) {
  console.log(JSON.stringify({
    requestId,
    dbQuery: {
      table,
      operation,
      error: error ? error.message : null,
      errorCode: error?.code,
      rowsReturned: rowCount ?? 0,
      timestamp: new Date().toISOString()
    }
  }));
}

export function logStorageOperation(requestId: string, bucket: string, operation: string, path: string, error: any, success: boolean) {
  console.log(JSON.stringify({
    requestId,
    storageOperation: {
      bucket,
      operation,
      path,
      error: error ? error.message : null,
      success,
      timestamp: new Date().toISOString()
    }
  }));
}

export function createErrorResponse(requestId: string, status: number, error: string, details?: string, origin?: string | null) {
  const body = JSON.stringify({ error, details, requestId });
  logResponse(requestId, status, body);
  return new Response(body, {
    status,
    headers: { 
      'Content-Type': 'application/json',
      ...corsHeaders(origin)
    }
  });
}

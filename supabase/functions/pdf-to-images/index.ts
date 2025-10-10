import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // This function is deprecated - PDF to images conversion now happens client-side
  // Server-side canvas rendering is not supported in Supabase Edge Functions
  console.log('pdf-to-images endpoint called - returning not implemented');
  
  return new Response(JSON.stringify({
    success: false,
    error: 'Server-side PDF to images conversion is not available. Use client-side conversion instead.',
    message: 'This endpoint has been deprecated. PDF conversion now happens in the browser using PDF.js.'
  }), {
    status: 501,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

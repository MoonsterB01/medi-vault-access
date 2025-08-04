import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: req.headers.get('Authorization')!,
        },
      },
    });

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { patientId, familyMemberEmail, canView = true } = await req.json();

    if (!patientId || !familyMemberEmail) {
      return new Response(JSON.stringify({ error: 'Patient ID and family member email are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user info
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('hospital_id, role')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the patient exists and user has access
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id, name, hospital_id')
      .eq('id', patientId)
      .single();

    if (patientError || !patient) {
      return new Response(JSON.stringify({ error: 'Patient not found or access denied' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Only hospital staff can grant access for patients in their hospital
    if (userData.role === 'hospital_staff' && patient.hospital_id !== userData.hospital_id) {
      return new Response(JSON.stringify({ error: 'Access denied: Patient not in your hospital' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find the family member by email
    const { data: familyMember, error: familyError } = await supabase
      .from('users')
      .select('id, name, role')
      .eq('email', familyMemberEmail)
      .single();

    if (familyError || !familyMember) {
      return new Response(JSON.stringify({ error: 'Family member not found. They need to sign up first.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if family member has appropriate role
    if (!['family_member', 'patient'].includes(familyMember.role)) {
      return new Response(JSON.stringify({ error: 'User must have family_member or patient role' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create or update family access
    const { data: accessData, error: accessError } = await supabase
      .from('family_access')
      .upsert({
        patient_id: patientId,
        user_id: familyMember.id,
        can_view: canView,
        granted_by: user.id,
      }, {
        onConflict: 'patient_id,user_id',
      })
      .select()
      .single();

    if (accessError) {
      console.error('Access grant error:', accessError);
      return new Response(JSON.stringify({ error: 'Failed to grant access' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send notification to family member
    try {
      // Here you could integrate with email service like Resend
      // For now, we'll just log the notification
      console.log(`Notification: Access granted to ${familyMemberEmail} for patient ${patient.name}`);
      
      // You could call another edge function for email notification here
      // await supabase.functions.invoke('send-notification-email', {
      //   body: {
      //     to: familyMemberEmail,
      //     patientName: patient.name,
      //     accessType: canView ? 'view' : 'no view',
      //   }
      // });
    } catch (notificationError) {
      console.warn('Notification failed:', notificationError);
      // Don't fail the access grant if notification fails
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Access ${canView ? 'granted' : 'revoked'} for ${familyMember.name}`,
      access: accessData,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in grant-access-to-family function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
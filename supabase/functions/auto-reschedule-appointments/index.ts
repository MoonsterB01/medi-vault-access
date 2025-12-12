import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    console.log('Starting auto-reschedule check...');
    
    // Get current IST time
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + now.getTimezoneOffset() * 60000 + istOffset);
    const istDateStr = istNow.toISOString().split('T')[0];
    const istTimeStr = istNow.toTimeString().slice(0, 8);
    
    console.log(`Current IST: ${istDateStr} ${istTimeStr}`);
    
    // Find pending appointments that are past their scheduled time
    // and haven't been confirmed
    const { data: expiredAppointments, error: fetchError } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_id,
        doctor_id,
        patient_id,
        appointment_date,
        appointment_time,
        appointment_type,
        chief_complaint,
        patient_notes,
        created_by,
        patients(name, created_by),
        doctors(user_id, users(name))
      `)
      .eq('status', 'pending')
      .or(`appointment_date.lt.${istDateStr},and(appointment_date.eq.${istDateStr},appointment_time.lt.${istTimeStr})`);
    
    if (fetchError) {
      console.error('Error fetching expired appointments:', fetchError);
      throw fetchError;
    }
    
    console.log(`Found ${expiredAppointments?.length || 0} expired pending appointments`);
    
    const results = {
      processed: 0,
      rescheduled: 0,
      failed: 0,
      details: [] as any[]
    };
    
    for (const appointment of expiredAppointments || []) {
      results.processed++;
      
      try {
        // Find next available slot for the same doctor
        const { data: nextSlot, error: slotError } = await supabase
          .rpc('find_next_available_slot', {
            p_doctor_id: appointment.doctor_id,
            p_min_date: istDateStr
          });
        
        if (slotError || !nextSlot || nextSlot.length === 0) {
          console.log(`No available slot found for appointment ${appointment.appointment_id}`);
          results.failed++;
          results.details.push({
            appointment_id: appointment.appointment_id,
            status: 'no_slot_available',
            error: slotError?.message || 'No slots found'
          });
          continue;
        }
        
        const newSlot = nextSlot[0];
        const oldDate = appointment.appointment_date;
        const oldTime = appointment.appointment_time;
        
        // Update the appointment with new date/time
        const { error: updateError } = await supabase
          .from('appointments')
          .update({
            appointment_date: newSlot.slot_date,
            appointment_time: newSlot.start_time,
            rescheduled_from: appointment.id,
            notes: `Auto-rescheduled from ${oldDate} ${oldTime} due to no confirmation`,
            updated_at: new Date().toISOString()
          })
          .eq('id', appointment.id);
        
        if (updateError) {
          console.error(`Failed to update appointment ${appointment.appointment_id}:`, updateError);
          results.failed++;
          results.details.push({
            appointment_id: appointment.appointment_id,
            status: 'update_failed',
            error: updateError.message
          });
          continue;
        }
        
        // Increment slot booking for new slot
        await supabase.rpc('increment_slot_booking', {
          p_doctor_id: appointment.doctor_id,
          p_slot_date: newSlot.slot_date,
          p_start_time: newSlot.start_time
        });
        
        // Decrement old slot booking (if it exists)
        await supabase.rpc('decrement_slot_booking', {
          p_doctor_id: appointment.doctor_id,
          p_slot_date: oldDate,
          p_start_time: oldTime
        });
        
        // Send notification to patient
        const patientUserId = appointment.patients?.created_by;
        if (patientUserId) {
          const doctorName = appointment.doctors?.users?.name || 'your doctor';
          
          await supabase.rpc('create_notification', {
            target_user_id: patientUserId,
            notification_title: 'Appointment Rescheduled',
            notification_message: `Your appointment with ${doctorName} on ${oldDate} at ${oldTime} has been automatically rescheduled to ${newSlot.slot_date} at ${newSlot.start_time} as it was not confirmed in time.`,
            notification_type: 'appointment_rescheduled',
            appointment_id_param: appointment.id,
            metadata_param: {
              old_date: oldDate,
              old_time: oldTime,
              new_date: newSlot.slot_date,
              new_time: newSlot.start_time,
              reason: 'auto_reschedule_no_confirmation'
            }
          });
        }
        
        // Optionally notify the doctor
        const doctorUserId = appointment.doctors?.user_id;
        if (doctorUserId) {
          const patientName = appointment.patients?.name || 'A patient';
          
          await supabase.rpc('create_notification', {
            target_user_id: doctorUserId,
            notification_title: 'Appointment Auto-Rescheduled',
            notification_message: `${patientName}'s appointment was automatically rescheduled from ${oldDate} ${oldTime} to ${newSlot.slot_date} ${newSlot.start_time} due to pending confirmation.`,
            notification_type: 'appointment_rescheduled',
            appointment_id_param: appointment.id,
            metadata_param: {
              old_date: oldDate,
              old_time: oldTime,
              new_date: newSlot.slot_date,
              new_time: newSlot.start_time,
              reason: 'auto_reschedule_no_confirmation'
            }
          });
        }
        
        results.rescheduled++;
        results.details.push({
          appointment_id: appointment.appointment_id,
          status: 'rescheduled',
          old_datetime: `${oldDate} ${oldTime}`,
          new_datetime: `${newSlot.slot_date} ${newSlot.start_time}`
        });
        
        console.log(`Rescheduled ${appointment.appointment_id} from ${oldDate} ${oldTime} to ${newSlot.slot_date} ${newSlot.start_time}`);
        
      } catch (err: any) {
        console.error(`Error processing appointment ${appointment.appointment_id}:`, err);
        results.failed++;
        results.details.push({
          appointment_id: appointment.appointment_id,
          status: 'error',
          error: err.message
        });
      }
    }
    
    console.log('Auto-reschedule completed:', results);
    
    return new Response(JSON.stringify({
      success: true,
      ...results,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error: any) {
    console.error('Auto-reschedule error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

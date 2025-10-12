import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { documentId, patientId } = await req.json();

    if (!patientId) {
      return new Response(JSON.stringify({ error: 'patientId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // If a documentId is provided, process the new document
    if (documentId) {
        const { data: document, error: docError } = await supabase
          .from('documents')
          .select('extracted_entities, uploaded_at, document_type, id')
          .eq('id', documentId)
          .single();

        if (docError || !document) {
          throw new Error(`Failed to fetch document ${documentId}: ${docError?.message}`);
        }

        const newEntities = document.extracted_entities || {};
        const today = new Date().toISOString().split('T')[0];

        // --- Core Logic: Write to Structured Tables ---

        // Process Diagnoses
        if (newEntities.diagnoses && Array.isArray(newEntities.diagnoses)) {
            for (const newDiag of newEntities.diagnoses) {
                const name = (newDiag.name || newDiag).toLowerCase();
                const { data: existing } = await supabase.from('diagnoses').select('id, source_docs').eq('patient_id', patientId).ilike('name', name).single();
                if (existing) {
                    const updatedSourceDocs = [...(existing.source_docs || []), { docId: documentId, confidence: newDiag.confidence || 0.8 }];
                    await supabase.from('diagnoses').update({ lastSeen: today, source_docs: updatedSourceDocs }).eq('id', existing.id);
                } else {
                    await supabase.from('diagnoses').insert({ patient_id: patientId, name: newDiag.name || newDiag, status: 'active', firstSeen: today, lastSeen: today, severity: newDiag.severity || 'undetermined', source_docs: [{ docId: documentId, confidence: newDiag.confidence || 0.8 }] });
                }
            }
        }

        // Process Medications
        if (newEntities.medications && Array.isArray(newEntities.medications)) {
            for (const newMed of newEntities.medications) {
                const name = (newMed.name || newMed).toLowerCase();
                const { data: existing } = await supabase.from('medications').select('id, source_docs').eq('patient_id', patientId).ilike('name', name).single();
                if (existing) {
                    const updatedSourceDocs = [...(existing.source_docs || []), { docId: documentId, confidence: newMed.confidence || 0.8 }];
                    await supabase.from('medications').update({ status: 'active', source_docs: updatedSourceDocs }).eq('id', existing.id);
                } else {
                    await supabase.from('medications').insert({ patient_id: patientId, name: newMed.name || newMed, status: 'active', startDate: today, dose: newMed.dose || 'not specified', frequency: newMed.frequency || 'not specified', source_docs: [{ docId: documentId, confidence: newMed.confidence || 0.8 }] });
                }
            }
        }

        // Process Labs
        if (newEntities.labs && Array.isArray(newEntities.labs)) {
            const labInserts = newEntities.labs.map((newLab: any) => ({
                patient_id: patientId,
                test_name: newLab.test,
                value: newLab.value,
                date: newLab.date || today,
                source_doc: documentId,
            }));
            await supabase.from('labs').insert(labInserts);
        }

        // Process Visits
        if (newEntities.visits && Array.isArray(newEntities.visits)) {
            const visitInserts = newEntities.visits.map((newVisit: any) => ({
                patient_id: patientId,
                date: newVisit.date || today,
                doctor: newVisit.doctor || 'Unknown',
                reason: newVisit.reason || 'Unknown',
                documents: [documentId],
            }));
            await supabase.from('visits').insert(visitInserts);
        }

        // Process Alerts
        if (newEntities.alerts && Array.isArray(newEntities.alerts)) {
            const alertInserts = newEntities.alerts.map((newAlert: any) => ({
                patient_id: patientId,
                level: newAlert.level || 'info',
                message: newAlert.message,
                evidence_docs: [documentId],
            }));
            await supabase.from('alerts').insert(alertInserts);
        }
    }


    // --- Generate Summary JSON from Structured Tables ---

    const { data: allDiagnoses, error: diagnosesError } = await supabase.from('diagnoses').select('*').eq('patient_id', patientId).is('hidden_by_user', false);
    const { data: allMedications, error: medicationsError } = await supabase.from('medications').select('*').eq('patient_id', patientId).is('hidden_by_user', false);
    const { data: allLabs, error: labsError } = await supabase.from('labs').select('*').eq('patient_id', patientId);
    const { data: allVisits, error: visitsError } = await supabase.from('visits').select('*').eq('patient_id', patientId);
    const { data: allAlerts, error: alertsError } = await supabase.from('alerts').select('*').eq('patient_id', patientId);
    const { data: allCorrections, error: correctionsError } = await supabase.from('manual_corrections').select('*').eq('patient_id', patientId);
    const { data: allDocuments, error: documentsError } = await supabase.from('documents').select('id, document_type, uploaded_at').eq('patient_id', patientId);


    // --- Apply Manual Corrections ---
    if (allCorrections) {
        for (const correction of allCorrections) {
            const { fieldPath, newValue } = correction;
            const fieldParts = fieldPath.split('.');
            if (fieldParts.length === 3) {
                const arrayName = fieldParts[0];
                const itemId = fieldParts[1];
                const propertyName = fieldParts[2];

                let targetArray;
                if(arrayName === 'diagnoses') targetArray = allDiagnoses;
                else if(arrayName === 'medications') targetArray = allMedications;

                if (targetArray) {
                    const itemIndex = targetArray.findIndex((item: any) => item.id === itemId);
                    if (itemIndex !== -1) {
                        targetArray[itemIndex][propertyName] = newValue;
                    }
                }
            }
        }
    }


    const { data: existingSummary, error: summaryError } = await supabase
        .from('patient_summaries')
        .select('version')
        .eq('patient_id', patientId)
        .single();

    const newVersion = (existingSummary?.version || 0) + 1;

    // --- Build AI Summary ---
    const activeDiagnoses = (allDiagnoses || []).filter(d => d.status === 'active').map(d => d.name).join(', ');
    const activeMeds = (allMedications || []).filter(m => m.status === 'active').map(m => m.name).join(', ');

    let oneLine = 'No significant findings.';
    if(activeDiagnoses) oneLine = `Patient has records related to: ${activeDiagnoses}.`;
    if(activeMeds) oneLine += ` Current medications include: ${activeMeds}.`

    const aiSummary = {
      oneLine: oneLine,
      paragraph: "Detailed AI summary is pending further analysis.",
      confidence: 0.8,
    };


    const patientSummary = {
      patientId: patientId,
      version: newVersion,
      generatedAt: new Date().toISOString(),
      diagnoses: allDiagnoses || [],
      medications: allMedications || [],
      labs: { latest: allLabs || [], trends: {} },
      visits: allVisits || [],
      alerts: allAlerts || [],
      sources: {
          documentCount: allDocuments?.length || 0,
          documents: (allDocuments || []).map(d => ({id: d.id, type: d.document_type, uploadedAt: d.uploaded_at}))
      },
      aiSummary: aiSummary,
      manualCorrections: allCorrections || [],
    };

    // --- Update the patient_summaries table ---

    await supabase.from('patient_summaries').upsert({
        patient_id: patientId,
        summary: patientSummary,
        version: newVersion,
        updated_at: new Date().toISOString(),
    });


    return new Response(JSON.stringify({ success: true, newVersion }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Error in generate-patient-summary function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

serve(handler);
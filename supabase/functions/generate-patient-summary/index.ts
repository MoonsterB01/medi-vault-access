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

    // Validate UUID format for patientId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(patientId)) {
      return new Response(JSON.stringify({ error: 'Invalid patient ID format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Validate documentId if provided
    if (documentId && !uuidRegex.test(documentId)) {
      return new Response(JSON.stringify({ error: 'Invalid document ID format' }), {
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
                lastCheckup: newEntities.entities?.lastCheckup
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

        // Process Critical Alerts from Gemini
        if (newEntities.criticalAlerts && Array.isArray(newEntities.criticalAlerts)) {
            const alertInserts = newEntities.criticalAlerts.map((newAlert: any) => ({
                patient_id: patientId,
                level: newAlert.severity === 'high' ? 'critical' : 'warning',
                message: newAlert.message,
                evidence_docs: [documentId],
            }));
            await supabase.from('alerts').insert(alertInserts);
        }

        // Process Patient Info
        if (newEntities.patientInfo) {
            const { data: patient, error } = await supabase
                .from('patients')
                .select('name, dob, gender')
                .eq('id', patientId)
                .single();

            if (patient) {
                const updates: any = {};
                if (!patient.name && newEntities.patientInfo.name) {
                    updates.name = newEntities.patientInfo.name;
                }
                if (!patient.dob && newEntities.patientInfo.dob) {
                    updates.dob = newEntities.patientInfo.dob;
                }
                if (!patient.gender && newEntities.patientInfo.gender) {
                    updates.gender = newEntities.patientInfo.gender;
                }

                if (Object.keys(updates).length > 0) {
                    await supabase.from('patients').update(updates).eq('id', patientId);
                }
            }
        }
    }


  // 3. Fetch all document AI summaries
  const { data: allDocuments } = await supabase
    .from('documents')
    .select('id, filename, ai_summary, summary_confidence, document_type, uploaded_at')
    .eq('patient_id', patientId)
    .not('ai_summary', 'is', null)
    .order('uploaded_at', { ascending: false });

  // 4. Fetch all structured data
  const { data: allDiagnoses, error: diagnosesError } = await supabase.from('diagnoses').select('*').eq('patient_id', patientId).is('hidden_by_user', false);
  const { data: allMedications, error: medicationsError } = await supabase.from('medications').select('*').eq('patient_id', patientId).is('hidden_by_user', false);
  const { data: allLabs, error: labsError } = await supabase.from('labs').select('*').eq('patient_id', patientId);
  const { data: allVisits, error: visitsError } = await supabase.from('visits').select('*').eq('patient_id', patientId);
  const { data: allAlerts, error: alertsError } = await supabase.from('alerts').select('*').eq('patient_id', patientId);
  const { data: allCorrections, error: correctionsError } = await supabase.from('manual_corrections').select('*').eq('patient_id', patientId);
  const { data: allDocumentsList, error: documentsError } = await supabase.from('documents').select('id, document_type, uploaded_at').eq('patient_id', patientId);


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

    // --- Build AI Summary using Lovable AI ---
    const activeDiagnoses = (allDiagnoses || []).filter(d => d.status === 'active');
    const activeMeds = (allMedications || []).filter(m => m.status === 'active');
    const recentLabs = (allLabs || []).slice(-5); // Last 5 lab results
    const recentVisits = (allVisits || []).slice(-3); // Last 3 visits

    // Build comprehensive context from document summaries  
    const documentSummaries = (allDocuments || [])
      .filter(d => d.ai_summary && d.ai_summary.trim())
      .map(d => `[${d.document_type || 'Document'} - ${d.filename}]:\n${d.ai_summary}`)
      .join('\n\n');

    // Create context for AI
    const medicalContext = `
=== PATIENT DOCUMENTS & SUMMARIES ===
${documentSummaries || 'No document summaries available yet.'}

=== STRUCTURED MEDICAL DATA ===
- Active Diagnoses: ${activeDiagnoses.map(d => `${d.name} (${d.severity})`).join(', ') || 'None'}
- Active Medications: ${activeMeds.map(m => `${m.name} ${m.dose} ${m.frequency}`).join(', ') || 'None'}
- Recent Lab Results: ${recentLabs.map(l => `${l.test_name}: ${l.value} (${l.date})`).join(', ') || 'None'}
- Recent Visits: ${recentVisits.map(v => `${v.date} with ${v.doctor} for ${v.reason}`).join(', ') || 'None'}
- Active Alerts: ${(allAlerts || []).filter(a => !a.resolved).map(a => a.message).join(', ') || 'None'}
`.trim();

    let aiSummary = {
      oneLine: 'No medical documents uploaded yet.',
      paragraph: 'Upload your medical documents to generate a comprehensive health summary.',
      confidence: 0.0,
    };

    // Only generate AI summary if we have meaningful data
    const hasDocumentSummaries = documentSummaries && documentSummaries.trim().length > 0;
    const hasStructuredData = activeDiagnoses.length > 0 || activeMeds.length > 0 || recentLabs.length > 0;

    // Generate AI summary if there's meaningful data
    if (hasDocumentSummaries || hasStructuredData) {
      try {
        const systemPrompt = `You are a medical AI creating a comprehensive patient health summary. 
Synthesize information from multiple medical documents and structured data into a cohesive narrative.
Create a complete picture of the patient's medical story.

RESPONSE FORMAT:
Line 1: One-sentence overview (max 150 characters) covering the most critical findings.
Lines 2+: 2-4 sentence detailed summary covering:
- Key diagnoses and conditions
- Current treatments and medications
- Recent medical events and findings
- Important lab results
- Any critical alerts or concerns

Be concise, accurate, and prioritize actionable medical information.`;

        const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
        if (LOVABLE_API_KEY) {
          const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Create a comprehensive patient health summary from this data:\n\n${medicalContext}` }
              ],
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            const fullSummary = aiData.choices?.[0]?.message?.content || '';
            const lines = fullSummary.split('\n').filter((l: string) => l.trim());
            
            // Calculate confidence based on data completeness
            const dataCompleteness = 
              (hasDocumentSummaries ? 0.5 : 0) + 
              (activeDiagnoses.length > 0 ? 0.2 : 0) +
              (activeMeds.length > 0 ? 0.15 : 0) +
              (recentLabs.length > 0 ? 0.1 : 0) +
              (recentVisits.length > 0 ? 0.05 : 0);
            
            aiSummary = {
              oneLine: lines[0] || 'No significant findings.',
              paragraph: lines.slice(1).join(' ').trim() || 'Upload more documents for a detailed summary.',
              confidence: Math.min(dataCompleteness, 0.95),
            };
            console.log('AI summary generated successfully with confidence:', aiSummary.confidence);
          } else {
            console.error('AI API error:', aiResponse.status);
            aiSummary = {
              oneLine: 'Unable to generate summary at this time.',
              paragraph: 'Please try again later or contact support if the issue persists.',
              confidence: 0.0
            };
          }
        }
      } catch (aiError) {
        console.error('Error generating AI summary:', aiError);
        aiSummary = {
          oneLine: 'Error generating summary.',
          paragraph: 'An error occurred while creating your health summary. Please try again.',
          confidence: 0.0
        };
      }
    }


    const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('name, dob, gender')
        .eq('id', patientId)
        .single();

    const patientSummary = {
      patientId: patientId,
      patientInfo: {
        name: patient?.name,
        dob: patient?.dob,
        gender: patient?.gender,
      },
      version: newVersion,
      generatedAt: new Date().toISOString(),
      diagnoses: allDiagnoses || [],
      medications: allMedications || [],
      labs: { latest: allLabs || [], trends: {} },
      visits: allVisits || [],
      alerts: allAlerts || [],
      sources: {
          documentCount: allDocumentsList?.length || 0,
          documents: (allDocumentsList || []).map(d => ({id: d.id, type: d.document_type, uploadedAt: d.uploaded_at}))
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
    console.error('[INTERNAL] Error in generate-patient-summary:', error.name);
    return new Response(JSON.stringify({ error: 'An error occurred generating the summary' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

serve(handler);
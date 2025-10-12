import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import { v5 } from "https://deno.land/std@0.190.0/uuid/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Full PatientSummary interface based on the provided schema
interface PatientSummary {
  patientId: string;
  generatedAt: string;
  version: number;
  sources: {
    documentCount: number;
    lastDocumentId?: string;
    documents: { id: string; type?: string; uploadedAt: string }[];
  };
  diagnoses: Diagnosis[];
  medications: Medication[];
  labs: Labs;
  visits: Visit[];
  alerts: Alert[];
  aiSummary?: AISummary;
  manualCorrections?: Correction[];
  meta?: any;
}

interface Diagnosis {
  id: string;
  name: string;
  severity: string;
  status: 'active' | 'inactive' | 'resolved';
  firstSeen: string;
  lastSeen: string;
  sourceDocs: { docId: string; confidence: number }[];
}

interface Medication {
  id: string;
  name: string;
  dose: string;
  frequency: string;
  status: 'active' | 'inactive' | 'stopped';
  startDate: string;
  sourceDocs: { docId: string; confidence: number }[];
}

interface Labs {
    latest: { test: string; value: string; date: string, sourceDoc: string }[];
    trends: Record<string, { date: string; value: number }[]>;
}

interface Visit {
    visitId: string;
    date: string;
    doctor: string;
    reason: string;
    documents: string[];
}

interface Alert {
    id: string;
    level: 'critical' | 'warning' | 'info';
    message: string;
}

interface AISummary {
    oneLine: string;
    paragraph: string;
    confidence: number;
}

interface Correction {
    field: string;
    userId: string;
    action: 'edited' | 'hidden';
    valueBefore: any;
    valueAfter: any;
    timestamp: string;
}

const NAMESPACE_UUID = "6ba7b810-9dad-11d1-80b4-00c04fd430c8"; // Example namespace

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

    if (!documentId || !patientId) {
      return new Response(JSON.stringify({ error: 'documentId and patientId are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

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

    const { data: existingSummary, error: summaryError } = await supabase
      .from('patient_summaries')
      .select('summary, version')
      .eq('patient_id', patientId)
      .single();

    if (summaryError && summaryError.code !== 'PGRST116') {
      throw new Error(`Failed to fetch patient summary: ${summaryError.message}`);
    }

    const currentSummary: PatientSummary = existingSummary?.summary || {
      patientId: patientId,
      version: 0,
      diagnoses: [],
      medications: [],
      labs: { latest: [], trends: {} },
      visits: [],
      alerts: [],
      sources: { documentCount: 0, documents: [] },
      generatedAt: new Date().toISOString()
    };

    const newVersion = (existingSummary?.version || 0) + 1;

    // --- Core Merging Logic ---

    // Merge Diagnoses
    if (newEntities.diagnoses && Array.isArray(newEntities.diagnoses)) {
      for (const newDiag of newEntities.diagnoses) {
        const name = (newDiag.name || newDiag).toLowerCase();
        const existingDiag = currentSummary.diagnoses.find(d => d.name.toLowerCase() === name);
        if (existingDiag) {
          existingDiag.lastSeen = today;
          existingDiag.sourceDocs.push({ docId: documentId, confidence: newDiag.confidence || 0.8 });
        } else {
          currentSummary.diagnoses.push({
            id: await v5.generate(NAMESPACE_UUID, new TextEncoder().encode(name)),
            name: newDiag.name || newDiag,
            status: 'active',
            firstSeen: today,
            lastSeen: today,
            severity: newDiag.severity || 'undetermined',
            sourceDocs: [{ docId: documentId, confidence: newDiag.confidence || 0.8 }],
          });
        }
      }
    }

    // Merge Medications
    if (newEntities.medications && Array.isArray(newEntities.medications)) {
        for (const newMed of newEntities.medications) {
            const name = (newMed.name || newMed).toLowerCase();
            const existingMed = currentSummary.medications.find(m => m.name.toLowerCase() === name);
            if (existingMed) {
                existingMed.status = 'active';
                existingMed.startDate = existingMed.startDate || today; // Keep original start date
                existingMed.sourceDocs.push({ docId: documentId, confidence: newMed.confidence || 0.8 });
            } else {
                currentSummary.medications.push({
                    id: await v5.generate(NAMESPACE_UUID, new TextEncoder().encode(name)),
                    name: newMed.name || newMed,
                    status: 'active',
                    startDate: today,
                    dose: newMed.dose || 'not specified',
                    frequency: newMed.frequency || 'not specified',
                    sourceDocs: [{ docId: documentId, confidence: newMed.confidence || 0.8 }],
                });
            }
        }
    }

    // Update Sources
    currentSummary.sources.documentCount = (currentSummary.sources.documentCount || 0) + 1;
    currentSummary.sources.documents.push({
        id: document.id,
        type: document.document_type,
        uploadedAt: document.uploaded_at,
    });

    // Generate AI Summary
    const activeDiagnoses = currentSummary.diagnoses.filter(d => d.status === 'active').map(d => d.name).join(', ');
    const activeMeds = currentSummary.medications.filter(m => m.status === 'active').map(m => m.name).join(', ');

    let oneLine = 'No significant findings.';
    if(activeDiagnoses) oneLine = `Patient has records related to: ${activeDiagnoses}.`;
    if(activeMeds) oneLine += ` Current medications include: ${activeMeds}.`

    currentSummary.aiSummary = {
      oneLine: oneLine,
      paragraph: "Detailed AI summary is pending further analysis.",
      confidence: 0.8,
    };

    currentSummary.generatedAt = new Date().toISOString();
    currentSummary.version = newVersion;

    const { error: upsertError } = await supabase
      .from('patient_summaries')
      .upsert({
        patient_id: patientId,
        summary: currentSummary,
        version: newVersion,
        updated_at: new Date().toISOString(),
      });

    if (upsertError) {
      throw new Error(`Failed to upsert patient summary: ${upsertError.message}`);
    }

    console.log(`Successfully updated patient summary for patient ${patientId} to version ${newVersion}.`);

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
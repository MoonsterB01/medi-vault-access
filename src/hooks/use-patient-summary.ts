import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Full PatientSummary interface
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

export const usePatientSummary = (patientId: string | null) => {
  const [summary, setSummary] = useState<PatientSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!patientId) {
      setIsLoading(false);
      setSummary(null);
      return;
    }

    const fetchSummary = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('patient_summaries')
          .select('summary')
          .eq('patient_id', patientId)
          .single();

        if (error && error.code !== 'PGRST116') { // Ignore 'not found'
          throw error;
        }

        setSummary(data?.summary || null);
      } catch (err: any) {
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummary();

    const channel = supabase
      .channel(`patient_summaries:${patientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patient_summaries',
          filter: `patient_id=eq.${patientId}`
        },
        (payload) => {
          console.log('Summary updated:', payload);
          // Refetch the summary when a change is detected
          fetchSummary();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };

  }, [patientId]);

  return { summary, isLoading, error };
};
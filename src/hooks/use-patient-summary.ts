import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PatientSummary } from '@/types/patient-summary';

export const usePatientSummary = (patientId: string | null) => {
  const [summary, setSummary] = useState<PatientSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

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
        // Use type assertion since types haven't regenerated yet
        const { data, error } = await (supabase as any)
          .from('patient_summaries')
          .select('summary')
          .eq('patient_id', patientId)
          .maybeSingle();

        if (error) {
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

  }, [patientId, refreshTrigger]);

  return { summary, isLoading, error, refresh };
};
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PublicStats {
  documentsCount: number;
  patientsCount: number;
  hospitalsCount: number;
  isLoading: boolean;
}

export function usePublicStats(): PublicStats {
  const [stats, setStats] = useState<PublicStats>({
    documentsCount: 0,
    patientsCount: 0,
    hospitalsCount: 0,
    isLoading: true,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data, error } = await supabase.rpc('get_public_stats');
        
        if (error) {
          console.error('Error fetching public stats:', error);
          setStats(prev => ({ ...prev, isLoading: false }));
          return;
        }

        if (data && Array.isArray(data) && data.length > 0) {
          const statsData = data[0];
          setStats({
            documentsCount: Number(statsData.documents_count) || 0,
            patientsCount: Number(statsData.patients_count) || 0,
            hospitalsCount: Number(statsData.hospitals_count) || 0,
            isLoading: false,
          });
        } else if (data && !Array.isArray(data)) {
          setStats({
            documentsCount: Number((data as any).documents_count) || 0,
            patientsCount: Number((data as any).patients_count) || 0,
            hospitalsCount: Number((data as any).hospitals_count) || 0,
            isLoading: false,
          });
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
        setStats(prev => ({ ...prev, isLoading: false }));
      }
    };

    fetchStats();
  }, []);

  return stats;
}

export function formatStatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M+';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k+';
  }
  if (num > 0) {
    return num + '+';
  }
  return '0';
}

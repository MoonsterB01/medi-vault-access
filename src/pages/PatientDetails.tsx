import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePatientSummary } from "@/hooks/use-patient-summary";
import PatientSummary from "@/components/PatientSummary";
import { useActivePatient } from "@/contexts/ActivePatientContext";
import AppLayout from "@/components/AppLayout";

export default function PatientDetails() {
  const [user, setUser] = useState<any>(null);
  const [patientId, setPatientId] = useState<string | null>(null);
  const { activePatient, isFamilyMode } = useActivePatient();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  useEffect(() => {
    const load = async () => {
      if (isFamilyMode && activePatient?.patientId) {
        setPatientId(activePatient.patientId);
        return;
      }
      if (!user) return;
      const { data } = await supabase
        .from("patients")
        .select("id")
        .eq("created_by", user.id)
        .maybeSingle();
      setPatientId(data?.id ?? null);
    };
    load();
  }, [user, isFamilyMode, activePatient?.patientId]);

  const { summary, isLoading, error, refresh } = usePatientSummary(patientId);

  return (
    <AppLayout userRole="patient">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-4 text-muted-foreground"
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to dashboard
        </Button>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Detailed Health Summary</h1>
          <p className="text-sm text-muted-foreground mt-1">
            The full breakdown from your medical records — useful to share with your doctor.
          </p>
        </div>
        <PatientSummary
          summary={summary}
          isLoading={isLoading}
          error={error}
          onRefresh={async () => refresh()}
        />
      </div>
    </AppLayout>
  );
}

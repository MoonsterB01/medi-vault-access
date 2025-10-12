import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertCircle, Heart, Stethoscope, TestTube, Calendar, Bot, Pencil, EyeOff } from "lucide-react";
import { CorrectionDialog } from "@/components/CorrectionDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PatientSummary } from "@/types/patient-summary";

interface PatientSummaryProps {
  summary: PatientSummary | null;
  isLoading: boolean;
  error: Error | null;
}

const PatientSummary = ({ summary, isLoading, error }: PatientSummaryProps) => {
  const { toast } = useToast();

  const handleHide = async (itemType: string, itemId: string) => {
    if (!summary) return;
    try {
      const { data, error } = await supabase.functions.invoke('hide-summary-item', {
        body: {
          patientId: summary.patientId,
          itemType,
          itemId,
        },
      });
      if (error) throw error;
      toast({ title: "Item Hidden", description: "The item has been hidden from your summary." });
    } catch (error: any) {
      toast({ title: "Failed to Hide Item", description: error.message, variant: "destructive" });
    }
  };

  const handleCorrectionSubmit = async (correction: any) => {
    if (!summary) return;
    try {
      const { data, error } = await supabase.functions.invoke('submit-correction', {
        body: {
          patientId: summary.patientId,
          correction,
        },
      });
      if (error) throw error;
      toast({ title: "Correction Submitted", description: "Thank you for your feedback." });
    } catch (error: any) {
      toast({ title: "Submission Failed", description: error.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div>Loading summary...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error loading summary: {error.message}</div>;
  }

  if (!summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Patient Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No summary available yet. Upload a document to generate a summary.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5" /> AI Summary (Beta)</CardTitle>
                <Badge variant="outline">Confidence: {((summary.aiSummary?.confidence || 0) * 100).toFixed(0)}%</Badge>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">{summary.aiSummary?.oneLine || "No AI summary available."}</p>
            </CardContent>
        </Card>

      <Accordion type="multiple" defaultValue={['diagnoses', 'medications']} className="w-full">
        <AccordionItem value="diagnoses">
          <AccordionTrigger><Stethoscope className="h-5 w-5 mr-2" />Recent Diagnoses</AccordionTrigger>
          <AccordionContent>
            {summary.diagnoses?.length ? (
              <ul className="space-y-2">
                {summary.diagnoses.filter(item => !item.hiddenByUser).map((diag) => (
                  <li key={diag.id} className="p-2 border rounded-md">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-semibold">{diag.name}</span>
                        <p className="text-xs text-muted-foreground">Last seen: {diag.lastSeen}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={diag.severity === 'moderate' ? 'default' : 'secondary'}>{diag.severity}</Badge>
                        <CorrectionDialog
                          field={`diagnoses.${diag.id}.name`}
                          originalValue={diag.name}
                          onSubmit={handleCorrectionSubmit}
                        >
                          <Button variant="ghost" size="icon" className="h-6 w-6"><Pencil className="h-4 w-4" /></Button>
                        </CorrectionDialog>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleHide('diagnoses', diag.id)}><EyeOff className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">No diagnoses found.</p>}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="medications">
          <AccordionTrigger><Heart className="h-5 w-5 mr-2" />Active Medications</AccordionTrigger>
          <AccordionContent>
            {summary.medications?.length ? (
                <ul className="space-y-2">
                    {summary.medications.filter(item => !item.hiddenByUser).map((med) => (
                    <li key={med.id} className="p-2 border rounded-md">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="font-semibold">{med.name}</span>
                                <p className="text-xs text-muted-foreground">{med.dose} {med.frequency}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant={med.status === 'active' ? 'green' : 'outline'}>{med.status}</Badge>
                                <CorrectionDialog
                                  field={`medications.${med.id}.name`}
                                  originalValue={med.name}
                                  onSubmit={handleCorrectionSubmit}
                                >
                                  <Button variant="ghost" size="icon" className="h-6 w-6"><Pencil className="h-4 w-4" /></Button>
                                </CorrectionDialog>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleHide('medications', med.id)}><EyeOff className="h-4 w-4" /></Button>
                            </div>
                        </div>
                    </li>
                    ))}
                </ul>
            ) : <p className="text-sm text-muted-foreground">No active medications found.</p>}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="labs">
            <AccordionTrigger><TestTube className="h-5 w-5 mr-2" />Key Vitals & Lab Trends</AccordionTrigger>
            <AccordionContent>
                {summary.labs?.latest?.length ? (
                    <ul className="space-y-2">
                        {summary.labs.latest.map((lab, index) => (
                        <li key={index} className="p-2 border rounded-md">
                            <div className="flex justify-between">
                            <span className="font-semibold">{lab.test}</span>
                            <span>{lab.value}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">Date: {lab.date}</p>
                        </li>
                        ))}
                    </ul>
                ) : <p className="text-sm text-muted-foreground">No recent lab results.</p>}
            </AccordionContent>
        </AccordionItem>

        <AccordionItem value="visits">
            <AccordionTrigger><Calendar className="h-5 w-5 mr-2" />Visits & Consultations</AccordionTrigger>
            <AccordionContent>
                 {summary.visits?.length ? (
                    <ul className="space-y-2">
                        {summary.visits.map((visit) => (
                        <li key={visit.visitId} className="p-2 border rounded-md">
                            <div className="flex justify-between">
                            <span className="font-semibold">{visit.doctor}</span>
                            <span>{visit.date}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{visit.reason}</p>
                        </li>
                        ))}
                    </ul>
                ) : <p className="text-sm text-muted-foreground">No recent visits recorded.</p>}
            </AccordionContent>
        </AccordionItem>

        <AccordionItem value="alerts">
            <AccordionTrigger><AlertCircle className="h-5 w-5 mr-2" />Alerts & Flags</AccordionTrigger>
            <AccordionContent>
                 {summary.alerts?.length ? (
                    <ul className="space-y-2">
                        {summary.alerts.map((alert) => (
                        <li key={alert.id} className={`p-2 border rounded-md ${alert.level === 'warning' ? 'border-yellow-500' : ''}`}>
                            <p className="font-semibold">{alert.message}</p>
                        </li>
                        ))}
                    </ul>
                ) : <p className="text-sm text-muted-foreground">No alerts.</p>}
            </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default PatientSummary;
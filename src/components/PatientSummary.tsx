import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Bot, Pencil, FileText, Upload, RefreshCw } from "lucide-react";
import { EditPatientInfoDialog } from "@/components/EditPatientInfoDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { PatientSummary } from "@/types/patient-summary";
import { useState } from "react";

interface PatientSummaryProps {
  summary: PatientSummary | null;
  isLoading: boolean;
  error: Error | null;
  onRefresh?: () => Promise<void>;
}

const PatientSummary = ({ summary, isLoading, error, onRefresh }: PatientSummaryProps) => {
  const { toast } = useToast();
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="border-2 border-primary">
          <CardHeader>
            <div className="flex justify-between items-center">
              <Skeleton className="h-6 w-48" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-20" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      </div>
    );
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

  const handleRegenerateSummary = async () => {
    if (!summary?.patientId) return;
    setIsRegenerating(true);
    try {
      await supabase.functions.invoke('generate-patient-summary', {
        body: { patientId: summary.patientId }
      });
      toast({ 
        title: "Summary Updated", 
        description: "Your health summary has been regenerated." 
      });
    } catch (err) {
      toast({ 
        title: "Update Failed", 
        description: "Failed to regenerate summary. Please try again.",
        variant: "destructive" 
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  const documentCount = summary?.sources?.documentCount || 0;
  const hasUnknownGender = !summary?.patientInfo?.gender || summary.patientInfo.gender === 'Unknown';
  const hasNoDocuments = documentCount === 0;
  const showMissingInfoAlert = hasUnknownGender || hasNoDocuments;

  return (
    <div className="space-y-6">
      {/* Missing Information Alert */}
      {showMissingInfoAlert && (
        <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
          <AlertCircle className="h-5 w-5 text-yellow-600" />
          <AlertTitle className="text-yellow-800 dark:text-yellow-200">
            Incomplete Profile
          </AlertTitle>
          <AlertDescription className="text-yellow-700 dark:text-yellow-300">
            <p className="mb-2">Your medical summary will be more accurate with complete information:</p>
            <ul className="list-disc pl-5 space-y-1">
              {hasUnknownGender && <li>Gender is missing or unknown</li>}
              {hasNoDocuments && <li>No documents uploaded yet - upload your medical records to get started</li>}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* AI Health Summary - Main Feature */}
      <Card className="border-2 border-primary">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bot className="h-6 w-6 text-primary" /> 
            AI Health Summary
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-primary/5">
              {documentCount} {documentCount === 1 ? 'Document' : 'Documents'}
            </Badge>
            <Badge variant={
              ((summary.aiSummary?.confidence || 0) > 0.7) ? 'default' : 'secondary'
            }>
              {((summary.aiSummary?.confidence || 0) * 100).toFixed(0)}% Confidence
            </Badge>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleRegenerateSummary}
              disabled={isRegenerating}
              title="Refresh summary"
            >
              <RefreshCw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* One-line summary - prominent */}
          <div className="p-4 bg-primary/10 dark:bg-primary/20 rounded-lg border border-primary/20">
            <p className="font-semibold text-primary text-base leading-relaxed">
              {summary.aiSummary?.oneLine || "Upload medical documents to generate your personalized health summary."}
            </p>
          </div>
          
          {/* Detailed paragraph */}
          {summary.aiSummary?.paragraph && 
           summary.aiSummary.paragraph !== 'Detailed AI summary is pending further analysis.' && 
           summary.aiSummary.paragraph !== 'Upload more documents for a detailed summary.' && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {summary.aiSummary.paragraph}
            </p>
          )}
          
          {/* Empty state with call-to-action */}
          {(!summary.aiSummary || documentCount === 0 || summary.aiSummary.oneLine === 'No medical documents uploaded yet.') && (
            <div className="text-center py-8 space-y-4">
              <FileText className="h-16 w-16 mx-auto text-muted-foreground opacity-50" />
              <div className="space-y-2">
                <p className="font-semibold text-foreground">No Health Summary Yet</p>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Upload your first medical document to get AI-powered insights about your health history, diagnoses, medications, and more.
                </p>
              </div>
              <Button 
                onClick={() => window.location.hash = '#upload'}
                className="shadow-lg"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Your First Document
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Patient Information - Compact */}
      {summary.patientInfo && (
            <Card className="transition-all hover:shadow-md">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Patient Information</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditDialogOpen(true)}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              </CardHeader>
          <CardContent className="text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <p className="text-muted-foreground text-xs">Name</p>
                <p className="font-medium">{summary.patientInfo.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Date of Birth</p>
                <p className="font-medium">{summary.patientInfo.dob || 'N/A'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Gender</p>
                <p className="font-medium">{summary.patientInfo.gender || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Patient Info Dialog */}
      <EditPatientInfoDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        patientData={summary?.patientInfo}
        patientId={summary?.patientId || ""}
        onSuccess={async () => {
          toast({ title: "Patient information updated successfully" });
          if (onRefresh) await onRefresh();
        }}
      />
    </div>
  );
};

export default PatientSummary;
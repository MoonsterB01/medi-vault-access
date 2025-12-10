import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Bot, Pencil, FileText, Upload, RefreshCw, Activity, Heart } from "lucide-react";
import { EditPatientInfoDialog } from "@/components/EditPatientInfoDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { PatientSummary } from "@/types/patient-summary";
import { useState, useEffect } from "react";
import { PulsingDot } from "@/components/PulsingDot";
import { cn } from "@/lib/utils";

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
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => setIsVisible(true), 100);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Enhanced skeleton with shimmer effect */}
        <Card className="border-2 border-primary/30 overflow-hidden">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-6 w-40" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-12 rounded-full" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-8 w-16" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Loading indicator */}
        <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
          <Activity className="h-4 w-4 animate-pulse" />
          <span>Loading your health summary...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="animate-fade-in">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Summary</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  if (!summary) {
    return (
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Patient Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No summary available yet. Upload a document to generate a summary.</p>
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
      if (onRefresh) await onRefresh();
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
  const confidence = summary.aiSummary?.confidence || 0;

  return (
    <div className={cn(
      "space-y-6 transition-all duration-500",
      isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
    )}>
      {/* Missing Information Alert */}
      {showMissingInfoAlert && (
        <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950 animate-fade-in">
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
      <Card className="border-2 border-primary w-full overflow-hidden animate-fade-in group hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <div className="relative">
              <Bot className="h-5 w-5 md:h-6 md:w-6 text-primary flex-shrink-0" />
              {documentCount > 0 && (
                <div className="absolute -top-1 -right-1">
                  <PulsingDot color="green" size="sm" />
                </div>
              )}
            </div>
            AI Health Summary
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="bg-primary/5 text-xs">
              {documentCount} {documentCount === 1 ? 'Doc' : 'Docs'}
            </Badge>
            <Badge 
              variant={confidence > 0.7 ? 'default' : 'secondary'} 
              className={cn(
                "text-xs transition-colors",
                confidence > 0.7 && "bg-trust text-trust-foreground"
              )}
            >
              {(confidence * 100).toFixed(0)}% Confidence
            </Badge>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleRegenerateSummary}
              disabled={isRegenerating}
              title="Refresh summary"
              className="h-8 w-8 p-0 hover:bg-primary/10"
            >
              <RefreshCw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* One-line summary - prominent */}
          <div className="p-4 bg-primary/10 dark:bg-primary/20 rounded-lg border border-primary/20 relative overflow-hidden">
            <div className="absolute top-2 right-2">
              <Heart className="h-4 w-4 text-primary/30" />
            </div>
            <p className="font-semibold text-primary text-base leading-relaxed">
              {summary.aiSummary?.oneLine || "Upload medical documents to generate your personalized health summary."}
            </p>
          </div>
          
          {/* Detailed paragraph */}
          {summary.aiSummary?.paragraph && 
           summary.aiSummary.paragraph !== 'Detailed AI summary is pending further analysis.' && 
           summary.aiSummary.paragraph !== 'Upload more documents for a detailed summary.' && (
            <p className="text-sm text-muted-foreground leading-relaxed animate-fade-in">
              {summary.aiSummary.paragraph}
            </p>
          )}
          
          {/* Empty state with call-to-action */}
          {(!summary.aiSummary || documentCount === 0 || summary.aiSummary.oneLine === 'No medical documents uploaded yet.') && (
            <div className="text-center py-8 space-y-4">
              <div className="relative mx-auto w-20 h-20">
                <div className="absolute inset-0 bg-primary/10 rounded-full animate-pulse-soft" />
                <FileText className="absolute inset-0 m-auto h-10 w-10 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-foreground">No Health Summary Yet</p>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Upload your first medical document to get AI-powered insights about your health history, diagnoses, medications, and more.
                </p>
              </div>
              <Button 
                onClick={() => window.location.hash = '#upload'}
                className="shadow-lg hover-scale"
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
        <Card className="transition-all hover:shadow-md w-full animate-fade-in animate-delay-200">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm md:text-base">Patient Info</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditDialogOpen(true)}
              className="h-8 px-2 hover:bg-primary/10"
            >
              <Pencil className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Edit</span>
            </Button>
          </CardHeader>
          <CardContent className="text-sm pt-0">
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              <div className="min-w-0">
                <p className="text-muted-foreground text-xs">Name</p>
                <p className="font-medium text-xs md:text-sm truncate">{summary.patientInfo.name || 'N/A'}</p>
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground text-xs">DOB</p>
                <p className="font-medium text-xs md:text-sm truncate">{summary.patientInfo.dob || 'N/A'}</p>
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground text-xs">Gender</p>
                <p className="font-medium text-xs md:text-sm truncate">{summary.patientInfo.gender || 'N/A'}</p>
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
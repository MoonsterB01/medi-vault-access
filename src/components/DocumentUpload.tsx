import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import {
  AlertCircle,
  Camera,
  CheckCircle,
  ChevronDown,
  ExternalLink,
  FileText,
  Loader2,
  RefreshCw,
  Shield,
  Upload,
  User,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DocumentScanner } from "@/components/DocumentScanner";
import { generateFileHash } from "@/lib/fileHash";
import { UpgradePlanDialog } from "@/components/UpgradePlanDialog";
import { useSubscription } from "@/hooks/use-subscription";

export interface UploadedDocumentResult {
  documentId: string;
  filePath?: string;
  filename?: string;
}

interface DocumentUploadProps {
  onUploadSuccess?: (document?: UploadedDocumentResult) => void;
  targetPatientId?: string;
  targetPatientName?: string;
  canUpload?: boolean;
}

type UploadPhase = "idle" | "saving" | "saved";
type ProcessingStatus = "reading" | "ready" | "needs-review";

function getDocumentLabel(name: string) {
  const extension = name.split(".").pop()?.toLowerCase();
  return extension === "pdf" ? "PDF report" : "Photo report";
}

export default function DocumentUpload({
  onUploadSuccess,
  targetPatientId,
  targetPatientName,
  canUpload = true,
}: DocumentUploadProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>("idle");
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>("reading");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patientName, setPatientName] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [fileHash, setFileHash] = useState<string | null>(null);
  const [isFileBlocked, setIsFileBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState<string | null>(null);
  const [savedDocument, setSavedDocument] = useState<UploadedDocumentResult | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsSaving, setDetailsSaving] = useState(false);
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const subscription = useSubscription(userId || undefined, patientId || undefined);

  useEffect(() => {
    if (targetPatientId) {
      setPatientId(targetPatientId);
      setPatientName(targetPatientName || "Selected patient");
      supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null));
      return;
    }
    void fetchUserPatient();
  }, [targetPatientId, targetPatientName]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const fetchUserPatient = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setUserId(null);
      toast({ title: "Sign in required", description: "Please sign in before saving a report.", variant: "destructive" });
      return;
    }

    setUserId(user.id);
    const { data: patients, error } = await supabase
      .from("patients")
      .select("id, name")
      .eq("created_by", user.id)
      .limit(1);

    if (error || !patients?.length) {
      toast({ title: "Patient record not found", description: "Please finish setting up your patient profile first.", variant: "destructive" });
      return;
    }

    setPatientId(patients[0].id);
    setPatientName(patients[0].name);
  };

  const clearFileInput = () => {
    const input = document.getElementById("file-input") as HTMLInputElement | null;
    if (input) input.value = "";
  };

  const resetUpload = () => {
    setUploadPhase("idle");
    setProcessingStatus("reading");
    setFile(null);
    setSavedDocument(null);
    setFileHash(null);
    setIsFileBlocked(false);
    setBlockReason(null);
    setDetailsOpen(false);
    setDescription("");
    setTags("");
    clearFileInput();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const watchProcessing = async (documentId: string) => {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, attempt === 0 ? 1200 : 1800));
      const { data, error } = await supabase
        .from("documents")
        .select("ai_summary, extracted_text, auto_categories, extracted_entities")
        .eq("id", documentId)
        .maybeSingle();

      if (error) return;
      if (data?.ai_summary || data?.extracted_text || data?.auto_categories?.length || data?.extracted_entities) {
        setProcessingStatus("ready");
        return;
      }
    }
  };

  const checkAndSaveFile = async (selectedFile: File) => {
    if (!patientId) {
      toast({ title: "Patient record unavailable", description: "Please refresh and try again.", variant: "destructive" });
      return;
    }

    if (!subscription.canUpload && !subscription.isLoading) {
      setShowUpgradeDialog(true);
      clearFileInput();
      return;
    }

    if (selectedFile.size > 20 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please choose a PDF or photo smaller than 20 MB.", variant: "destructive" });
      clearFileInput();
      return;
    }

    setFile(selectedFile);
    setIsFileBlocked(false);
    setBlockReason(null);
    setSavedDocument(null);
    setPreviewUrl(selectedFile.type.startsWith("image/") ? URL.createObjectURL(selectedFile) : null);
    setUploadPhase("saving");

    try {
      const hash = await generateFileHash(selectedFile);
      setFileHash(hash);
      const { data: blocked, error: blockedError } = await supabase.rpc("is_file_blocked", { hash_input: hash });
      if (blockedError) throw blockedError;
      if (blocked) {
        setIsFileBlocked(true);
        setBlockReason("This file was previously marked as non-medical.");
        setUploadPhase("idle");
        toast({ title: "File not saved", description: "Please choose a different report.", variant: "destructive" });
        return;
      }

      await supabase.rpc("register_file_hash", {
        hash_input: hash,
        filename_input: selectedFile.name,
        size_input: selectedFile.size,
        content_type_input: selectedFile.type,
      });

      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = typeof reader.result === "string" ? reader.result : "";
          resolve(result.split(",")[1] || "");
        };
        reader.onerror = () => reject(new Error("Could not read this file."));
        reader.readAsDataURL(selectedFile);
      });

      const { data, error } = await supabase.functions.invoke("upload-document", {
        body: {
          file: {
            name: selectedFile.name,
            content,
            type: selectedFile.type || "application/octet-stream",
            size: selectedFile.size,
          },
          documentType: "other",
          fileHash: hash,
          patientId,
        },
      });

      if (error) throw new Error(error.message || "The report could not be saved.");
      if (!data?.success || !data.documentId) throw new Error(data?.details || "The report could not be saved.");

      const saved: UploadedDocumentResult = {
        documentId: data.documentId,
        filePath: data.filePath,
        filename: selectedFile.name,
      };
      setSavedDocument(saved);
      setUploadPhase("saved");
      setProcessingStatus("reading");
      onUploadSuccess?.(saved);
      void watchProcessing(saved.documentId);
      toast({ title: "Report saved", description: `Saved to ${patientName}'s records.` });
      await subscription.refresh();
    } catch (error: any) {
      console.error("Upload error:", error);
      setUploadPhase("idle");
      toast({
        title: "Report not saved",
        description: error?.message || "Please check your connection and try again.",
        variant: "destructive",
      });
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) await checkAndSaveFile(selectedFile);
  };

  const handleScanComplete = async (scannedFile: File) => {
    setShowScanner(false);
    await checkAndSaveFile(scannedFile);
  };

  const handleRetryProcessing = async () => {
    if (!savedDocument?.documentId || processingStatus === "reading") return;
    setProcessingStatus("reading");
    const { error } = await supabase.functions.invoke("generate-document-summary", {
      body: { documentId: savedDocument.documentId },
    });
    if (error) {
      setProcessingStatus("needs-review");
      toast({ title: "Details could not be read", description: error.message, variant: "destructive" });
      return;
    }
    void watchProcessing(savedDocument.documentId);
  };

  const saveDetails = async () => {
    if (!savedDocument?.documentId) return;
    setDetailsSaving(true);
    const detailTags = tags.split(",").map((tag) => tag.trim()).filter(Boolean);
    const { error } = await supabase
      .from("documents")
      .update({ description: description.trim() || null, tags: detailTags })
      .eq("id", savedDocument.documentId);
    setDetailsSaving(false);
    if (error) {
      toast({ title: "Details not saved", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Details saved" });
    setDetailsOpen(false);
  };

  if (!patientId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Save a report</CardTitle>
          <CardDescription>Loading the patient record…</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!canUpload) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Save a report</CardTitle>
          <CardDescription>This family account has view-only access, so it cannot add reports.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const isBusy = uploadPhase === "saving";
  const destination = `${patientName || "this family member"}'s records`;

  return (
    <div className="w-full max-w-2xl space-y-4">
      {uploadPhase !== "saved" && (
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <User className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-lg">Save to {destination}</CardTitle>
                <CardDescription className="mt-1">Add a prescription, lab report, scan, or medical photo. We’ll read the details after it is safely saved.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Button type="button" size="lg" className="h-14 w-full" onClick={() => setShowScanner(true)} disabled={isBusy}>
                <Camera className="h-5 w-5" aria-hidden="true" />
                Take a photo
              </Button>
              <Label htmlFor="file-input" className="flex h-14 cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
                <Upload className="h-5 w-5" aria-hidden="true" />
                Choose a file
                <Input id="file-input" type="file" onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="sr-only" disabled={isBusy} />
              </Label>
            </div>
            <p className="text-center text-xs text-muted-foreground">PDF, JPG, or PNG · up to 20 MB</p>

            {isBusy && file && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4" role="status" aria-live="polite">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="font-medium">Saving {getDocumentLabel(file.name)}…</p>
                    <p className="truncate text-sm text-muted-foreground">{file.name}</p>
                  </div>
                </div>
              </div>
            )}

            {isFileBlocked && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4" role="alert">
                <div className="flex items-center gap-2 font-medium text-destructive"><Shield className="h-4 w-4" aria-hidden="true" />Report not saved</div>
                <p className="mt-1 text-sm text-muted-foreground">{blockReason || "This file cannot be uploaded."}</p>
                <Button type="button" variant="outline" size="sm" className="mt-3" onClick={resetUpload}>Choose another file</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {uploadPhase === "saved" && savedDocument && file && (
        <Card className="border-trust/40 bg-trust/10">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-start gap-3" role="status" aria-live="polite">
              <CheckCircle className="mt-0.5 h-6 w-6 shrink-0 text-trust" aria-hidden="true" />
              <div className="min-w-0">
                <h2 className="font-semibold">Saved to {destination}</h2>
                <p className="mt-1 text-sm text-muted-foreground">Your report is safe. Details are being read in the background.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-border bg-background/70 p-3">
              {previewUrl ? (
                <img src={previewUrl} alt="Preview of the saved medical report" className="h-16 w-16 shrink-0 rounded-md border object-cover" />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border bg-muted" aria-label="PDF report preview">
                  <FileText className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {processingStatus === "ready" ? "Details are ready to review." : "Details are still being read."}
                </p>
              </div>
            </div>

            {processingStatus === "needs-review" && (
              <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm" role="alert">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                <span>Saved successfully, but the details could not be read yet.</span>
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" className="flex-1" onClick={() => navigate(`/document/${savedDocument.documentId}`)}>
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                View report
              </Button>
              {processingStatus !== "ready" && (
                <Button type="button" variant="outline" onClick={handleRetryProcessing} disabled={processingStatus === "reading"}>
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  Check details
                </Button>
              )}
              <Button type="button" variant="outline" onClick={resetUpload}>Save another</Button>
            </div>

            <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className="w-full justify-between">
                  Add a note or tag <ChevronDown className="h-4 w-4" aria-hidden="true" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-3">
                <div className="space-y-1.5">
                  <Label htmlFor="description">Note (optional)</Label>
                  <Textarea id="description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="For example: Papa’s diabetes check-up" rows={2} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tags">Tags (optional)</Label>
                  <Input id="tags" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="For example: Papa, follow-up, blood test" />
                </div>
                <Button type="button" variant="secondary" onClick={saveDetails} disabled={detailsSaving}>
                  {detailsSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  Save details
                </Button>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      )}

      <DocumentScanner open={showScanner} onClose={() => setShowScanner(false)} onScanComplete={handleScanComplete} />

      {showUpgradeDialog && (
        <UpgradePlanDialog
          open={showUpgradeDialog}
          onOpenChange={setShowUpgradeDialog}
          currentPlan="free"
          uploadsUsed={subscription.uploadsUsed}
          uploadLimit={5}
        />
      )}
    </div>
  );
}

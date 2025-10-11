import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, CheckCircle, Eye, FileText, ThumbsUp, ThumbsDown } from "lucide-react";

/**
 * @interface Document
 * @description Defines the structure of a document object for verification.
 */
interface Document {
  id: string;
  filename: string;
  verification_status: string;
  text_density_score: number;
  medical_keyword_count: number;
  processing_notes: string;
  content_confidence: number;
  auto_categories: string[];
  content_keywords: string[];
  uploaded_at: string;
}

/**
 * @interface DocumentVerificationManagerProps
 * @description Defines the props for the DocumentVerificationManager component.
 * @property {string} [patientId] - The ID of the patient to filter documents for.
 * @property {() => void} [onVerificationUpdate] - An optional callback function to be called when a document's verification status is updated.
 */
interface DocumentVerificationManagerProps {
  patientId?: string;
  onVerificationUpdate?: () => void;
}

/**
 * @function DocumentVerificationManager
 * @description A component for managing the verification of unverified medical documents. It fetches unverified documents and allows a user to verify them as medical or not.
 * @param {DocumentVerificationManagerProps} props - The props for the component.
 * @returns {JSX.Element} - The rendered DocumentVerificationManager component.
 */
export default function DocumentVerificationManager({ 
  patientId, 
  onVerificationUpdate 
}: DocumentVerificationManagerProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchUnverifiedDocuments();
  }, [patientId]);

  const fetchUnverifiedDocuments = async () => {
    try {
      let query = supabase
        .from('documents')
        .select('*')
        .in('verification_status', ['user_verified_medical', 'unverified'])
        .order('uploaded_at', { ascending: false });

      if (patientId) {
        query = query.eq('patient_id', patientId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      toast({
        title: "Error Loading Documents",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async (
    documentId: string, 
    newStatus: 'verified_medical' | 'unverified' | 'miscellaneous',
    userCategory?: string,
    notes?: string
  ) => {
    setUpdating(documentId);
    
    try {
      // Update document status
      const { error: updateError } = await supabase
        .from('documents')
        .update({
          verification_status: newStatus,
          user_verified_category: userCategory,
          processing_notes: notes || `User ${newStatus === 'verified_medical' ? 'verified' : 'rejected'} document`,
        })
        .eq('id', documentId);

      if (updateError) throw updateError;

      // Record feedback
      const { error: feedbackError } = await supabase
        .from('document_feedback')
        .insert({
          document_id: documentId,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          original_verification_status: documents.find(d => d.id === documentId)?.verification_status || 'unverified',
          corrected_verification_status: newStatus,
          user_assigned_category: userCategory,
          feedback_notes: notes,
        });

      if (feedbackError) {
        console.error('Error recording feedback:', feedbackError);
      }

      toast({
        title: "Document Updated",
        description: `Document ${newStatus === 'verified_medical' ? 'verified' : 'updated'} successfully`,
      });

      // Refresh documents list
      await fetchUnverifiedDocuments();
      onVerificationUpdate?.();
      
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified_medical': return 'bg-green-100 text-green-800 border-green-200';
      case 'user_verified_medical': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'unverified': return 'bg-red-100 text-red-800 border-red-200';
      case 'miscellaneous': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified_medical': return <CheckCircle className="h-4 w-4" />;
      case 'user_verified_medical': return <Eye className="h-4 w-4" />;
      case 'unverified': return <AlertTriangle className="h-4 w-4" />;
      case 'miscellaneous': return <FileText className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading documents...</div>
        </CardContent>
      </Card>
    );
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
            <p>All documents have been verified!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Documents Requiring Verification</h3>
        <Badge variant="outline">{documents.length} pending</Badge>
      </div>

      {documents.map((doc) => (
        <DocumentVerificationCard
          key={doc.id}
          document={doc}
          onVerify={handleVerification}
          isUpdating={updating === doc.id}
          getStatusColor={getStatusColor}
          getStatusIcon={getStatusIcon}
        />
      ))}
    </div>
  );
}

/**
 * @interface DocumentVerificationCardProps
 * @description Defines the props for the DocumentVerificationCard component.
 * @property {Document} document - The document object to display.
 * @property {(documentId: string, status: 'verified_medical' | 'unverified' | 'miscellaneous', category?: string, notes?: string) => void} onVerify - A function to handle the verification of the document.
 * @property {boolean} isUpdating - A boolean to indicate if the document is currently being updated.
 * @property {(status: string) => string} getStatusColor - A function to get the color for a given status.
 * @property {(status: string) => React.ReactNode} getStatusIcon - A function to get the icon for a given status.
 */
interface DocumentVerificationCardProps {
  document: Document;
  onVerify: (documentId: string, status: 'verified_medical' | 'unverified' | 'miscellaneous', category?: string, notes?: string) => void;
  isUpdating: boolean;
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => React.ReactNode;
}

/**
 * @function DocumentVerificationCard
 * @description A component that displays a single document for verification and provides actions to verify or reject it.
 * @param {DocumentVerificationCardProps} props - The props for the component.
 * @returns {JSX.Element} - The rendered DocumentVerificationCard component.
 */
function DocumentVerificationCard({ 
  document, 
  onVerify, 
  isUpdating, 
  getStatusColor, 
  getStatusIcon 
}: DocumentVerificationCardProps) {
  const [userCategory, setUserCategory] = useState("");
  const [userNotes, setUserNotes] = useState("");

  return (
    <Card className="border-2 border-yellow-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {document.filename}
          </div>
          <Badge className={getStatusColor(document.verification_status)}>
            {getStatusIcon(document.verification_status)}
            <span className="ml-1">{document.verification_status.replace('_', ' ')}</span>
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Document Analysis Summary */}
        <div className="grid grid-cols-3 gap-4 p-3 bg-muted rounded-lg text-sm">
          <div>
            <span className="font-medium">Text Density:</span>
            <div className="text-lg font-bold">{document.text_density_score} words</div>
          </div>
          <div>
            <span className="font-medium">Medical Keywords:</span>
            <div className="text-lg font-bold">{document.medical_keyword_count}</div>
          </div>
          <div>
            <span className="font-medium">AI Confidence:</span>
            <div className="text-lg font-bold">{(document.content_confidence * 100).toFixed(0)}%</div>
          </div>
        </div>

        {/* Keywords Preview */}
        {document.content_keywords && document.content_keywords.length > 0 && (
          <div>
            <span className="text-sm font-medium text-muted-foreground">Detected Keywords:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {document.content_keywords.slice(0, 8).map((keyword, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {keyword}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Categories */}
        {document.auto_categories && document.auto_categories.length > 0 && (
          <div>
            <span className="text-sm font-medium text-muted-foreground">Suggested Categories:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {document.auto_categories.map((category, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {category}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* System Notes */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm font-medium text-blue-800">System Analysis:</span>
          <p className="text-sm text-blue-700 mt-1">{document.processing_notes}</p>
        </div>

        {/* Verification Actions */}
        <div className="space-y-3 border-t pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Select value={userCategory} onValueChange={setUserCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select document category (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lab_report">Lab Report</SelectItem>
                <SelectItem value="prescription">Prescription</SelectItem>
                <SelectItem value="x_ray">X-Ray</SelectItem>
                <SelectItem value="mri_scan">MRI Scan</SelectItem>
                <SelectItem value="ct_scan">CT Scan</SelectItem>
                <SelectItem value="consultation_notes">Consultation Notes</SelectItem>
                <SelectItem value="discharge_summary">Discharge Summary</SelectItem>
                <SelectItem value="other">Other Medical Document</SelectItem>
              </SelectContent>
            </Select>

            <Textarea
              placeholder="Additional notes (optional)"
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => onVerify(document.id, 'verified_medical', userCategory, userNotes)}
              disabled={isUpdating}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <ThumbsUp className="h-4 w-4 mr-2" />
              Verify as Medical
            </Button>
            
            <Button
              onClick={() => onVerify(document.id, 'miscellaneous', undefined, userNotes || 'User marked as non-medical')}
              disabled={isUpdating}
              variant="outline"
              className="flex-1"
            >
              <ThumbsDown className="h-4 w-4 mr-2" />
              Not Medical
            </Button>
          </div>
        </div>

        {isUpdating && (
          <div className="text-center text-sm text-muted-foreground">
            Updating document...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
import { useState } from "react";
import { Shield, CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface DocumentVerificationManagerProps {
  documentId: string;
  currentStatus: string;
  onStatusChange?: () => void;
}

export function DocumentVerificationManager({ 
  documentId, 
  currentStatus,
  onStatusChange 
}: DocumentVerificationManagerProps) {
  const [newStatus, setNewStatus] = useState(currentStatus);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'needs_review':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      default:
        return <Shield className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'default';
      case 'rejected':
        return 'destructive';
      case 'needs_review':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const handleSubmitFeedback = async () => {
    if (newStatus === currentStatus && !notes) {
      toast({
        title: "No Changes",
        description: "Please select a new status or add notes",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Submit feedback
      const { error: feedbackError } = await supabase
        .from('document_feedback')
        .insert({
          document_id: documentId,
          user_id: user.id,
          original_verification_status: currentStatus,
          corrected_verification_status: newStatus,
          feedback_notes: notes || null
        });

      if (feedbackError) throw feedbackError;

      toast({
        title: "Feedback Submitted",
        description: "Document verification status updated",
      });

      onStatusChange?.();
    } catch (error: any) {
      console.error('Feedback error:', error);
      toast({
        title: "Submission Failed",
        description: error.message || "Could not submit feedback",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Document Verification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Current Status</label>
          <Badge variant={getStatusColor(currentStatus)} className="flex items-center gap-2 w-fit">
            {getStatusIcon(currentStatus)}
            {currentStatus.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Update Status</label>
          <Select value={newStatus} onValueChange={setNewStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unverified">Unverified</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="needs_review">Needs Review</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Notes (Optional)</label>
          <Textarea
            placeholder="Add any comments about this verification..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        <Button 
          onClick={handleSubmitFeedback} 
          disabled={isSubmitting}
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Verification'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

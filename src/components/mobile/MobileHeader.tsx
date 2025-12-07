import { useState } from "react";
import { User, Copy, ChevronDown, ChevronUp, Clock, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface MobileHeaderProps {
  patientData: any;
  user: any;
  subscription?: {
    currentPlan?: {
      display_name: string;
      upload_limit: number;
    };
    uploadsUsed: number;
    isLoading: boolean;
  };
}

export function MobileHeader({ patientData, user, subscription }: MobileHeaderProps) {
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const copyShareableId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast({ title: "Copied!", description: "ID copied to clipboard" });
  };

  return (
    <header className="sticky top-0 z-40 bg-card border-b border-border">
      {/* Main header row */}
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-semibold text-sm truncate">
              {patientData?.name || 'Patient'}
            </h1>
            {subscription?.currentPlan && !subscription.isLoading && (
              <p className="text-xs text-muted-foreground">
                {subscription.uploadsUsed}/{subscription.currentPlan.upload_limit} uploads
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => navigate('/document-timeline')}
          >
            <Clock className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Expandable info section */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border bg-muted/30">
          <div className="pt-3 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">DOB:</span>
              <span className="ml-1 font-medium">{patientData?.dob || 'N/A'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Gender:</span>
              <span className="ml-1 font-medium">{patientData?.gender || 'N/A'}</span>
            </div>
          </div>

          {/* User ID */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Your ID</p>
            <div className="flex items-center gap-2 p-2 bg-background border rounded-lg">
              <code className="flex-1 font-mono text-xs truncate">
                {user?.user_shareable_id || 'N/A'}
              </code>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 flex-shrink-0"
                onClick={() => copyShareableId(user?.user_shareable_id)}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Patient Shareable ID */}
          {patientData?.shareable_id && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Share for uploads</p>
              <div className="flex items-center gap-2 p-2 bg-primary/5 border border-primary/20 rounded-lg">
                <code className="flex-1 font-mono text-xs truncate text-primary">
                  {patientData.shareable_id}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 flex-shrink-0"
                  onClick={() => copyShareableId(patientData.shareable_id)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

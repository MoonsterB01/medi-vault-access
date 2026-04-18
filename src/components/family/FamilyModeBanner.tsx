import { useActivePatient } from "@/contexts/ActivePatientContext";
import { Button } from "@/components/ui/button";
import { Users, X } from "lucide-react";

/**
 * Shown at the top of the dashboard when the user is currently managing a linked
 * family member's account. Provides a one-click way to return to their own account.
 */
export function FamilyModeBanner() {
  const { activePatient, isFamilyMode, switchToOwnAccount } = useActivePatient();

  if (!isFamilyMode || !activePatient) return null;

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 flex-wrap">
      <div className="flex items-center gap-2 min-w-0">
        <Users className="h-4 w-4 text-primary shrink-0" />
        <p className="text-sm">
          <span className="text-muted-foreground">Family access mode — viewing</span>{" "}
          <span className="font-semibold">{activePatient.patientName}</span>
          {activePatient.shareableId && (
            <code className="ml-2 text-xs text-muted-foreground font-mono">
              {activePatient.shareableId}
            </code>
          )}
        </p>
      </div>
      <Button size="sm" variant="outline" onClick={switchToOwnAccount}>
        <X className="h-4 w-4 mr-1" />
        Switch back to my account
      </Button>
    </div>
  );
}

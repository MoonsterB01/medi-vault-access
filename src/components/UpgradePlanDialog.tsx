import { Link } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

interface UpgradePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan: string;
  uploadsUsed: number;
  uploadLimit: number;
}

export function UpgradePlanDialog({
  open,
  onOpenChange,
  currentPlan,
  uploadsUsed,
  uploadLimit,
}: UpgradePlanDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-5 h-5" />
            <AlertDialogTitle>Upload Limit Reached</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3 pt-2">
            <p>
              You've used all {uploadLimit} uploads available on the <span className="font-semibold">{currentPlan}</span> plan.
            </p>
            <p>
              Upgrade to a higher plan to continue uploading documents and unlock more features.
            </p>
            <div className="bg-muted/50 p-3 rounded-md text-sm">
              <div className="font-medium mb-1">Current usage:</div>
              <div className="text-muted-foreground">
                {uploadsUsed} / {uploadLimit} documents uploaded
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Link to="/pricing">
            <AlertDialogAction>View Plans</AlertDialogAction>
          </Link>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

import { Link } from "react-router-dom";
import { ArrowRight, Crown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SubscriptionBannerProps {
  planName: string;
  uploadsUsed: number;
  uploadLimit: number;
  className?: string;
}

export function SubscriptionBanner({
  planName,
  uploadsUsed,
  uploadLimit,
  className,
}: SubscriptionBannerProps) {
  const usagePercentage = (uploadsUsed / uploadLimit) * 100;
  const shouldShowUpgrade = usagePercentage > 60 && planName.toLowerCase() !== 'premium';
  const isFree = planName.toLowerCase() === 'free';

  return (
    <Card className={cn("p-4 space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!isFree && <Crown className="w-4 h-4 text-primary" />}
          <span className="text-sm font-medium text-foreground">
            {planName} Plan
          </span>
        </div>
        <Link to="/pricing">
          <Button variant="ghost" size="sm" className="h-7 text-xs">
            View Plans
          </Button>
        </Link>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted-foreground">Uploads</span>
          <span className="font-medium text-foreground">
            {uploadsUsed}/{uploadLimit}
          </span>
        </div>
        <Progress value={usagePercentage} className="h-2" />
      </div>

      {shouldShowUpgrade && (
        <Link to="/pricing">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs group"
          >
            Upgrade for more storage
            <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
          </Button>
        </Link>
      )}
    </Card>
  );
}

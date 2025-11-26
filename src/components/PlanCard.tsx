import React from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PlanCardProps {
  name: string;
  displayName: string;
  monthlyPrice: number;
  yearlyPrice: number;
  uploadLimit: number;
  features: string[];
  billingCycle: 'monthly' | 'yearly';
  isCurrentPlan?: boolean;
  isPopular?: boolean;
  onSelect?: () => void;
}

export function PlanCard({
  name,
  displayName,
  monthlyPrice,
  yearlyPrice,
  uploadLimit,
  features,
  billingCycle,
  isCurrentPlan = false,
  isPopular = false,
  onSelect,
}: PlanCardProps) {
  const price = billingCycle === 'monthly' ? monthlyPrice : yearlyPrice;
  const displayPrice = price / 100; // Convert from paise to rupees
  const isPremium = name === 'premium';
  const isFree = name === 'free';

  return (
    <Card
      className={cn(
        "relative p-6 transition-all duration-300 hover:shadow-lg",
        isPopular && "border-2 border-primary shadow-md",
        isPremium && "bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20",
        isCurrentPlan && "border-2 border-blue-500"
      )}
    >
      {isPopular && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
          Most Popular
        </Badge>
      )}
      
      <div className="text-center space-y-4">
        <h3 className="text-xl font-bold text-foreground">{displayName}</h3>
        
        <div className="space-y-1">
          <div className="text-4xl font-bold text-foreground">
            ₹{displayPrice}
          </div>
          <div className="text-sm text-muted-foreground">
            {isFree ? 'Forever free' : `per ${billingCycle === 'monthly' ? 'month' : 'year'}`}
          </div>
          {billingCycle === 'yearly' && !isFree && (
            <div className="text-xs text-green-600 dark:text-green-400 font-medium">
              Save 10%
            </div>
          )}
        </div>

        <div className="py-4">
          <div className="text-sm font-medium text-muted-foreground mb-1">
            Upload Limit
          </div>
          <div className="text-2xl font-bold text-foreground">
            {uploadLimit} documents
          </div>
        </div>

        <Button
          onClick={onSelect}
          disabled={isCurrentPlan}
          className={cn(
            "w-full",
            isCurrentPlan && "opacity-60",
            isPopular && "bg-primary hover:bg-primary/90"
          )}
          variant={isPopular ? "default" : "outline"}
        >
          {isCurrentPlan ? 'Current Plan' : isFree ? 'Get Started' : 'Upgrade'}
        </Button>

        <div className="pt-4 space-y-3 text-left">
          {features.map((feature, index) => (
            <div key={index} className="flex items-start gap-2">
              <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <span className="text-sm text-foreground">{feature}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

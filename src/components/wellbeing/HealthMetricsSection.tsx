import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Scale, Target, Percent, Flame, Utensils, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { getBMICategoryColor, getBodyFatCategory } from "@/lib/healthCalculations";

interface HealthMetrics {
  bmi: number;
  bmiCategory: string;
  idealBodyWeight: number;
  weightDiff: number;
  weightStatus: string;
  bodyFatEstimate: number;
  bmr: number;
  dailyCalorieRequirement: number;
}

interface HealthMetricsSectionProps {
  metrics: HealthMetrics;
  currentWeight: number;
  gender: string;
}

export function HealthMetricsSection({ metrics, currentWeight, gender }: HealthMetricsSectionProps) {
  const bodyFatCategory = getBodyFatCategory(metrics.bodyFatEstimate, gender);
  
  const WeightTrendIcon = metrics.weightDiff > 0 
    ? TrendingUp 
    : metrics.weightDiff < 0 
      ? TrendingDown 
      : Minus;

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg flex items-center gap-2">
        <Scale className="h-5 w-5 text-primary" />
        Health Metrics
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* BMI Card */}
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">BMI</span>
              <Scale className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{metrics.bmi}</p>
            <Badge variant="secondary" className={`mt-1 text-xs ${getBMICategoryColor(metrics.bmiCategory)}`}>
              {metrics.bmiCategory}
            </Badge>
          </CardContent>
        </Card>

        {/* Ideal Body Weight Card */}
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Ideal Weight</span>
              <Target className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{metrics.idealBodyWeight} <span className="text-sm font-normal">kg</span></p>
            <div className="flex items-center gap-1 mt-1">
              <WeightTrendIcon className={`h-3 w-3 ${metrics.weightDiff > 0 ? 'text-orange-500' : metrics.weightDiff < 0 ? 'text-yellow-500' : 'text-green-500'}`} />
              <span className="text-xs text-muted-foreground">{metrics.weightStatus}</span>
            </div>
          </CardContent>
        </Card>

        {/* Body Fat Estimate Card */}
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Body Fat</span>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{metrics.bodyFatEstimate}<span className="text-sm font-normal">%</span></p>
            <Badge variant="outline" className="mt-1 text-xs">
              {bodyFatCategory}
            </Badge>
          </CardContent>
        </Card>

        {/* BMR Card */}
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">BMR</span>
              <Flame className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{metrics.bmr.toLocaleString()}</p>
            <span className="text-xs text-muted-foreground">kcal/day (at rest)</span>
          </CardContent>
        </Card>

        {/* Daily Calories Card */}
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Daily Calories</span>
              <Utensils className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{metrics.dailyCalorieRequirement.toLocaleString()}</p>
            <span className="text-xs text-muted-foreground">kcal/day (TDEE)</span>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        * Estimates based on standard formulas (Mifflin-St Jeor for BMR, Devine for IBW). Consult a healthcare provider for precise measurements.
      </p>
    </div>
  );
}
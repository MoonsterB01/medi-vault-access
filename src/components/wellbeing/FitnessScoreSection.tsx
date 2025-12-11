import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trophy, Activity, Moon, Heart, TrendingUp, Stethoscope } from "lucide-react";
import { getScoreLabel, getScoreColor, getScoreBackgroundColor } from "@/lib/healthCalculations";

interface ScoreBreakdown {
  bmi: { score: number; max: number };
  activity: { score: number; max: number };
  sleep: { score: number; max: number };
  heart: { score: number; max: number };
  consistency: { score: number; max: number };
  medical: { score: number; max: number };
}

interface FitnessScoreSectionProps {
  score: number;
  scoreBreakdown: ScoreBreakdown;
}

export function FitnessScoreSection({ score, scoreBreakdown }: FitnessScoreSectionProps) {
  const scoreLabel = getScoreLabel(score);
  const scoreColor = getScoreColor(score);
  const scoreBg = getScoreBackgroundColor(score);

  const breakdownItems = [
    { key: 'bmi', label: 'BMI', icon: Activity, color: 'text-blue-500' },
    { key: 'activity', label: 'Activity', icon: TrendingUp, color: 'text-green-500' },
    { key: 'sleep', label: 'Sleep', icon: Moon, color: 'text-purple-500' },
    { key: 'heart', label: 'Heart Health', icon: Heart, color: 'text-red-500' },
    { key: 'consistency', label: 'Consistency', icon: Trophy, color: 'text-yellow-500' },
    { key: 'medical', label: 'Medical', icon: Stethoscope, color: 'text-cyan-500' },
  ];

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg flex items-center gap-2">
        <Trophy className="h-5 w-5 text-yellow-500" />
        Fitness Score
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Score Gauge */}
        <Card className={scoreBg}>
          <CardContent className="pt-6 pb-4 text-center">
            <div className="relative inline-flex items-center justify-center">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  className="text-muted/20"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${(score / 100) * 352} 352`}
                  strokeLinecap="round"
                  className={scoreColor.replace('text-', 'text-')}
                  style={{ color: score >= 75 ? '#22c55e' : score >= 60 ? '#eab308' : score >= 45 ? '#f97316' : '#ef4444' }}
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className={`text-4xl font-bold ${scoreColor}`}>{score}</span>
                <span className="text-sm text-muted-foreground">/100</span>
              </div>
            </div>
            <p className={`text-lg font-semibold mt-2 ${scoreColor}`}>{scoreLabel}</p>
          </CardContent>
        </Card>

        {/* Score Breakdown */}
        <Card>
          <CardContent className="pt-4 space-y-3">
            <p className="text-sm font-medium text-muted-foreground mb-3">Score Breakdown</p>
            {breakdownItems.map(({ key, label, icon: Icon, color }) => {
              const item = scoreBreakdown[key as keyof ScoreBreakdown];
              const percentage = item.max > 0 ? (item.score / item.max) * 100 : 0;
              const isNegative = item.max === 0;
              
              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${color}`} />
                      <span>{label}</span>
                    </div>
                    <span className={`font-medium ${isNegative && item.score < 0 ? 'text-red-500' : ''}`}>
                      {isNegative ? item.score : `${item.score}/${item.max}`}
                    </span>
                  </div>
                  {!isNegative && (
                    <Progress 
                      value={Math.max(0, percentage)} 
                      className="h-1.5" 
                    />
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
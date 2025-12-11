import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Footprints, Flame, Clock, Loader2, Activity, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { HealthMetricsSection } from "./HealthMetricsSection";
import { FitnessScoreSection } from "./FitnessScoreSection";
import { AIInsightsSection } from "./AIInsightsSection";

interface FitnessRecordTabProps {
  patientId: string;
}

interface FitnessRecord {
  id: string;
  record_date: string;
  steps: number | null;
  workout_type: string | null;
  workout_duration_minutes: number | null;
  calories_burned: number | null;
  distance_km: number | null;
  notes: string | null;
}

interface HealthMetrics {
  bmi: number;
  bmiCategory: string;
  idealBodyWeight: number;
  weightDiff: number;
  weightStatus: string;
  bodyFatEstimate: number;
  bmr: number;
  dailyCalorieRequirement: number;
  fitnessScore: number;
  fitnessScoreLabel: string;
  scoreBreakdown: any;
}

interface AIInsights {
  overallAssessment: string;
  strengths: string[];
  areasToImprove: string[];
  recommendations: { title: string; description: string }[];
  warningSignsToWatch: string[];
}

interface ProfileData {
  heightCm: number;
  weightKg: number;
  age: number;
  gender: string;
  activityLevel: string;
  sleepHours: number;
  restingHeartRate: number | null;
}

const WORKOUT_TYPES = [
  'Walking', 'Running', 'Cycling', 'Swimming', 'Yoga', 'Gym Workout',
  'Home Exercise', 'Sports', 'Dancing', 'Stretching', 'Other'
];

export function FitnessRecordTab({ patientId }: FitnessRecordTabProps) {
  const [records, setRecords] = useState<FitnessRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Health insights state
  const [hasProfile, setHasProfile] = useState(false);
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null);
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  // Form state
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [steps, setSteps] = useState('');
  const [workoutType, setWorkoutType] = useState('');
  const [duration, setDuration] = useState('');
  const [calories, setCalories] = useState('');
  const [distance, setDistance] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchRecords();
    checkProfileAndFetchInsights();
  }, [patientId]);

  const checkProfileAndFetchInsights = async () => {
    try {
      // Check if wellbeing profile exists
      const { data: profile, error: profileError } = await supabase
        .from('wellbeing_profiles')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (profileError || !profile) {
        setHasProfile(false);
        return;
      }

      setHasProfile(true);

      // Check for cached insights
      const { data: cachedInsight } = await supabase
        .from('health_insights')
        .select('*')
        .eq('patient_id', patientId)
        .eq('is_current', true)
        .order('generated_at', { ascending: false })
        .limit(1)
        .single();

      if (cachedInsight) {
        // Use cached data
        setMetrics({
          bmi: cachedInsight.bmi,
          bmiCategory: cachedInsight.bmi_category,
          idealBodyWeight: cachedInsight.ideal_body_weight,
          weightDiff: profile.weight_kg - cachedInsight.ideal_body_weight,
          weightStatus: profile.weight_kg > cachedInsight.ideal_body_weight 
            ? `${(profile.weight_kg - cachedInsight.ideal_body_weight).toFixed(1)} kg over ideal`
            : profile.weight_kg < cachedInsight.ideal_body_weight
              ? `${(cachedInsight.ideal_body_weight - profile.weight_kg).toFixed(1)} kg under ideal`
              : 'At ideal weight',
          bodyFatEstimate: cachedInsight.body_fat_estimate,
          bmr: cachedInsight.bmr,
          dailyCalorieRequirement: cachedInsight.daily_calorie_requirement,
          fitnessScore: cachedInsight.fitness_score,
          fitnessScoreLabel: getScoreLabel(cachedInsight.fitness_score),
          scoreBreakdown: cachedInsight.score_breakdown,
        });
        setInsights(cachedInsight.ai_insights as unknown as AIInsights);
        setProfileData({
          heightCm: profile.height_cm,
          weightKg: profile.weight_kg,
          age: profile.age,
          gender: profile.gender,
          activityLevel: profile.activity_level,
          sleepHours: profile.sleep_hours,
          restingHeartRate: profile.resting_heart_rate,
        });
      } else {
        // Generate new insights
        await generateHealthInsights();
      }
    } catch (error) {
      console.error('Error checking profile:', error);
    }
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Average';
    if (score >= 45) return 'Below Average';
    return 'Needs Improvement';
  };

  const generateHealthInsights = async () => {
    setIsGeneratingInsights(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-health-insights', {
        body: { patientId },
      });

      if (error) throw error;

      if (data.success) {
        setMetrics(data.metrics);
        setInsights(data.insights);
        setProfileData(data.profile);
        toast.success('Health insights generated successfully!');
      } else {
        throw new Error(data.error || 'Failed to generate insights');
      }
    } catch (error: any) {
      console.error('Error generating health insights:', error);
      toast.error(error.message || 'Failed to generate health insights');
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('fitness_records')
        .select('*')
        .eq('patient_id', patientId)
        .order('record_date', { ascending: false })
        .limit(30);

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Error fetching fitness records:', error);
      toast.error('Failed to load fitness records');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setSteps('');
    setWorkoutType('');
    setDuration('');
    setCalories('');
    setDistance('');
    setNotes('');
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('fitness_records')
        .insert({
          patient_id: patientId,
          record_date: date,
          steps: steps ? parseInt(steps) : null,
          workout_type: workoutType || null,
          workout_duration_minutes: duration ? parseInt(duration) : null,
          calories_burned: calories ? parseInt(calories) : null,
          distance_km: distance ? parseFloat(distance) : null,
          notes: notes || null,
        });

      if (error) throw error;

      toast.success('Fitness record saved!');
      setIsDialogOpen(false);
      resetForm();
      fetchRecords();
    } catch (error: any) {
      console.error('Error saving fitness record:', error);
      toast.error(error.message || 'Failed to save record');
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate weekly stats
  const weeklyStats = records.slice(0, 7).reduce(
    (acc, record) => ({
      totalSteps: acc.totalSteps + (record.steps || 0),
      totalCalories: acc.totalCalories + (record.calories_burned || 0),
      totalMinutes: acc.totalMinutes + (record.workout_duration_minutes || 0),
    }),
    { totalSteps: 0, totalCalories: 0, totalMinutes: 0 }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Health Overview Section */}
      {hasProfile ? (
        <>
          {/* Health Metrics */}
          {metrics && profileData && (
            <HealthMetricsSection 
              metrics={metrics} 
              currentWeight={profileData.weightKg}
              gender={profileData.gender}
            />
          )}

          <Separator />

          {/* Fitness Score */}
          {metrics && metrics.scoreBreakdown && (
            <FitnessScoreSection 
              score={metrics.fitnessScore} 
              scoreBreakdown={metrics.scoreBreakdown}
            />
          )}

          <Separator />

          {/* AI Insights */}
          <AIInsightsSection 
            insights={insights}
            isGenerating={isGeneratingInsights}
            onRegenerate={generateHealthInsights}
          />

          <Separator />
        </>
      ) : (
        <Card className="border-dashed border-primary/50 bg-primary/5">
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-primary/50 mb-4" />
            <p className="text-lg font-medium mb-2">Complete Your Profile First</p>
            <p className="text-muted-foreground mb-4">
              To see your health metrics, fitness score, and AI-powered insights,
              please complete your wellbeing profile in the Diet Plan tab.
            </p>
            <p className="text-sm text-muted-foreground">
              Go to <span className="font-medium">Diet Plan</span> tab → Set up your profile
            </p>
          </CardContent>
        </Card>
      )}

      {/* Weekly Activity Stats */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Weekly Activity Summary
        </h3>
        
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 text-center">
              <Footprints className="h-8 w-8 mx-auto text-primary mb-2" />
              <p className="text-2xl font-bold">{weeklyStats.totalSteps.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Steps (7 days)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <Flame className="h-8 w-8 mx-auto text-orange-500 mb-2" />
              <p className="text-2xl font-bold">{weeklyStats.totalCalories.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Calories (7 days)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <Clock className="h-8 w-8 mx-auto text-green-500 mb-2" />
              <p className="text-2xl font-bold">{weeklyStats.totalMinutes}</p>
              <p className="text-sm text-muted-foreground">Minutes (7 days)</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Record Button */}
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Activity Log</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Log Activity
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Fitness Activity</DialogTitle>
              <DialogDescription>
                Record your daily exercise and activity
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="steps">Steps</Label>
                  <Input
                    id="steps"
                    type="number"
                    placeholder="10000"
                    value={steps}
                    onChange={(e) => setSteps(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workoutType">Workout Type</Label>
                  <Select value={workoutType} onValueChange={setWorkoutType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {WORKOUT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (min)</Label>
                  <Input
                    id="duration"
                    type="number"
                    placeholder="30"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="calories">Calories</Label>
                  <Input
                    id="calories"
                    type="number"
                    placeholder="200"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="distance">Distance (km)</Label>
                  <Input
                    id="distance"
                    type="number"
                    step="0.1"
                    placeholder="5"
                    value={distance}
                    onChange={(e) => setDistance(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="How did you feel?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <Button onClick={handleSubmit} disabled={isSaving} className="w-full">
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Record'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Records List */}
      <div className="space-y-2">
        {records.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Footprints className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No fitness records yet</p>
              <p className="text-sm text-muted-foreground">Start logging your activities!</p>
            </CardContent>
          </Card>
        ) : (
          records.map((record) => (
            <Card key={record.id}>
              <CardContent className="py-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">
                      {format(new Date(record.record_date), 'EEEE, MMM d')}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {record.steps && (
                        <Badge variant="secondary">
                          <Footprints className="h-3 w-3 mr-1" />
                          {record.steps.toLocaleString()} steps
                        </Badge>
                      )}
                      {record.workout_type && (
                        <Badge variant="outline">{record.workout_type}</Badge>
                      )}
                      {record.workout_duration_minutes && (
                        <Badge variant="secondary">
                          <Clock className="h-3 w-3 mr-1" />
                          {record.workout_duration_minutes} min
                        </Badge>
                      )}
                      {record.calories_burned && (
                        <Badge variant="secondary">
                          <Flame className="h-3 w-3 mr-1" />
                          {record.calories_burned} kcal
                        </Badge>
                      )}
                    </div>
                    {record.notes && (
                      <p className="text-sm text-muted-foreground mt-2">{record.notes}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
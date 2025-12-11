import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { DietProfileSetup } from "./DietProfileSetup";
import { WeeklyDietDisplay } from "./WeeklyDietDisplay";
import { toast } from "sonner";

interface DietPlanTabProps {
  patientId: string;
}

interface WellbeingProfile {
  id: string;
  height_cm: number;
  weight_kg: number;
  age: number;
  gender: string;
  activity_level: string;
  sleep_hours: number;
  daily_calorie_target: number;
  resting_heart_rate: number;
  dietary_preferences: any;
  food_allergies: string[];
  cuisine_preferences: string[];
  health_goals: string[];
  meal_frequency: number;
  additional_notes: string;
}

interface DietPlan {
  id: string;
  week_start_date: string;
  plan_data: any;
  generated_at: string;
  is_active: boolean;
}

export function DietPlanTab({ patientId }: DietPlanTabProps) {
  const [profile, setProfile] = useState<WellbeingProfile | null>(null);
  const [dietPlan, setDietPlan] = useState<DietPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    fetchProfileAndPlan();
  }, [patientId]);

  const fetchProfileAndPlan = async () => {
    setIsLoading(true);
    try {
      // Fetch wellbeing profile
      const { data: profileData, error: profileError } = await supabase
        .from('wellbeing_profiles')
        .select('*')
        .eq('patient_id', patientId)
        .maybeSingle();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch active diet plan
      if (profileData) {
        const { data: planData, error: planError } = await supabase
          .from('diet_plans')
          .select('*')
          .eq('patient_id', patientId)
          .eq('is_active', true)
          .order('generated_at', { ascending: false })
          .maybeSingle();

        if (planError) throw planError;
        setDietPlan(planData);
      }
    } catch (error) {
      console.error('Error fetching profile/plan:', error);
      toast.error('Failed to load diet plan data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileComplete = async (newProfile: WellbeingProfile) => {
    setProfile(newProfile);
    setShowSetup(false);
    await generateDietPlan(newProfile);
  };

  const generateDietPlan = async (profileData: WellbeingProfile) => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-diet-plan', {
        body: { profile: profileData, patientId }
      });

      if (error) throw error;

      if (data?.plan) {
        setDietPlan(data.plan);
        toast.success('Diet plan generated successfully!');
      }
    } catch (error: any) {
      console.error('Error generating diet plan:', error);
      toast.error(error.message || 'Failed to generate diet plan');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegeneratePlan = async () => {
    if (!profile) return;
    await generateDietPlan(profile);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show setup wizard if no profile exists
  if (!profile || showSetup) {
    return (
      <DietProfileSetup 
        patientId={patientId} 
        existingProfile={profile}
        onComplete={handleProfileComplete}
        onCancel={() => setShowSetup(false)}
      />
    );
  }

  // Show generating state
  if (isGenerating) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="relative">
            <Sparkles className="h-12 w-12 text-primary animate-pulse" />
            <Loader2 className="h-6 w-6 animate-spin text-primary absolute -bottom-1 -right-1" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-foreground">Generating Your Diet Plan</h3>
            <p className="text-muted-foreground mt-1">
              Our AI is creating a personalized Indian diet plan for you...
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              This may take up to 30 seconds
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show diet plan if it exists
  if (dietPlan) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Your Weekly Diet Plan</h2>
            <p className="text-sm text-muted-foreground">
              Generated on {new Date(dietPlan.generated_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowSetup(true)}>
              Update Profile
            </Button>
            <Button size="sm" onClick={handleRegeneratePlan}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Regenerate
            </Button>
          </div>
        </div>
        <WeeklyDietDisplay planData={dietPlan.plan_data} />
      </div>
    );
  }

  // No diet plan yet - show generate option
  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate Your Diet Plan</CardTitle>
        <CardDescription>
          We have your profile. Ready to generate your personalized Indian diet plan?
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4 py-6">
        <Sparkles className="h-16 w-16 text-primary/60" />
        <Button onClick={handleRegeneratePlan} size="lg">
          <Sparkles className="h-4 w-4 mr-2" />
          Generate Diet Plan
        </Button>
        <Button variant="link" onClick={() => setShowSetup(true)}>
          Edit Profile First
        </Button>
      </CardContent>
    </Card>
  );
}

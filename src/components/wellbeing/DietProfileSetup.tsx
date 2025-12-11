import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface DietProfileSetupProps {
  patientId: string;
  existingProfile?: any;
  onComplete: (profile: any) => void;
  onCancel: () => void;
}

const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary', description: 'Little or no exercise, desk job' },
  { value: 'moderate', label: 'Moderate', description: 'Light exercise 1-3 days/week' },
  { value: 'active', label: 'Active', description: 'Hard exercise 3-5 days/week' },
];

const DIETARY_TYPES = [
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'eggetarian', label: 'Eggetarian (Veg + Eggs)' },
  { value: 'non-vegetarian', label: 'Non-Vegetarian' },
];

const CUISINES = [
  'North Indian', 'South Indian', 'Bengali', 'Gujarati', 
  'Maharashtrian', 'Punjabi', 'Rajasthani', 'Pan-Indian'
];

const HEALTH_GOALS = [
  'Weight Loss', 'Weight Gain', 'Muscle Building', 'Maintain Weight',
  'Improve Energy', 'Better Digestion', 'Manage Diabetes', 'Heart Health',
  'PCOD/PCOS Management', 'Thyroid Management'
];

export function DietProfileSetup({ patientId, existingProfile, onComplete, onCancel }: DietProfileSetupProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const totalSteps = 4;

  // Step 1: Basic Parameters
  const [heightCm, setHeightCm] = useState(existingProfile?.height_cm || '');
  const [weightKg, setWeightKg] = useState(existingProfile?.weight_kg || '');
  const [age, setAge] = useState(existingProfile?.age || '');
  const [gender, setGender] = useState(existingProfile?.gender || '');
  const [activityLevel, setActivityLevel] = useState(existingProfile?.activity_level || '');

  // Step 2: Health Metrics
  const [sleepHours, setSleepHours] = useState(existingProfile?.sleep_hours || '');
  const [calorieTarget, setCalorieTarget] = useState(existingProfile?.daily_calorie_target || '');
  const [heartRate, setHeartRate] = useState(existingProfile?.resting_heart_rate || '');

  // Step 3: Dietary Preferences
  const [dietaryType, setDietaryType] = useState(existingProfile?.dietary_preferences?.type || '');
  const [includesEggs, setIncludesEggs] = useState(existingProfile?.dietary_preferences?.eggs || false);
  const [nonVegFrequency, setNonVegFrequency] = useState(existingProfile?.dietary_preferences?.nonVegFrequency || '');
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(existingProfile?.cuisine_preferences || []);
  const [mealFrequency, setMealFrequency] = useState(existingProfile?.meal_frequency || 3);

  // Step 4: Health Goals & Restrictions
  const [selectedGoals, setSelectedGoals] = useState<string[]>(existingProfile?.health_goals || []);
  const [foodAllergies, setFoodAllergies] = useState(existingProfile?.food_allergies?.join(', ') || '');
  const [additionalNotes, setAdditionalNotes] = useState(existingProfile?.additional_notes || '');

  const progress = (step / totalSteps) * 100;

  const canProceed = () => {
    switch (step) {
      case 1:
        return heightCm && weightKg && age && gender && activityLevel;
      case 2:
        return sleepHours;
      case 3:
        return dietaryType;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const profileData = {
        patient_id: patientId,
        height_cm: parseFloat(heightCm),
        weight_kg: parseFloat(weightKg),
        age: parseInt(age),
        gender,
        activity_level: activityLevel,
        sleep_hours: parseFloat(sleepHours),
        daily_calorie_target: calorieTarget ? parseInt(calorieTarget) : null,
        resting_heart_rate: heartRate ? parseInt(heartRate) : null,
        dietary_preferences: {
          type: dietaryType,
          eggs: includesEggs,
          nonVegFrequency: nonVegFrequency || null,
        },
        food_allergies: foodAllergies.split(',').map(a => a.trim()).filter(Boolean),
        cuisine_preferences: selectedCuisines,
        health_goals: selectedGoals,
        meal_frequency: mealFrequency,
        additional_notes: additionalNotes || null,
      };

      let result;
      if (existingProfile?.id) {
        // Update existing profile
        const { data, error } = await supabase
          .from('wellbeing_profiles')
          .update(profileData)
          .eq('id', existingProfile.id)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      } else {
        // Create new profile
        const { data, error } = await supabase
          .from('wellbeing_profiles')
          .insert(profileData)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      }

      toast.success('Profile saved successfully!');
      onComplete(result);
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error(error.message || 'Failed to save profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleCuisine = (cuisine: string) => {
    setSelectedCuisines(prev => 
      prev.includes(cuisine) 
        ? prev.filter(c => c !== cuisine)
        : [...prev, cuisine]
    );
  };

  const toggleGoal = (goal: string) => {
    setSelectedGoals(prev =>
      prev.includes(goal)
        ? prev.filter(g => g !== goal)
        : [...prev, goal]
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Diet Profile Setup
            </CardTitle>
            <CardDescription>
              Step {step} of {totalSteps}: {
                step === 1 ? 'Basic Parameters' :
                step === 2 ? 'Health Metrics' :
                step === 3 ? 'Dietary Preferences' :
                'Health Goals & Restrictions'
              }
            </CardDescription>
          </div>
          {existingProfile && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
        <Progress value={progress} className="mt-4" />
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Step 1: Basic Parameters */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="height">Height (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  placeholder="165"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  placeholder="70"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="age">Age (years)</Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="30"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <RadioGroup value={gender} onValueChange={setGender} className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="male" id="male" />
                    <Label htmlFor="male" className="font-normal">Male</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="female" id="female" />
                    <Label htmlFor="female" className="font-normal">Female</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="other" id="other" />
                    <Label htmlFor="other" className="font-normal">Other</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Activity Level</Label>
              <RadioGroup value={activityLevel} onValueChange={setActivityLevel} className="space-y-2">
                {ACTIVITY_LEVELS.map((level) => (
                  <div key={level.value} className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                    <RadioGroupItem value={level.value} id={level.value} className="mt-1" />
                    <div>
                      <Label htmlFor={level.value} className="font-medium cursor-pointer">{level.label}</Label>
                      <p className="text-sm text-muted-foreground">{level.description}</p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
        )}

        {/* Step 2: Health Metrics */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sleep">Sleep Hours (per night)</Label>
              <Input
                id="sleep"
                type="number"
                step="0.5"
                placeholder="7"
                value={sleepHours}
                onChange={(e) => setSleepHours(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="calories">Daily Calorie Target (optional)</Label>
              <Input
                id="calories"
                type="number"
                placeholder="Leave empty to auto-calculate"
                value={calorieTarget}
                onChange={(e) => setCalorieTarget(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                If you're not sure, leave this empty and we'll calculate it for you
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="heartrate">Resting Heart Rate (bpm, optional)</Label>
              <Input
                id="heartrate"
                type="number"
                placeholder="72"
                value={heartRate}
                onChange={(e) => setHeartRate(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Step 3: Dietary Preferences */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Dietary Type</Label>
              <RadioGroup value={dietaryType} onValueChange={setDietaryType} className="grid grid-cols-2 gap-2">
                {DIETARY_TYPES.map((type) => (
                  <div key={type.value} className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                    <RadioGroupItem value={type.value} id={type.value} />
                    <Label htmlFor={type.value} className="font-normal cursor-pointer">{type.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {dietaryType === 'vegetarian' && (
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="eggs" 
                  checked={includesEggs}
                  onCheckedChange={(checked) => setIncludesEggs(checked as boolean)}
                />
                <Label htmlFor="eggs" className="font-normal">Include eggs in diet</Label>
              </div>
            )}

            {dietaryType === 'non-vegetarian' && (
              <div className="space-y-2">
                <Label>Non-veg Frequency</Label>
                <RadioGroup value={nonVegFrequency} onValueChange={setNonVegFrequency} className="flex flex-wrap gap-2">
                  {['Daily', '3-4 times/week', '1-2 times/week', 'Occasionally'].map((freq) => (
                    <div key={freq} className="flex items-center space-x-2 p-2 rounded-lg border hover:bg-accent/50">
                      <RadioGroupItem value={freq} id={freq} />
                      <Label htmlFor={freq} className="font-normal text-sm cursor-pointer">{freq}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}

            <div className="space-y-2">
              <Label>Preferred Cuisines</Label>
              <div className="flex flex-wrap gap-2">
                {CUISINES.map((cuisine) => (
                  <Button
                    key={cuisine}
                    type="button"
                    variant={selectedCuisines.includes(cuisine) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleCuisine(cuisine)}
                  >
                    {cuisine}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Meals per Day: {mealFrequency}</Label>
              <div className="flex gap-2">
                {[3, 4, 5, 6].map((num) => (
                  <Button
                    key={num}
                    type="button"
                    variant={mealFrequency === num ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMealFrequency(num)}
                  >
                    {num} meals
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Health Goals & Restrictions */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Health Goals (select all that apply)</Label>
              <div className="flex flex-wrap gap-2">
                {HEALTH_GOALS.map((goal) => (
                  <Button
                    key={goal}
                    type="button"
                    variant={selectedGoals.includes(goal) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleGoal(goal)}
                  >
                    {goal}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="allergies">Food Allergies / Restrictions</Label>
              <Input
                id="allergies"
                placeholder="e.g., peanuts, shellfish, gluten (comma-separated)"
                value={foodAllergies}
                onChange={(e) => setFoodAllergies(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any specific requirements, religious restrictions (no onion/garlic), budget preferences, cooking time constraints, etc."
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {step < totalSteps ? (
            <Button onClick={handleNext} disabled={!canProceed()}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Save & Generate Plan
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

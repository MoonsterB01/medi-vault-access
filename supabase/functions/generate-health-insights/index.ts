import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Health calculation functions
function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return Number((weightKg / (heightM * heightM)).toFixed(1));
}

function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

function calculateIdealBodyWeight(heightCm: number, gender: string): number {
  const heightInches = heightCm / 2.54;
  if (gender === 'male') {
    return Number((50 + 2.3 * (heightInches - 60)).toFixed(1));
  } else {
    return Number((45.5 + 2.3 * (heightInches - 60)).toFixed(1));
  }
}

function calculateBodyFatEstimate(bmi: number, age: number, gender: string): number {
  // Adult Body Fat % = (1.20 × BMI) + (0.23 × Age) − (10.8 × sex) − 5.4
  // where sex = 1 for males, 0 for females
  const sexFactor = gender === 'male' ? 1 : 0;
  return Number(((1.20 * bmi) + (0.23 * age) - (10.8 * sexFactor) - 5.4).toFixed(1));
}

function calculateBMR(weightKg: number, heightCm: number, age: number, gender: string): number {
  // Mifflin-St Jeor Equation
  if (gender === 'male') {
    return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + 5);
  } else {
    return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age - 161);
  }
}

function calculateTDEE(bmr: number, activityLevel: string): number {
  const multipliers: Record<string, number> = {
    'sedentary': 1.2,
    'moderate': 1.55,
    'active': 1.725,
  };
  return Math.round(bmr * (multipliers[activityLevel] || 1.2));
}

function calculateFitnessScore(
  bmi: number,
  activityLevel: string,
  sleepHours: number,
  restingHeartRate: number | null,
  fitnessRecordsCount: number,
  medicalConditionsCount: number
): { score: number; breakdown: Record<string, { score: number; max: number }> } {
  const breakdown: Record<string, { score: number; max: number }> = {};
  
  // BMI Score (20 points max) - optimal range 18.5-24.9
  let bmiScore = 0;
  if (bmi >= 18.5 && bmi <= 24.9) {
    bmiScore = 20;
  } else if (bmi < 18.5) {
    bmiScore = Math.max(0, 20 - (18.5 - bmi) * 3);
  } else {
    bmiScore = Math.max(0, 20 - (bmi - 24.9) * 2);
  }
  breakdown.bmi = { score: Math.round(bmiScore), max: 20 };
  
  // Activity Score (25 points max)
  const activityScores: Record<string, number> = {
    'sedentary': 8,
    'moderate': 17,
    'active': 25,
  };
  breakdown.activity = { score: activityScores[activityLevel] || 8, max: 25 };
  
  // Sleep Score (15 points max) - optimal 7-9 hours
  let sleepScore = 0;
  if (sleepHours >= 7 && sleepHours <= 9) {
    sleepScore = 15;
  } else if (sleepHours >= 6 && sleepHours < 7) {
    sleepScore = 10;
  } else if (sleepHours > 9 && sleepHours <= 10) {
    sleepScore = 12;
  } else {
    sleepScore = 5;
  }
  breakdown.sleep = { score: sleepScore, max: 15 };
  
  // Heart Health Score (15 points max) - lower resting heart rate is better
  let heartScore = 10; // default if not provided
  if (restingHeartRate) {
    if (restingHeartRate < 60) heartScore = 15;
    else if (restingHeartRate < 70) heartScore = 13;
    else if (restingHeartRate < 80) heartScore = 10;
    else if (restingHeartRate < 90) heartScore = 7;
    else heartScore = 5;
  }
  breakdown.heart = { score: heartScore, max: 15 };
  
  // Consistency Score (15 points max) - based on fitness records
  const consistencyScore = Math.min(15, Math.round(fitnessRecordsCount * 1.5));
  breakdown.consistency = { score: consistencyScore, max: 15 };
  
  // Medical Conditions Penalty (up to -10 points)
  const medicalPenalty = Math.min(10, medicalConditionsCount * 3);
  breakdown.medical = { score: -medicalPenalty, max: 0 };
  
  const totalScore = Math.max(0, Math.min(100, 
    breakdown.bmi.score + 
    breakdown.activity.score + 
    breakdown.sleep.score + 
    breakdown.heart.score + 
    breakdown.consistency.score + 
    breakdown.medical.score
  ));
  
  return { score: totalScore, breakdown };
}

function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 60) return 'Average';
  if (score >= 45) return 'Below Average';
  return 'Needs Improvement';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { patientId, profileId } = await req.json();
    
    if (!patientId) {
      throw new Error('Patient ID is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch wellbeing profile
    const { data: profile, error: profileError } = await supabase
      .from('wellbeing_profiles')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (profileError || !profile) {
      throw new Error('Wellbeing profile not found. Please complete your profile first.');
    }

    // Fetch patient info and summary
    const { data: patient } = await supabase
      .from('patients')
      .select('name, dob, gender, blood_group, allergies, medical_notes')
      .eq('id', patientId)
      .single();

    // Fetch patient summary for medical data
    const { data: patientSummary } = await supabase
      .from('patient_summaries')
      .select('summary')
      .eq('patient_id', patientId)
      .single();

    // Fetch recent fitness records (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: fitnessRecords } = await supabase
      .from('fitness_records')
      .select('*')
      .eq('patient_id', patientId)
      .gte('record_date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('record_date', { ascending: false });

    // Calculate health metrics
    const heightCm = profile.height_cm;
    const weightKg = profile.weight_kg;
    const age = profile.age;
    const gender = profile.gender || 'male';
    const activityLevel = profile.activity_level || 'sedentary';
    const sleepHours = profile.sleep_hours || 7;
    const restingHeartRate = profile.resting_heart_rate;

    const bmi = calculateBMI(weightKg, heightCm);
    const bmiCategory = getBMICategory(bmi);
    const idealBodyWeight = calculateIdealBodyWeight(heightCm, gender);
    const bodyFatEstimate = calculateBodyFatEstimate(bmi, age, gender);
    const bmr = calculateBMR(weightKg, heightCm, age, gender);
    const dailyCalorieRequirement = calculateTDEE(bmr, activityLevel);

    // Extract medical conditions count from summary
    const summary = patientSummary?.summary as any;
    const diagnosesCount = summary?.diagnoses?.length || 0;
    
    const fitnessScore = calculateFitnessScore(
      bmi,
      activityLevel,
      sleepHours,
      restingHeartRate,
      fitnessRecords?.length || 0,
      diagnosesCount
    );

    const weightDiff = weightKg - idealBodyWeight;
    const weightStatus = weightDiff > 0 
      ? `${Math.abs(weightDiff).toFixed(1)} kg over ideal` 
      : weightDiff < 0 
        ? `${Math.abs(weightDiff).toFixed(1)} kg under ideal`
        : 'At ideal weight';

    // Generate AI insights
    let aiInsights = null;
    
    if (lovableApiKey) {
      const diagnoses = summary?.diagnoses?.map((d: any) => d.name).join(', ') || 'None recorded';
      const medications = summary?.medications?.map((m: any) => m.name).join(', ') || 'None recorded';
      const allergies = patient?.allergies ? JSON.stringify(patient.allergies) : 'None recorded';
      
      const recentWorkouts = fitnessRecords?.slice(0, 7).map((r: any) => 
        `${r.workout_type || 'Activity'}: ${r.workout_duration_minutes || 0} min, ${r.steps || 0} steps`
      ).join('\n') || 'No recent activity logged';

      const prompt = `You are a certified health and wellness advisor. Based on the following health data, provide personalized insights and recommendations in a friendly, encouraging tone.

HEALTH METRICS:
- BMI: ${bmi} (${bmiCategory})
- Current Weight: ${weightKg} kg
- Ideal Body Weight: ${idealBodyWeight} kg (${weightStatus})
- Body Fat Estimate: ${bodyFatEstimate}%
- BMR (Basal Metabolic Rate): ${bmr} kcal/day
- Daily Calorie Requirement: ${dailyCalorieRequirement} kcal/day
- Fitness Score: ${fitnessScore.score}/100 (${getScoreLabel(fitnessScore.score)})

PROFILE:
- Age: ${age} years
- Gender: ${gender}
- Activity Level: ${activityLevel}
- Sleep: ${sleepHours} hours/night
- Resting Heart Rate: ${restingHeartRate || 'Not provided'} bpm
- Health Goals: ${profile.health_goals?.join(', ') || 'Not specified'}

MEDICAL PROFILE:
- Active Conditions: ${diagnoses}
- Medications: ${medications}
- Allergies: ${allergies}

RECENT FITNESS ACTIVITY (Last 7 days):
${recentWorkouts}

Provide your response in the following JSON format:
{
  "overallAssessment": "2-3 sentences summarizing overall health status",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "areasToImprove": ["area 1", "area 2", "area 3"],
  "recommendations": [
    {"title": "Recommendation 1", "description": "Detailed actionable tip"},
    {"title": "Recommendation 2", "description": "Detailed actionable tip"},
    {"title": "Recommendation 3", "description": "Detailed actionable tip"},
    {"title": "Recommendation 4", "description": "Detailed actionable tip"},
    {"title": "Recommendation 5", "description": "Detailed actionable tip"}
  ],
  "warningSignsToWatch": ["warning 1 if applicable", "warning 2 if applicable"]
}

Important: 
- Be specific and personalized based on the data provided
- Consider any medical conditions when making recommendations
- Keep recommendations practical and achievable
- If there are concerning metrics, include appropriate warnings
- Recommendations should be relevant to Indian lifestyle and food habits`;

      try {
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'You are a health and wellness advisor. Always respond with valid JSON only, no markdown formatting.' },
              { role: 'user', content: prompt }
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content;
          
          if (content) {
            // Clean the response - remove markdown code blocks if present
            let cleanedContent = content.trim();
            if (cleanedContent.startsWith('```json')) {
              cleanedContent = cleanedContent.slice(7);
            } else if (cleanedContent.startsWith('```')) {
              cleanedContent = cleanedContent.slice(3);
            }
            if (cleanedContent.endsWith('```')) {
              cleanedContent = cleanedContent.slice(0, -3);
            }
            
            try {
              aiInsights = JSON.parse(cleanedContent.trim());
            } catch (parseError) {
              console.error('Failed to parse AI response as JSON:', parseError);
              // Create a fallback structure
              aiInsights = {
                overallAssessment: content.substring(0, 300),
                strengths: ['Health data collected successfully'],
                areasToImprove: ['Continue tracking your fitness'],
                recommendations: [{ title: 'Stay Active', description: 'Maintain regular physical activity' }],
                warningSignsToWatch: []
              };
            }
          }
        } else {
          console.error('AI API error:', await aiResponse.text());
        }
      } catch (aiError) {
        console.error('AI generation error:', aiError);
      }
    }

    // Mark previous insights as not current
    await supabase
      .from('health_insights')
      .update({ is_current: false })
      .eq('patient_id', patientId);

    // Store the new insights
    const insightData = {
      patient_id: patientId,
      profile_id: profile.id,
      bmi,
      bmi_category: bmiCategory,
      ideal_body_weight: idealBodyWeight,
      body_fat_estimate: bodyFatEstimate,
      bmr,
      daily_calorie_requirement: dailyCalorieRequirement,
      fitness_score: fitnessScore.score,
      score_breakdown: fitnessScore.breakdown,
      ai_insights: aiInsights,
      ai_model_used: 'google/gemini-2.5-flash',
      is_current: true,
    };

    const { data: savedInsight, error: saveError } = await supabase
      .from('health_insights')
      .insert(insightData)
      .select()
      .single();

    if (saveError) {
      console.error('Error saving insights:', saveError);
    }

    return new Response(JSON.stringify({
      success: true,
      metrics: {
        bmi,
        bmiCategory,
        idealBodyWeight,
        weightDiff: Number(weightDiff.toFixed(1)),
        weightStatus,
        bodyFatEstimate,
        bmr,
        dailyCalorieRequirement,
        fitnessScore: fitnessScore.score,
        fitnessScoreLabel: getScoreLabel(fitnessScore.score),
        scoreBreakdown: fitnessScore.breakdown,
      },
      insights: aiInsights,
      profile: {
        heightCm,
        weightKg,
        age,
        gender,
        activityLevel,
        sleepHours,
        restingHeartRate,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating health insights:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WellbeingProfile {
  height_cm: number;
  weight_kg: number;
  age: number;
  gender: string;
  activity_level: string;
  sleep_hours: number;
  daily_calorie_target: number;
  resting_heart_rate: number;
  dietary_preferences: {
    type?: string;
    eggs?: boolean;
    nonVegFrequency?: string;
  };
  food_allergies: string[];
  cuisine_preferences: string[];
  health_goals: string[];
  meal_frequency: number;
  additional_notes?: string;
}

interface PatientSummary {
  diagnoses?: { name: string; status: string }[];
  medications?: { name: string; dose: string }[];
  allergies?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { profile, patientId } = await req.json();
    
    if (!profile || !patientId) {
      return new Response(JSON.stringify({ error: 'Missing profile or patientId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch patient summary for medical context
    const { data: summaryData } = await supabase
      .from('patient_summaries')
      .select('summary')
      .eq('patient_id', patientId)
      .single();

    // Fetch patient allergies
    const { data: patientData } = await supabase
      .from('patients')
      .select('allergies, name')
      .eq('id', patientId)
      .single();

    const patientSummary: PatientSummary = summaryData?.summary || {};
    const patientAllergies = patientData?.allergies || [];

    // Build comprehensive prompt
    const prompt = buildDietPlanPrompt(profile, patientSummary, patientAllergies);

    console.log('Generating diet plan for patient:', patientId);

    // Call Lovable AI Gateway
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert Indian nutritionist and dietitian. You create personalized, practical weekly meal plans based on Indian cuisine. Always respond with valid JSON only, no markdown or extra text.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ error: 'Failed to generate diet plan' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const generatedContent = aiData.choices?.[0]?.message?.content;

    if (!generatedContent) {
      return new Response(JSON.stringify({ error: 'No content generated' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse the generated diet plan
    let dietPlan;
    try {
      // Remove markdown code blocks if present
      let cleanContent = generatedContent.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.slice(7);
      }
      if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.slice(0, -3);
      }
      dietPlan = JSON.parse(cleanContent.trim());
    } catch (parseError) {
      console.error('Failed to parse diet plan:', parseError);
      console.log('Raw content:', generatedContent);
      return new Response(JSON.stringify({ error: 'Failed to parse generated diet plan' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the start of current week (Monday)
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);
    const weekStartDate = monday.toISOString().split('T')[0];

    // Deactivate old plans
    await supabase
      .from('diet_plans')
      .update({ is_active: false })
      .eq('patient_id', patientId);

    // Store the new diet plan
    const { data: savedPlan, error: saveError } = await supabase
      .from('diet_plans')
      .insert({
        patient_id: patientId,
        week_start_date: weekStartDate,
        plan_data: dietPlan,
        ai_model_used: 'google/gemini-2.5-flash',
        is_active: true,
      })
      .select()
      .single();

    if (saveError) {
      console.error('Failed to save diet plan:', saveError);
      return new Response(JSON.stringify({ error: 'Failed to save diet plan' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Diet plan generated and saved successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      plan: savedPlan 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-diet-plan:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function buildDietPlanPrompt(
  profile: WellbeingProfile, 
  patientSummary: PatientSummary,
  patientAllergies: string[]
): string {
  const bmi = profile.weight_kg / Math.pow(profile.height_cm / 100, 2);
  const bmiCategory = bmi < 18.5 ? 'underweight' : bmi < 25 ? 'normal' : bmi < 30 ? 'overweight' : 'obese';

  const medicalConditions = patientSummary.diagnoses?.filter(d => d.status === 'active').map(d => d.name) || [];
  const currentMedications = patientSummary.medications?.map(m => `${m.name} ${m.dose}`) || [];
  const allAllergies = [...(profile.food_allergies || []), ...(patientAllergies || [])];

  return `Create a detailed 7-day Indian diet plan for this person:

**PERSONAL DETAILS:**
- Age: ${profile.age} years
- Gender: ${profile.gender}
- Height: ${profile.height_cm} cm
- Weight: ${profile.weight_kg} kg
- BMI: ${bmi.toFixed(1)} (${bmiCategory})
- Activity Level: ${profile.activity_level}
- Sleep Hours: ${profile.sleep_hours} hours/night
- Target Daily Calories: ${profile.daily_calorie_target || 'Calculate based on profile'}
- Resting Heart Rate: ${profile.resting_heart_rate || 'Not provided'} bpm

**DIETARY PREFERENCES:**
- Type: ${profile.dietary_preferences?.type || 'Not specified'}
- Includes Eggs: ${profile.dietary_preferences?.eggs ? 'Yes' : 'No'}
- Non-veg Frequency: ${profile.dietary_preferences?.nonVegFrequency || 'N/A'}
- Preferred Cuisines: ${profile.cuisine_preferences?.join(', ') || 'Pan-Indian'}
- Meals per Day: ${profile.meal_frequency}

**HEALTH GOALS:**
${profile.health_goals?.map(g => `- ${g}`).join('\n') || '- General wellness'}

**MEDICAL CONSIDERATIONS:**
- Active Conditions: ${medicalConditions.length > 0 ? medicalConditions.join(', ') : 'None reported'}
- Current Medications: ${currentMedications.length > 0 ? currentMedications.join(', ') : 'None'}
- Food Allergies/Restrictions: ${allAllergies.length > 0 ? allAllergies.join(', ') : 'None'}

**ADDITIONAL NOTES:**
${profile.additional_notes || 'None'}

**REQUIREMENTS:**
1. Create a realistic, practical meal plan using commonly available Indian ingredients
2. Include traditional Indian breakfast items (poha, upma, paratha, idli, dosa, etc.)
3. Balance all meals with adequate protein, carbs, fiber, and healthy fats
4. Consider food-drug interactions if medications are mentioned
5. Avoid all allergens strictly
6. Include portion sizes in household measures (katori, roti count, etc.)
7. Add 2-3 healthy snack options for each day
8. Include approximate calories and macros for each meal

**OUTPUT FORMAT (JSON only):**
{
  "weeklyPlan": {
    "monday": {
      "date": "Day 1",
      "meals": {
        "breakfast": {
          "time": "7:00-8:00 AM",
          "items": ["item1", "item2"],
          "recipe": "Brief preparation",
          "calories": 350,
          "protein": "12g",
          "carbs": "45g",
          "fat": "10g"
        },
        "midMorningSnack": { ... },
        "lunch": { ... },
        "eveningSnack": { ... },
        "dinner": { ... }
      },
      "totalCalories": 1800,
      "waterIntake": "8-10 glasses",
      "tips": "Day-specific tip"
    },
    "tuesday": { ... },
    "wednesday": { ... },
    "thursday": { ... },
    "friday": { ... },
    "saturday": { ... },
    "sunday": { ... }
  },
  "weeklyTips": ["tip1", "tip2", "tip3"],
  "groceryList": {
    "vegetables": ["item1", "item2"],
    "fruits": ["item1", "item2"],
    "grains": ["item1", "item2"],
    "proteins": ["item1", "item2"],
    "dairy": ["item1", "item2"],
    "spices": ["item1", "item2"]
  },
  "nutritionSummary": {
    "avgDailyCalories": 1800,
    "proteinPercentage": "20%",
    "carbsPercentage": "55%",
    "fatPercentage": "25%"
  }
}`;
}

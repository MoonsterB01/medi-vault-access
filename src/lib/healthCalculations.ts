// Health calculation utility functions

export function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return Number((weightKg / (heightM * heightM)).toFixed(1));
}

export function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

export function getBMICategoryColor(category: string): string {
  switch (category) {
    case 'Underweight': return 'text-yellow-600 dark:text-yellow-400';
    case 'Normal': return 'text-green-600 dark:text-green-400';
    case 'Overweight': return 'text-orange-600 dark:text-orange-400';
    case 'Obese': return 'text-red-600 dark:text-red-400';
    default: return 'text-muted-foreground';
  }
}

export function calculateIdealBodyWeight(heightCm: number, gender: string): number {
  // Devine Formula
  const heightInches = heightCm / 2.54;
  if (gender === 'male') {
    return Number((50 + 2.3 * (heightInches - 60)).toFixed(1));
  } else {
    return Number((45.5 + 2.3 * (heightInches - 60)).toFixed(1));
  }
}

export function calculateBodyFatEstimate(bmi: number, age: number, gender: string): number {
  // Adult Body Fat % = (1.20 × BMI) + (0.23 × Age) − (10.8 × sex) − 5.4
  // where sex = 1 for males, 0 for females
  const sexFactor = gender === 'male' ? 1 : 0;
  return Number(((1.20 * bmi) + (0.23 * age) - (10.8 * sexFactor) - 5.4).toFixed(1));
}

export function getBodyFatCategory(bodyFat: number, gender: string): string {
  if (gender === 'male') {
    if (bodyFat < 6) return 'Essential';
    if (bodyFat < 14) return 'Athletic';
    if (bodyFat < 18) return 'Fitness';
    if (bodyFat < 25) return 'Average';
    return 'Above Average';
  } else {
    if (bodyFat < 14) return 'Essential';
    if (bodyFat < 21) return 'Athletic';
    if (bodyFat < 25) return 'Fitness';
    if (bodyFat < 32) return 'Average';
    return 'Above Average';
  }
}

export function calculateBMR(weightKg: number, heightCm: number, age: number, gender: string): number {
  // Mifflin-St Jeor Equation
  if (gender === 'male') {
    return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + 5);
  } else {
    return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age - 161);
  }
}

export function calculateTDEE(bmr: number, activityLevel: string): number {
  const multipliers: Record<string, number> = {
    'sedentary': 1.2,
    'moderate': 1.55,
    'active': 1.725,
  };
  return Math.round(bmr * (multipliers[activityLevel] || 1.2));
}

export function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 60) return 'Average';
  if (score >= 45) return 'Below Average';
  return 'Needs Improvement';
}

export function getScoreColor(score: number): string {
  if (score >= 90) return 'text-green-600 dark:text-green-400';
  if (score >= 75) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
  if (score >= 45) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}

export function getScoreBackgroundColor(score: number): string {
  if (score >= 90) return 'bg-green-100 dark:bg-green-900/30';
  if (score >= 75) return 'bg-emerald-100 dark:bg-emerald-900/30';
  if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-900/30';
  if (score >= 45) return 'bg-orange-100 dark:bg-orange-900/30';
  return 'bg-red-100 dark:bg-red-900/30';
}
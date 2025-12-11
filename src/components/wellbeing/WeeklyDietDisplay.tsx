import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Apple, Coffee, Moon, Sun, Sunset, UtensilsCrossed, 
  Droplets, Lightbulb, ShoppingCart, PieChart 
} from "lucide-react";

interface WeeklyDietDisplayProps {
  planData: any;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS: Record<string, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};

const MEAL_ICONS: Record<string, any> = {
  breakfast: Sun,
  midMorningSnack: Coffee,
  lunch: UtensilsCrossed,
  eveningSnack: Sunset,
  dinner: Moon,
};

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  midMorningSnack: 'Mid-Morning Snack',
  lunch: 'Lunch',
  eveningSnack: 'Evening Snack',
  dinner: 'Dinner',
};

export function WeeklyDietDisplay({ planData }: WeeklyDietDisplayProps) {
  const [activeDay, setActiveDay] = useState('monday');
  const [viewMode, setViewMode] = useState<'daily' | 'overview'>('daily');

  if (!planData?.weeklyPlan) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">No diet plan data available</p>
        </CardContent>
      </Card>
    );
  }

  const { weeklyPlan, weeklyTips, groceryList, nutritionSummary } = planData;

  return (
    <div className="space-y-4">
      {/* View Toggle */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'daily' | 'overview')}>
        <TabsList>
          <TabsTrigger value="daily">Daily View</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>

        {/* Daily View */}
        <TabsContent value="daily" className="space-y-4">
          {/* Day Selector */}
          <div className="flex gap-1 overflow-x-auto pb-2">
            {DAYS.map((day) => (
              <button
                key={day}
                onClick={() => setActiveDay(day)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  activeDay === day 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted hover:bg-muted/80 text-foreground'
                }`}
              >
                {DAY_LABELS[day]}
              </button>
            ))}
          </div>

          {/* Day's Meals */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="capitalize">{activeDay}</CardTitle>
                <Badge variant="secondary">
                  {weeklyPlan[activeDay]?.totalCalories || '~'} kcal
                </Badge>
              </div>
              {weeklyPlan[activeDay]?.waterIntake && (
                <CardDescription className="flex items-center gap-1">
                  <Droplets className="h-4 w-4" />
                  {weeklyPlan[activeDay].waterIntake}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible defaultValue="breakfast" className="space-y-2">
                {Object.entries(weeklyPlan[activeDay]?.meals || {}).map(([mealKey, meal]: [string, any]) => {
                  const Icon = MEAL_ICONS[mealKey] || Apple;
                  return (
                    <AccordionItem key={mealKey} value={mealKey} className="border rounded-lg px-3">
                      <AccordionTrigger className="hover:no-underline py-3">
                        <div className="flex items-center gap-3">
                          <Icon className="h-5 w-5 text-primary" />
                          <div className="text-left">
                            <p className="font-medium">{MEAL_LABELS[mealKey] || mealKey}</p>
                            <p className="text-xs text-muted-foreground">{meal?.time}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="ml-auto mr-2">
                          {meal?.calories} kcal
                        </Badge>
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-4">
                        <div className="space-y-3">
                          {/* Items */}
                          <div>
                            <p className="text-sm font-medium mb-1">Items:</p>
                            <ul className="list-disc list-inside text-sm text-muted-foreground">
                              {meal?.items?.map((item: string, idx: number) => (
                                <li key={idx}>{item}</li>
                              ))}
                            </ul>
                          </div>

                          {/* Recipe */}
                          {meal?.recipe && (
                            <div>
                              <p className="text-sm font-medium mb-1">Preparation:</p>
                              <p className="text-sm text-muted-foreground">{meal.recipe}</p>
                            </div>
                          )}

                          {/* Macros */}
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary">P: {meal?.protein}</Badge>
                            <Badge variant="secondary">C: {meal?.carbs}</Badge>
                            <Badge variant="secondary">F: {meal?.fat}</Badge>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>

              {/* Day Tip */}
              {weeklyPlan[activeDay]?.tips && (
                <div className="mt-4 p-3 bg-primary/10 rounded-lg flex items-start gap-2">
                  <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <p className="text-sm">{weeklyPlan[activeDay].tips}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Nutrition Summary */}
          {nutritionSummary && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <PieChart className="h-5 w-5" />
                  Nutrition Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-primary">{nutritionSummary.avgDailyCalories}</p>
                    <p className="text-sm text-muted-foreground">Avg Daily Calories</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{nutritionSummary.proteinPercentage}</p>
                    <p className="text-sm text-muted-foreground">Protein</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{nutritionSummary.carbsPercentage}</p>
                    <p className="text-sm text-muted-foreground">Carbs</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{nutritionSummary.fatPercentage}</p>
                    <p className="text-sm text-muted-foreground">Fat</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Weekly Tips */}
          {weeklyTips && weeklyTips.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Lightbulb className="h-5 w-5" />
                  Weekly Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {weeklyTips.map((tip: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="text-sm">{tip}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Grocery List */}
          {groceryList && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShoppingCart className="h-5 w-5" />
                  Grocery List
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(groceryList).map(([category, items]: [string, any]) => (
                      <div key={category}>
                        <h4 className="font-medium capitalize mb-2">{category}</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {items?.map((item: string, idx: number) => (
                            <li key={idx} className="flex items-center gap-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

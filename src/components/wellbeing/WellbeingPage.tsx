import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Apple, Dumbbell, Leaf, Pill } from "lucide-react";
import { DietPlanTab } from "./DietPlanTab";
import { FitnessRecordTab } from "./FitnessRecordTab";
import { HomeRemediesTab } from "./HomeRemediesTab";
import { MedicineTrackingTab } from "./MedicineTrackingTab";

interface WellbeingPageProps {
  patientId: string;
}

export function WellbeingPage({ patientId }: WellbeingPageProps) {
  const [activeTab, setActiveTab] = useState("diet");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Well-being</h1>
        <p className="text-muted-foreground">
          Manage your diet, fitness, and overall health
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="diet" className="flex items-center gap-2">
            <Apple className="h-4 w-4" />
            <span className="hidden sm:inline">Diet Plan</span>
            <span className="sm:hidden">Diet</span>
          </TabsTrigger>
          <TabsTrigger value="fitness" className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4" />
            <span className="hidden sm:inline">Fitness</span>
            <span className="sm:hidden">Fit</span>
          </TabsTrigger>
          <TabsTrigger value="remedies" className="flex items-center gap-2">
            <Leaf className="h-4 w-4" />
            <span className="hidden sm:inline">Home Remedies</span>
            <span className="sm:hidden">Remedies</span>
          </TabsTrigger>
          <TabsTrigger value="medicine" className="flex items-center gap-2">
            <Pill className="h-4 w-4" />
            <span className="hidden sm:inline">Medicine Tracking</span>
            <span className="sm:hidden">Meds</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="diet" className="space-y-4">
          <DietPlanTab patientId={patientId} />
        </TabsContent>

        <TabsContent value="fitness" className="space-y-4">
          <FitnessRecordTab patientId={patientId} />
        </TabsContent>

        <TabsContent value="remedies" className="space-y-4">
          <HomeRemediesTab />
        </TabsContent>

        <TabsContent value="medicine" className="space-y-4">
          <MedicineTrackingTab patientId={patientId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

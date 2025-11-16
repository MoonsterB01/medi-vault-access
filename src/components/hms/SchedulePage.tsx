import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AppointmentScheduleView from "./AppointmentScheduleView";
import DoctorScheduleSetup from "./DoctorScheduleSetup";

export default function SchedulePage({ hospitalData }: { hospitalData: any }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Schedule Management</h2>
        <p className="text-muted-foreground">Manage doctor schedules and appointments</p>
      </div>

      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calendar">Appointment Schedule</TabsTrigger>
          <TabsTrigger value="setup">Slot Setup</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <AppointmentScheduleView hospitalData={hospitalData} />
        </TabsContent>

        <TabsContent value="setup" className="space-y-4">
          <DoctorScheduleSetup hospitalData={hospitalData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

import AppointmentTracker from "@/components/AppointmentTracker";

interface MobileAppointmentsTabProps {
  user: any;
}

export function MobileAppointmentsTab({ user }: MobileAppointmentsTabProps) {
  return (
    <div className="w-full">
      <AppointmentTracker user={user} />
    </div>
  );
}

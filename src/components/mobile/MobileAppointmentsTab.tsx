import AppointmentTracker from "@/components/AppointmentTracker";

interface MobileAppointmentsTabProps {
  user: any;
  targetPatientId?: string;
  canManageAppointments: boolean;
}

export function MobileAppointmentsTab({ user, targetPatientId, canManageAppointments }: MobileAppointmentsTabProps) {
  return (
    <div className="w-full">
      <AppointmentTracker
        user={user}
        targetPatientId={targetPatientId}
        canManageAppointments={canManageAppointments}
      />
    </div>
  );
}

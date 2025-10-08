import AppointmentTracker from "@/components/AppointmentTracker";

interface PatientAppointmentsProps {
  user: any;
}

export default function PatientAppointments({ user }: PatientAppointmentsProps) {
  return (
    <div className="p-6">
      {user && <AppointmentTracker user={user} />}
    </div>
  );
}
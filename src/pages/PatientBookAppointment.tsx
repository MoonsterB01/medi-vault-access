import AppointmentBooking from "@/components/AppointmentBooking";

interface PatientBookAppointmentProps {
  user: any;
}

export default function PatientBookAppointment({ user }: PatientBookAppointmentProps) {
  return (
    <div className="p-6">
      {user && <AppointmentBooking user={user} />}
    </div>
  );
}
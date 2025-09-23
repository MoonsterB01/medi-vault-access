import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import PatientDashboardLayout from "./PatientDashboardLayout";
import AppointmentTracker from "@/components/AppointmentTracker";

export default function PatientAppointments() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (userData) {
        setUser(userData);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <PatientDashboardLayout>
      <div className="p-6">
        {user && <AppointmentTracker user={user} />}
      </div>
    </PatientDashboardLayout>
  );
}
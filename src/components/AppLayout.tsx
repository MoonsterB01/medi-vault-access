import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { User, LogOut } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import NotificationCenter from "@/components/NotificationCenter";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * @interface AppLayoutProps
 * @description Defines the props for the AppLayout component.
 * @property {React.ReactElement} children - The main content to be rendered within the layout.
 * @property {'patient' | 'hospital_staff' | 'admin' | 'doctor' | 'family_member'} userRole - The role of the current user, which determines the sidebar content.
 */
interface AppLayoutProps {
  children: React.ReactElement;
  userRole: 'patient' | 'hospital_staff' | 'admin' | 'doctor' | 'family_member';
}

/**
 * @function AppLayout
 * @description The main layout component for authenticated pages. It provides a consistent
 * structure with a sidebar and header. It fetches user and patient data, handles loading
 * and authentication states, and provides a sign-out functionality.
 * @param {AppLayoutProps} props - The props for the component.
 * @returns {JSX.Element} - The rendered AppLayout component.
 */
export default function AppLayout({ children, userRole }: AppLayoutProps) {
  const [user, setUser] = useState<any>(null);
  const [patientData, setPatientData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const checkUserAndPatientData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const usersTable = supabase.from('users') as any;
      
      const userResult = await usersTable
        .select('id, email, name, role, created_at, updated_at, user_shareable_id')
        .eq('id', user.id)
        .single();

      // Fetch patient via family_access join to match current schema (no patients.user_id)
      const { data: familyAccess } = await supabase
        .from('family_access')
        .select(`
          patient_id,
          patients:patient_id (
            id, name, dob, gender, primary_contact, hospital_id, created_by, shareable_id
          )
        `)
        .eq('user_id', user.id)
        .eq('can_view', true);

      if (userResult.data) {
        setUser(userResult.data);
      }

      const patients = (familyAccess || []).map((fa: any) => fa.patients).filter(Boolean);
      if (patients.length > 0) {
        setPatientData(patients[0]);
      }

      setLoading(false);
    };
    checkUserAndPatientData();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar user={user} patientData={patientData} userRole={userRole} />

        <div className="flex-1 flex flex-col">
          <header className="h-16 flex items-center justify-between px-6 bg-card border-b shadow-sm">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div className="flex items-center gap-3">
                <User className="h-6 w-6 text-primary" />
                <div>
                  <h1 className="text-xl font-semibold">MediVault</h1>
                  <p className="text-sm text-muted-foreground">Welcome, {user?.name}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <NotificationCenter user={user} />
              <ThemeToggle />
              <Button onClick={handleSignOut} variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto">
            {React.cloneElement(children, { user })}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
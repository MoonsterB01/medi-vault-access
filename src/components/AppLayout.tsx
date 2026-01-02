import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import NotificationCenter from "@/components/NotificationCenter";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { ErrorBoundary } from "@/components/ErrorBoundary";

/**
 * @interface AppLayoutProps
 * @description Defines the props for the AppLayout component.
 * @property {React.ReactElement} children - The main content to be rendered within the layout.
 * @property {'patient' | 'hospital_staff' | 'admin' | 'doctor'} userRole - The role of the current user, which determines the sidebar content.
 */
interface AppLayoutProps {
  children: React.ReactElement;
  userRole: 'patient' | 'hospital_staff' | 'admin' | 'doctor';
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

      // Fetch patient via created_by
      const { data: patients } = await supabase
        .from('patients')
        .select('id, name, dob, gender, primary_contact, hospital_id, created_by, shareable_id')
        .eq('created_by', user.id);

      if (userResult.data) {
        setUser(userResult.data);
      }

      if (patients && patients.length > 0) {
        setPatientData(patients[0]);
      }

      setLoading(false);
    };
    checkUserAndPatientData();
  }, [navigate]);

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
    <ErrorBoundary
      fallbackTitle="Application Error"
      fallbackMessage="An unexpected error occurred in the application layout. Please try refreshing the page."
    >
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar user={user} patientData={patientData} userRole={userRole} />

          <div className="flex-1 flex flex-col">
            <header className="h-14 flex items-center justify-between px-4 bg-background border-b border-border">
              <div className="flex items-center gap-3">
                <SidebarTrigger />
              </div>
              <div className="flex items-center gap-2">
                <NotificationCenter user={user} />
                <ThemeToggle />
              </div>
            </header>

            <main className="flex-1 overflow-y-auto">
              <ErrorBoundary
                fallbackTitle="Page Error"
                fallbackMessage="An error occurred on this page. The issue has been logged."
              >
                {React.cloneElement(children, { user })}
              </ErrorBoundary>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </ErrorBoundary>
  );
}
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { User, LogOut, Menu, X } from "lucide-react";
import { Sidebar, SidebarContent, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Users, Share2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import NotificationCenter from "@/components/NotificationCenter";
import { AppSidebar } from "@/components/AppSidebar";

interface PatientDashboardLayoutProps {
  children: React.ReactNode;
}

export default function PatientDashboardLayout({ children }: PatientDashboardLayoutProps) {
  const [user, setUser] = useState<any>(null);
  const [patientData, setPatientData] = useState<any>(null);
  const [availablePatients, setAvailablePatients] = useState<any[]>([]);
  const [authLoading, setAuthLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (userError) {
        console.error('Error fetching user data:', userError);
        toast({
          title: "Error",
          description: "Failed to fetch user profile. Please try again.",
          variant: "destructive",
        });
        setAuthLoading(false);
        return;
      }

      if (!userData) {
        toast({
          title: "Profile Not Found",
          description: "Your user profile was not found. Please contact support.",
          variant: "destructive",
        });
        setAuthLoading(false);
        return;
      }

      if (userData.role === 'hospital_staff' || userData.role === 'admin') {
        navigate('/hospital-dashboard');
        return;
      }

      setUser(userData);
      await fetchPatientData(user.id);
    } catch (error) {
      console.error('Auth error:', error);
      toast({
        title: "Authentication Error",
        description: "There was an error loading your account. Please try signing in again.",
        variant: "destructive",
      });
    } finally {
      setAuthLoading(false);
    }
  };

  const fetchPatientData = async (userId: string) => {
    try {
      const { data: familyAccess, error: faErr } = await supabase
        .from('family_access')
        .select(`
          patient_id,
          patients:patient_id (
            id,
            name,
            dob,
            gender,
            primary_contact,
            hospital_id,
            created_by,
            created_at,
            updated_at,
            shareable_id
          )
        `)
        .eq('user_id', userId)
        .eq('can_view', true);

      if (faErr) {
        console.error('family_access fetch error:', faErr);
        toast({
          title: "Database Error",
          description: `Access check failed: ${faErr.message}`,
          variant: "destructive",
        });
        return;
      }

      if (!familyAccess || familyAccess.length === 0) {
        toast({
          title: "No Patient Record",
          description: "No patient record found for your account.",
          variant: "destructive",
        });
        return;
      }

      const patients = familyAccess
        .map(access => access.patients)
        .filter(Boolean);

      setAvailablePatients(patients);

      if (patients.length === 1) {
        setPatientData(patients[0]);
      } else if (patients.length > 1) {
        toast({
          title: "Multiple Patient Access",
          description: `You have access to ${patients.length} patient records. Please select one to view.`,
        });
      }
    } catch (error) {
      console.error('Error in fetchPatientData:', error);
      toast({
        title: "Unexpected Error",
        description: "An unexpected error occurred while loading your data.",
        variant: "destructive",
      });
    }
  };

  const handlePatientSelect = async (patient: any) => {
    setPatientData(patient);
    toast({
      title: "Patient Selected",
      description: `Now viewing records for ${patient.name}`,
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const copyShareableId = (id: string, type: string) => {
    navigator.clipboard.writeText(id);
    toast({
      title: "Copied!",
      description: `${type} ID copied to clipboard`,
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar user={user} patientData={patientData} />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-16 flex items-center justify-between px-6 bg-card border-b shadow-sm">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div className="flex items-center gap-3">
                <User className="h-6 w-6 text-primary" />
                <div>
                  <h1 className="text-xl font-semibold">MediLock Dashboard</h1>
                  <p className="text-sm text-muted-foreground">Welcome, {user.name}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <NotificationCenter user={user} />
              <Button onClick={handleSignOut} variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </header>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full flex">
              {/* Patient Info Sidebar */}
              <aside className="w-80 bg-card border-r p-6 overflow-y-auto">
                <div className="space-y-6">
                  {/* User's Personal Unique ID */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4" />
                        Your Unique ID
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Your personal identifier as {user?.role?.replace('_', ' ')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 p-3 bg-accent/20 border rounded-lg">
                        <code className="flex-1 font-mono text-sm font-bold">
                          {user?.user_shareable_id || 'No ID assigned'}
                        </code>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => copyShareableId(user?.user_shareable_id, 'User')}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Patient Selector */}
                  {availablePatients.length > 1 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <Users className="h-4 w-4" />
                          Patient Profiles
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Select 
                          value={patientData?.id || ""} 
                          onValueChange={(patientId) => {
                            const patient = availablePatients.find(p => p.id === patientId);
                            if (patient) {
                              handlePatientSelect(patient);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select patient" />
                          </SelectTrigger>
                          <SelectContent>
                            {availablePatients.map((patient) => (
                              <SelectItem key={patient.id} value={patient.id}>
                                {patient.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>
                  )}

                  {/* Patient Information */}
                  {patientData && (
                    <>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Patient Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          <div><strong>Name:</strong> {patientData.name}</div>
                          <div><strong>DOB:</strong> {patientData.dob}</div>
                          <div><strong>Gender:</strong> {patientData.gender}</div>
                          <div><strong>Contact:</strong> {patientData.primary_contact}</div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-sm">
                            <Share2 className="h-4 w-4" />
                            Patient Shareable ID
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Share with others to let them upload documents
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-2 p-3 bg-primary/10 border rounded-lg">
                            <code className="flex-1 font-mono text-sm font-bold text-primary">
                              {patientData.shareable_id}
                            </code>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => copyShareableId(patientData.shareable_id, 'Patient')}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  )}
                </div>
              </aside>

              {/* Main Content */}
              <main className="flex-1 overflow-y-auto">
                {children}
              </main>
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
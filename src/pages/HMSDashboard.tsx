import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  LayoutDashboard, 
  Calendar, 
  CreditCard, 
  BedDouble, 
  Stethoscope, 
  FileText, 
  Pill, 
  FlaskConical, 
  BarChart3, 
  Settings,
  LogOut,
  Building2
} from "lucide-react";
import OverviewPage from "@/components/hms/OverviewPage";
import SchedulePage from "@/components/hms/SchedulePage";
import BillingPage from "@/components/hms/BillingPage";
import IPDPage from "@/components/hms/IPDPage";
import OPDPage from "@/components/hms/OPDPage";
import EHRPage from "@/components/hms/EHRPage";
import PharmacyPage from "@/components/hms/PharmacyPage";
import LaboratoryPage from "@/components/hms/LaboratoryPage";
import ReportsPage from "@/components/hms/ReportsPage";
import SettingsPage from "@/components/hms/SettingsPage";

type Module = 'overview' | 'schedule' | 'billing' | 'ipd' | 'opd' | 'ehr' | 'pharmacy' | 'laboratory' | 'reports' | 'settings';

export default function HMSDashboard() {
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState<Module>('overview');
  const [hospitalData, setHospitalData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/hospital-auth');
        return;
      }

      // Fetch hospital data
      const { data: adminData } = await supabase
        .from('hospital_admins')
        .select('hospital_id, hospitals(*)')
        .eq('user_id', user.id)
        .single();

      if (adminData) {
        setHospitalData(adminData.hospitals);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      navigate('/hospital-auth');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate('/hospital-auth');
  };

  const modules = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'ipd', label: 'IPD', icon: BedDouble },
    { id: 'opd', label: 'OPD', icon: Stethoscope },
    { id: 'ehr', label: 'EHR', icon: FileText },
    { id: 'pharmacy', label: 'Pharmacy', icon: Pill },
    { id: 'laboratory', label: 'Laboratory', icon: FlaskConical },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const renderModule = () => {
    const props = { hospitalData };
    
    switch (activeModule) {
      case 'overview': return <OverviewPage {...props} />;
      case 'schedule': return <SchedulePage {...props} />;
      case 'billing': return <BillingPage {...props} />;
      case 'ipd': return <IPDPage {...props} />;
      case 'opd': return <OPDPage {...props} />;
      case 'ehr': return <EHRPage {...props} />;
      case 'pharmacy': return <PharmacyPage {...props} />;
      case 'laboratory': return <LaboratoryPage {...props} />;
      case 'reports': return <ReportsPage {...props} />;
      case 'settings': return <SettingsPage {...props} />;
      default: return <OverviewPage {...props} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Top Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-card border-b shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Building2 className="h-6 w-6 text-primary" />
              <div>
                <h1 className="font-semibold text-lg">{hospitalData?.name || 'Hospital Management System'}</h1>
                <p className="text-xs text-muted-foreground">Hospital Portal</p>
              </div>
            </div>
            
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
          
          {/* Scrollable Module Navigation */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <Button
                  key={module.id}
                  variant={activeModule === module.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveModule(module.id as Module)}
                  className="gap-2 whitespace-nowrap flex-shrink-0"
                >
                  <Icon className="h-4 w-4" />
                  <span>{module.label}</span>
                </Button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-32 px-4 pb-6 md:px-6">
        {renderModule()}
      </main>
    </div>
  );
}

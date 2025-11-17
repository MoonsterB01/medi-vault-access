import { Button } from "@/components/ui/button";
import { Shield, Users, Hospital, FileText, Lock, Clock, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";
import PublicLayout from "@/components/PublicLayout";

/**
 * @function Index
 * @description The main landing page of the application.
 * @returns {JSX.Element} - The rendered Index page component.
 */
export default function Index() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();
        setUser(userData);
      }
    };
    checkUser();
  }, []);

  const handleGetStarted = () => {
    if (user) {
      if (user.role === 'hospital_staff' || user.role === 'admin') {
        navigate('/hospital-dashboard');
      } else {
        navigate('/patient-dashboard');
      }
    } else {
      navigate('/auth');
    }
  };

  const handleHospitalPortal = () => {
    if (user && (user.role === 'hospital_staff' || user.role === 'admin')) {
      navigate('/hospital-dashboard');
    } else {
      navigate('/auth');
    }
  };

  const handlePatientPortal = () => {
    if (user && user.role === 'patient') {
      navigate('/patient-dashboard');
    } else {
      navigate('/auth');
    }
  };

  return (
    <PublicLayout>
      <header className="container mx-auto px-4 py-16 text-center">
        <div className="flex justify-center mb-6">
          <img src={logo} alt="MediVault Logo" className="h-24 w-24 object-contain" />
        </div>
        <h1 className="text-5xl font-bold mb-4">
          MediVault
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Secure Digital Medical Records Management for Hospitals and Patients
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="px-8 py-3" onClick={handleGetStarted}>
            Get Started
          </Button>
          <Button variant="outline" size="lg" className="px-8 py-3" onClick={() => navigate('/how-it-works')}>
            How It Works
          </Button>
          <Button variant="secondary" size="lg" className="px-8 py-3" onClick={() => navigate('/doctor-auth')}>
            Doctor Portal
          </Button>
          <Button variant="secondary" size="lg" className="px-8 py-3" onClick={() => navigate('/hospital-auth')}>
            Hospital Portal
          </Button>
        </div>
      </header>

      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="bg-card rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center mb-6">
              <Hospital className="h-12 w-12 text-blue-600 mr-4" />
              <h2 className="text-2xl font-bold">For Hospitals</h2>
            </div>
            <p className="text-muted-foreground mb-6">
              Securely upload, manage, and share patient medical records with automated notifications and audit trails.
            </p>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center">
                <Lock className="h-5 w-5 text-green-600 mr-3" />
                <span>HIPAA-compliant security</span>
              </li>
              <li className="flex items-center">
                <FileText className="h-5 w-5 text-green-600 mr-3" />
                <span>Automated report uploads</span>
              </li>
              <li className="flex items-center">
                <Bell className="h-5 w-5 text-green-600 mr-3" />
                <span>Real-time notifications</span>
              </li>
            </ul>
            <Button className="w-full" onClick={handleHospitalPortal}>
              Hospital Portal
            </Button>
          </div>

          <div className="bg-card rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center mb-6">
              <Users className="h-12 w-12 text-blue-600 mr-4" />
              <h2 className="text-2xl font-bold">For Patients</h2>
            </div>
            <p className="text-muted-foreground mb-6">
              Access your complete medical history in a secure timeline view with family sharing capabilities.
            </p>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center">
                <Clock className="h-5 w-5 text-green-600 mr-3" />
                <span>Timeline view of records</span>
              </li>
              <li className="flex items-center">
                <Users className="h-5 w-5 text-green-600 mr-3" />
                <span>Family access sharing</span>
              </li>
              <li className="flex items-center">
                <Shield className="h-5 w-5 text-green-600 mr-3" />
                <span>Secure document access</span>
              </li>
            </ul>
            <Button className="w-full" onClick={handlePatientPortal}>
              Patient Portal
            </Button>
          </div>
        </div>
      </section>

      <section className="bg-muted/40 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            How MediVault Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Secure Upload</h3>
              <p className="text-muted-foreground">
                Hospitals upload patient reports directly to secure cloud storage with automated categorization.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Instant Notification</h3>
              <p className="text-muted-foreground">
                Patients and authorized family members receive immediate notifications of new records.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Access Anywhere</h3>
              <p className="text-muted-foreground">
                View complete medical timeline with severity-based organization and secure document access.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">
          Key Features
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-card p-6 rounded-lg shadow-md">
            <Lock className="h-8 w-8 text-blue-600 mb-4" />
            <h3 className="font-semibold mb-2">Bank-Level Security</h3>
            <p className="text-muted-foreground text-sm">
              End-to-end encryption with role-based access control
            </p>
          </div>
          <div className="bg-card p-6 rounded-lg shadow-md">
            <FileText className="h-8 w-8 text-blue-600 mb-4" />
            <h3 className="font-semibold mb-2">Document Management</h3>
            <p className="text-muted-foreground text-sm">
              Organize by type, date, and severity for easy access
            </p>
          </div>
          <div className="bg-card p-6 rounded-lg shadow-md">
            <Bell className="h-8 w-8 text-blue-600 mb-4" />
            <h3 className="font-semibold mb-2">Smart Notifications</h3>
            <p className="text-muted-foreground text-sm">
              Email and SMS alerts for critical updates
            </p>
          </div>
          <div className="bg-card p-6 rounded-lg shadow-md">
            <Users className="h-8 w-8 text-blue-600 mb-4" />
            <h3 className="font-semibold mb-2">Family Sharing</h3>
            <p className="text-muted-foreground text-sm">
              Grant secure access to family members
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-16 py-8 border-t">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-center items-center gap-6 text-sm text-muted-foreground">
            <a href="/faq" className="hover:text-primary transition-colors">
              FAQ
            </a>
            <a href="/privacy-policy" className="hover:text-primary transition-colors">
              Privacy Policy
            </a>
            <a href="/how-it-works" className="hover:text-primary transition-colors">
              How It Works
            </a>
            <a href="/contact-us" className="hover:text-primary transition-colors">
              Contact Us
            </a>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-4">
            © {new Date().getFullYear()} MediVault. All rights reserved.
          </p>
        </div>
      </footer>
    </PublicLayout>
  );
}

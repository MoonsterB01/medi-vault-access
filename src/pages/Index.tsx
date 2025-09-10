import { Button } from "@/components/ui/button";
import { Shield, Users, Hospital, FileText, Lock, Clock, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function Index() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check if user is already logged in
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
      // Redirect based on user role
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
    if (user && (user.role === 'patient' || user.role === 'family_member')) {
      navigate('/patient-dashboard');
    } else {
      navigate('/auth');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Shield className="h-8 w-8 text-blue-600" />
          <span className="text-xl font-bold">MediVault</span>
        </div>
        <div className="flex gap-4">
          {user ? (
            <Button onClick={() => supabase.auth.signOut()} variant="outline">
              Sign Out
            </Button>
          ) : (
            <Button onClick={() => navigate('/auth')}>
              Sign In
            </Button>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <header className="container mx-auto px-4 py-16 text-center">
        <div className="flex justify-center mb-6">
          <Shield className="h-16 w-16 text-blue-600" />
        </div>
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          MediVault
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Secure Digital Medical Records Management for Hospitals and Patients
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="px-8 py-3" onClick={handleGetStarted}>
            Get Started
          </Button>
          <Button variant="outline" size="lg" className="px-8 py-3" onClick={() => navigate('/how-it-works')}>
            How It Works
          </Button>
        </div>
      </header>

      {/* For Hospitals & Patients Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center mb-6">
              <Hospital className="h-12 w-12 text-blue-600 mr-4" />
              <h2 className="text-2xl font-bold text-gray-900">For Hospitals</h2>
            </div>
            <p className="text-gray-600 mb-6">
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

          <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center mb-6">
              <Users className="h-12 w-12 text-blue-600 mr-4" />
              <h2 className="text-2xl font-bold text-gray-900">For Patients</h2>
            </div>
            <p className="text-gray-600 mb-6">
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

      {/* How It Works Section */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            How MediVault Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Secure Upload</h3>
              <p className="text-gray-600">
                Hospitals upload patient reports directly to secure cloud storage with automated categorization.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Instant Notification</h3>
              <p className="text-gray-600">
                Patients and authorized family members receive immediate notifications of new records.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Access Anywhere</h3>
              <p className="text-gray-600">
                View complete medical timeline with severity-based organization and secure document access.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Key Features
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <Lock className="h-8 w-8 text-blue-600 mb-4" />
            <h3 className="font-semibold mb-2">Bank-Level Security</h3>
            <p className="text-gray-600 text-sm">
              End-to-end encryption with role-based access control
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <FileText className="h-8 w-8 text-blue-600 mb-4" />
            <h3 className="font-semibold mb-2">Document Management</h3>
            <p className="text-gray-600 text-sm">
              Organize by type, date, and severity for easy access
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <Bell className="h-8 w-8 text-blue-600 mb-4" />
            <h3 className="font-semibold mb-2">Smart Notifications</h3>
            <p className="text-gray-600 text-sm">
              Email and SMS alerts for critical updates
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <Users className="h-8 w-8 text-blue-600 mb-4" />
            <h3 className="font-semibold mb-2">Family Sharing</h3>
            <p className="text-gray-600 text-sm">
              Grant secure access to family members
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

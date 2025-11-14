import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import HospitalDashboard from "./pages/HospitalDashboard";
import PatientDashboard from "./pages/PatientDashboard";
import AppLayout from "./components/AppLayout";
import DocumentTimeline from "./pages/DocumentTimeline";
import PublicUpload from "./pages/PublicUpload";
import HowItWorks from "./pages/HowItWorks";
import ContactUs from "./pages/ContactUs";
import NotFound from "./pages/NotFound";
import DoctorAuth from "./pages/DoctorAuth";
import DoctorDashboard from "./pages/DoctorDashboard";
import FAQ from "./pages/FAQ";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import HospitalRegistration from "./pages/HospitalRegistration";
import HospitalAuth from "./pages/HospitalAuth";
import HMSDashboard from "./pages/HMSDashboard";
import HeroBanner from "./components/HeroBanner";
const queryClient = new QueryClient();

/**
 * @function App
 * @description The root component of the application. It sets up the query client, tooltip provider, toaster, and router.
 * @returns {JSX.Element} - The rendered App component.
 */
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HeroBanner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/hospital-dashboard" element={<AppLayout userRole="hospital_staff"><HospitalDashboard /></AppLayout>} />
          <Route path="/patient-dashboard" element={<AppLayout userRole="patient"><PatientDashboard /></AppLayout>} />
          <Route path="/document-timeline" element={<AppLayout userRole="patient"><DocumentTimeline /></AppLayout>} />
          <Route path="/upload" element={<PublicUpload />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/contact-us" element={<ContactUs />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/doctor-auth" element={<DoctorAuth />} />
          <Route path="/doctor-dashboard" element={<AppLayout userRole="doctor"><DoctorDashboard /></AppLayout>} />
          <Route path="/hospital-registration" element={<HospitalRegistration />} />
          <Route path="/hospital-auth" element={<HospitalAuth />} />
          <Route path="/hms-dashboard" element={<HMSDashboard />} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

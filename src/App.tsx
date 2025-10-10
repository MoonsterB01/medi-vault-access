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
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
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
          <Route path="/doctor-auth" element={<DoctorAuth />} />
          <Route path="/doctor-dashboard" element={<AppLayout userRole="doctor"><DoctorDashboard /></AppLayout>} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import HospitalDashboard from "./pages/HospitalDashboard";
import PatientDashboard from "./pages/PatientDashboard";
import DocumentTimeline from "./pages/DocumentTimeline";
import PublicUpload from "./pages/PublicUpload";
import HowItWorks from "./pages/HowItWorks";
import NotFound from "./pages/NotFound";
import DoctorAuth from "./pages/DoctorAuth";
import DoctorDashboard from "./pages/DoctorDashboard";
import PatientDocuments from "./pages/PatientDocuments";
import PatientAppointments from "./pages/PatientAppointments";
import PatientBookAppointment from "./pages/PatientBookAppointment";

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
          <Route path="/hospital-dashboard" element={<HospitalDashboard />} />
          <Route path="/patient-dashboard" element={<PatientDashboard />} />
          <Route path="/patient-dashboard/documents" element={<PatientDocuments />} />
          <Route path="/patient-dashboard/appointments" element={<PatientAppointments />} />
          <Route path="/patient-dashboard/book" element={<PatientBookAppointment />} />
          <Route path="/document-timeline" element={<DocumentTimeline />} />
          <Route path="/upload" element={<PublicUpload />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/doctor-auth" element={<DoctorAuth />} />
          <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

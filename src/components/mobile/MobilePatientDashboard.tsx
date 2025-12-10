import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MobileHeader } from "./MobileHeader";
import { MobileTabContent } from "./MobileTabContent";
import { MobileSummaryTab } from "./MobileSummaryTab";
import { MobileDocumentsTab } from "./MobileDocumentsTab";
import { MobileSearchTab } from "./MobileSearchTab";
import { MobileAppointmentsTab } from "./MobileAppointmentsTab";
import { MobileUploadTab } from "./MobileUploadTab";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { MediBot } from "@/components/MediBot";
import { MissingInfoDialog } from "@/components/MissingInfoDialog";
import AppointmentCalendar from "@/components/AppointmentCalendar";
import AppointmentBooking from "@/components/AppointmentBooking";
import { PatientSummary as PatientSummaryType } from "@/types/patient-summary";
import { PulsingDot } from "@/components/PulsingDot";

interface MobilePatientDashboardProps {
  user: any;
  patientData: any;
  documents: any[];
  prescriptions: any[];
  summary: PatientSummaryType | null;
  isSummaryLoading: boolean;
  summaryError: Error | null;
  subscription: any;
  missingFields: any[];
  isMissingInfoDialogOpen: boolean;
  setMissingInfoDialogOpen: (open: boolean) => void;
  onDeleteDocument: (id: string, filename: string) => void;
  onUploadSuccess: () => void;
  refreshPatientData: () => Promise<void>;
  fetchPatientData: (userId: string) => Promise<void>;
}

export function MobilePatientDashboard({
  user,
  patientData,
  documents,
  prescriptions,
  summary,
  isSummaryLoading,
  summaryError,
  subscription,
  missingFields,
  isMissingInfoDialogOpen,
  setMissingInfoDialogOpen,
  onDeleteDocument,
  onUploadSuccess,
  refreshPatientData,
  fetchPatientData,
}: MobilePatientDashboardProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("summary");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const hash = location.hash.replace('#', '');
    if (hash) {
      setActiveTab(hash);
    }
    // Trigger entrance animation
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, [location.hash]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    navigate(`#${tab}`, { replace: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'summary':
        return (
          <MobileSummaryTab
            summary={summary}
            isLoading={isSummaryLoading}
            error={summaryError}
            onRefresh={refreshPatientData}
          />
        );
      case 'documents':
        return (
          <MobileDocumentsTab
            documents={documents}
            prescriptions={prescriptions}
            onDeleteDocument={onDeleteDocument}
          />
        );
      case 'search':
        return patientData ? (
          <MobileSearchTab patientId={patientData.id} />
        ) : null;
      case 'appointments':
        return <MobileAppointmentsTab user={user} />;
      case 'calendar':
        return <AppointmentCalendar user={user} />;
      case 'book-appointment':
        return <AppointmentBooking user={user} />;
      case 'upload':
        return <MobileUploadTab onUploadSuccess={onUploadSuccess} />;
      default:
        return (
          <MobileSummaryTab
            summary={summary}
            isLoading={isSummaryLoading}
            error={summaryError}
            onRefresh={refreshPatientData}
          />
        );
    }
  };

  return (
    <div 
      className={`mobile-dashboard fixed inset-0 flex flex-col bg-background transition-opacity duration-500 ${
        isLoaded ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Missing info dialog */}
      {patientData && missingFields.length > 0 && (
        <MissingInfoDialog
          patientId={patientData.id}
          missingFields={missingFields}
          open={isMissingInfoDialogOpen}
          onOpenChange={setMissingInfoDialogOpen}
          onUpdate={() => fetchPatientData(user.id)}
        />
      )}

      {/* Sticky Header with status indicator */}
      <div className="relative">
        <MobileHeader
          patientData={patientData}
          user={user}
          subscription={subscription}
        />
        {/* Connected status indicator */}
        <div className="absolute top-3 right-14 flex items-center gap-1.5">
          <PulsingDot color="green" size="sm" />
          <span className="text-xs text-muted-foreground">Synced</span>
        </div>
      </div>

      {/* Scrollable Content Area with animation */}
      <MobileTabContent className="pt-4">
        <div 
          className={`transition-all duration-300 ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          {renderTabContent()}
        </div>
      </MobileTabContent>

      {/* MediBot */}
      {patientData && <MediBot patientId={patientData.id} />}

      {/* Fixed Bottom Navigation with animation */}
      <div 
        className={`transition-all duration-500 ${
          isLoaded ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <MobileBottomNav
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      </div>
    </div>
  );
}
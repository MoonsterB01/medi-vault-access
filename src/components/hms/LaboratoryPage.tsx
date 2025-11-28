import { useState } from "react";
import LaboratoryNavigation, { LabSection } from "./laboratory/LaboratoryNavigation";
import LabBilling from "./laboratory/LabBilling";
import LabWorkOrder from "./laboratory/LabWorkOrder";
import LabBillingHistory from "./laboratory/LabBillingHistory";
import LabHistory from "./laboratory/LabHistory";
import OrderLabTests from "./laboratory/OrderLabTests";
import LabComponent from "./laboratory/LabComponent";
import LabTrashOrders from "./laboratory/LabTrashOrders";

export default function LaboratoryPage({ hospitalData }: { hospitalData: any }) {
  const [activeSection, setActiveSection] = useState<LabSection>("billing");

  const renderSection = () => {
    switch (activeSection) {
      case "billing":
        return <LabBilling hospitalData={hospitalData} />;
      
      case "work-order":
        return <LabWorkOrder hospitalData={hospitalData} />;
      
      case "billing-history":
        return <LabBillingHistory hospitalData={hospitalData} />;
      
      case "lab-history":
        return <LabHistory hospitalData={hospitalData} />;
      
      case "order-tests":
        return <OrderLabTests hospitalData={hospitalData} />;
      
      case "component":
        return <LabComponent hospitalData={hospitalData} />;
      
      case "trash-orders":
        return <LabTrashOrders hospitalData={hospitalData} />;
      
      default:
        return <LabBilling hospitalData={hospitalData} />;
    }
  };

  return (
    <div className="flex h-full">
      <LaboratoryNavigation 
        activeSection={activeSection} 
        onSectionChange={setActiveSection} 
      />
      <div className="flex-1 overflow-auto p-6">
        {renderSection()}
      </div>
    </div>
  );
}

import { useState } from "react";
import PharmacyNavigation, { PharmacySection } from "./pharmacy/PharmacyNavigation";
import MedicineDispensing from "./pharmacy/MedicineDispensing";
import MedicineBilling from "./pharmacy/MedicineBilling";
import BillingHistory from "./pharmacy/BillingHistory";
import InventoryView from "./pharmacy/InventoryView";
import PlaceholderPage from "./pharmacy/PlaceholderPage";

export default function PharmacyPage({ hospitalData }: { hospitalData: any }) {
  const [activeSection, setActiveSection] = useState<PharmacySection>("dispensing");

  const renderSection = () => {
    switch (activeSection) {
      case "dispensing":
        return <MedicineDispensing hospitalData={hospitalData} />;
      
      case "billing":
        return <MedicineBilling hospitalData={hospitalData} />;
      
      case "billing-history":
        return <BillingHistory hospitalData={hospitalData} />;
      
      case "refund-history":
        return <PlaceholderPage title="Refund History" description="Track medicine refunds and returns" />;
      
      case "purchase-list":
        return <PlaceholderPage title="Purchase List" description="Manage medicine purchases from suppliers" />;
      
      case "inventory":
        return <InventoryView hospitalData={hospitalData} />;
      
      case "supplier-list":
        return <PlaceholderPage title="Supplier List" description="Manage supplier information" />;
      
      case "product-list":
        return <PlaceholderPage title="Product List" description="Master list of all medicines" />;
      
      case "package-units":
        return <PlaceholderPage title="Package Unit Master" description="Define medicine package units" />;
      
      case "inventory-return":
        return <PlaceholderPage title="Inventory Return" description="Process returns to suppliers" />;
      
      case "trash-orders":
        return <PlaceholderPage title="Trash Orders" description="View and restore deleted orders" />;
      
      default:
        return <MedicineDispensing hospitalData={hospitalData} />;
    }
  };

  return (
    <div className="flex h-full">
      <PharmacyNavigation 
        activeSection={activeSection} 
        onSectionChange={setActiveSection} 
      />
      <div className="flex-1 overflow-auto p-6">
        {renderSection()}
      </div>
    </div>
  );
}

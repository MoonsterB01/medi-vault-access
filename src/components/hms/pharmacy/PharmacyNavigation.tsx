import { cn } from "@/lib/utils";
import { 
  Pill, 
  Receipt, 
  History, 
  RotateCcw, 
  ShoppingCart, 
  Package, 
  Users, 
  ListChecks,
  Box,
  PackageOpen,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export type PharmacySection = 
  | "dispensing" 
  | "billing" 
  | "billing-history"
  | "refund-history"
  | "purchase-list"
  | "inventory"
  | "supplier-list"
  | "product-list"
  | "package-units"
  | "inventory-return"
  | "trash-orders";

interface PharmacyNavigationProps {
  activeSection: PharmacySection;
  onSectionChange: (section: PharmacySection) => void;
}

const navigationItems = [
  { id: "dispensing" as PharmacySection, label: "Medicine Dispensing", icon: Pill },
  { id: "billing" as PharmacySection, label: "Medicine Billing", icon: Receipt },
  { id: "billing-history" as PharmacySection, label: "Billing History", icon: History },
  { id: "refund-history" as PharmacySection, label: "Refund History", icon: RotateCcw },
  { id: "purchase-list" as PharmacySection, label: "Purchase List", icon: ShoppingCart },
  { id: "inventory" as PharmacySection, label: "Inventory", icon: Package },
  { id: "supplier-list" as PharmacySection, label: "Supplier List", icon: Users },
  { id: "product-list" as PharmacySection, label: "Product List", icon: ListChecks },
  { id: "package-units" as PharmacySection, label: "Package Unit Master", icon: Box },
  { id: "inventory-return" as PharmacySection, label: "Inventory Return", icon: PackageOpen },
  { id: "trash-orders" as PharmacySection, label: "Trash Orders", icon: Trash2 },
];

export default function PharmacyNavigation({ activeSection, onSectionChange }: PharmacyNavigationProps) {
  return (
    <div className="w-64 border-r border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-lg">Pharmacy Management</h3>
      </div>
      <ScrollArea className="h-[calc(100vh-12rem)]">
        <div className="p-2 space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            
            return (
              <Button
                key={item.id}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 h-auto py-3",
                  isActive && "bg-secondary text-secondary-foreground font-medium"
                )}
                onClick={() => onSectionChange(item.id)}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm">{item.label}</span>
              </Button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

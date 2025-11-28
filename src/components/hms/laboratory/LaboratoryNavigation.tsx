import { cn } from "@/lib/utils";
import { 
  Receipt, 
  ClipboardList, 
  History, 
  FileText, 
  TestTube, 
  Settings2,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export type LabSection = 
  | "billing" 
  | "work-order" 
  | "billing-history"
  | "lab-history"
  | "order-tests"
  | "component"
  | "trash-orders";

interface LaboratoryNavigationProps {
  activeSection: LabSection;
  onSectionChange: (section: LabSection) => void;
}

const navigationItems = [
  { id: "billing" as LabSection, label: "Lab Billing", icon: Receipt },
  { id: "work-order" as LabSection, label: "Lab Work Order", icon: ClipboardList },
  { id: "billing-history" as LabSection, label: "Lab Billing History", icon: History },
  { id: "lab-history" as LabSection, label: "Lab History", icon: FileText },
  { id: "order-tests" as LabSection, label: "Order Lab Tests", icon: TestTube },
  { id: "component" as LabSection, label: "Lab Component", icon: Settings2 },
  { id: "trash-orders" as LabSection, label: "Trash Orders", icon: Trash2 },
];

export default function LaboratoryNavigation({ activeSection, onSectionChange }: LaboratoryNavigationProps) {
  return (
    <div className="w-64 border-r border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-lg">Laboratory Management</h3>
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

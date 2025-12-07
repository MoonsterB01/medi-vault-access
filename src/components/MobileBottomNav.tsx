import { Bot, FileText, Search, Calendar, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function MobileBottomNav({ activeTab, onTabChange }: MobileBottomNavProps) {
  const mainTabs = [
    { value: "summary", icon: Bot, label: "Summary" },
    { value: "documents", icon: FileText, label: "Docs" },
    { value: "search", icon: Search, label: "Search" },
    { value: "appointments", icon: Calendar, label: "Appts" },
    { value: "upload", icon: Upload, label: "Upload" },
  ];

  return (
    <nav className="flex-shrink-0 bg-card border-t border-border safe-area-bottom">
      <div className="grid grid-cols-5 gap-1 px-2 py-2">
        {mainTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onTabChange(tab.value)}
            className={cn(
              "flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all min-h-[56px]",
              activeTab === tab.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground active:bg-accent"
            )}
          >
            <tab.icon className="h-5 w-5 mb-1" />
            <span className="text-[10px] font-medium leading-tight">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

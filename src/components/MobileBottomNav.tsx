import { Bot, FileText, Search, Calendar, Upload, CalendarPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface MobileBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function MobileBottomNav({ activeTab, onTabChange }: MobileBottomNavProps) {
  const [showMore, setShowMore] = useState(false);
  
  const mainTabs = [
    { value: "summary", icon: Bot, label: "Summary" },
    { value: "documents", icon: FileText, label: "Docs" },
    { value: "search", icon: Search, label: "Search" },
    { value: "appointments", icon: Calendar, label: "Appts" },
    { value: "upload", icon: Upload, label: "Upload" },
  ];

  const moreTabs = [
    { value: "calendar", icon: Calendar, label: "Calendar" },
    { value: "book-appointment", icon: CalendarPlus, label: "Book" },
  ];

  return (
    <>
      {/* More tabs overlay */}
      {showMore && (
        <div 
          className="fixed inset-0 bg-background/80 z-40 md:hidden"
          onClick={() => setShowMore(false)}
        >
          <div 
            className="absolute bottom-16 left-0 right-0 bg-card border-t border-border p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-2 gap-3">
              {moreTabs.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => {
                    onTabChange(tab.value);
                    setShowMore(false);
                  }}
                  className={cn(
                    "flex items-center justify-center gap-2 p-3 rounded-lg transition-all",
                    activeTab === tab.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <tab.icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 md:hidden safe-area-bottom">
        <div className="grid grid-cols-5 gap-1 px-2 py-2">
          {mainTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => onTabChange(tab.value)}
              className={cn(
                "flex flex-col items-center justify-center p-2 rounded-lg transition-all",
                activeTab === tab.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <tab.icon className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}

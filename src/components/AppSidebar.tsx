import { useLocation } from "react-router-dom";
import {
  FileText,
  Search,
  Calendar,
  CalendarPlus,
  Upload,
  Users,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  {
    title: "My Documents",
    url: "/patient-dashboard#documents",
    icon: FileText,
    tab: "documents",
  },
  {
    title: "Search Documents",
    url: "/patient-dashboard#search",
    icon: Search,
    tab: "search",
  },
  {
    title: "My Appointments",
    url: "/patient-dashboard#appointments",
    icon: Calendar,
    tab: "appointments",
  },
  {
    title: "Book Appointment",
    url: "/patient-dashboard#book-appointment",
    icon: CalendarPlus,
    tab: "book-appointment",
  },
  {
    title: "Upload Documents",
    url: "/patient-dashboard#upload",
    icon: Upload,
    tab: "upload",
  },
  {
    title: "Family Access",
    url: "/patient-dashboard#family",
    icon: Users,
    tab: "family",
  },
];

interface AppSidebarProps {
  user: any;
  patientData: any;
}

export function AppSidebar({ user, patientData }: AppSidebarProps) {
  const location = useLocation();
  const { setOpen, isMobile, setOpenMobile } = useSidebar();
  const activeTab = location.hash.substring(1) || "documents";

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar className="w-64" collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a
                      href={item.url}
                      onClick={handleLinkClick}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        activeTab === item.tab
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-accent"
                      }`}
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      <span className="text-sm">{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
import { useLocation } from "react-router-dom";
import {
  FileText,
  Search,
  Calendar,
  CalendarPlus,
  Upload,
  Users,
  Home,
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
} from "@/components/ui/sidebar";

const menuItems = [
  {
    title: "Dashboard",
    url: "/patient-dashboard",
    icon: Home,
  },
  {
    title: "My Documents",
    url: "/patient-dashboard/documents",
    icon: FileText,
  },
  {
    title: "Search Documents",
    url: "/patient-dashboard/search",
    icon: Search,
  },
  {
    title: "My Appointments",
    url: "/patient-dashboard/appointments",
    icon: Calendar,
  },
  {
    title: "Book Appointment",
    url: "/patient-dashboard/book",
    icon: CalendarPlus,
  },
  {
    title: "Upload Documents",
    url: "/patient-dashboard/upload",
    icon: Upload,
  },
  {
    title: "Family Access",
    url: "/patient-dashboard/family",
    icon: Users,
  },
];

interface AppSidebarProps {
  user: any;
  patientData: any;
}

export function AppSidebar({ user, patientData }: AppSidebarProps) {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/patient-dashboard") {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <Sidebar className="w-64">
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
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        isActive(item.url)
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
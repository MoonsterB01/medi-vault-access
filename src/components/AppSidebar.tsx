import { useLocation, useNavigate } from "react-router-dom";
import {
  FileText,
  Search,
  Calendar,
  CalendarPlus,
  Upload,
  Users,
  LayoutDashboard,
  UserPlus,
  FilePlus,
  Stethoscope,
  Phone,
  CreditCard,
  Heart,
  Settings,
  LogOut,
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
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

const patientMenuItems = [
  { title: "Summary", url: "/patient-dashboard#summary", icon: FileText, tab: "summary" },
  { title: "My Documents", url: "/patient-dashboard#documents", icon: FileText, tab: "documents" },
  { title: "Search Documents", url: "/patient-dashboard#search", icon: Search, tab: "search" },
  { title: "My Appointments", url: "/patient-dashboard#appointments", icon: Calendar, tab: "appointments" },
  { title: "Book Appointment", url: "/patient-dashboard#book-appointment", icon: CalendarPlus, tab: "book-appointment" },
  { title: "Upload Documents", url: "/patient-dashboard#upload", icon: Upload, tab: "upload" },
  { title: "Well-being", url: "/patient-dashboard#wellbeing", icon: Heart, tab: "wellbeing" },
  { title: "Family Access", url: "/patient-dashboard#family", icon: Users, tab: "family" },
];

const patientSecondaryItems = [
  { title: "Plans & Pricing", url: "/pricing", icon: CreditCard, tab: "pricing" },
  { title: "Settings", url: "/settings", icon: Settings, tab: "settings" },
  { title: "Contact Us", url: "/contact-us", icon: Phone, tab: "contact-us" },
];

const doctorMenuItems = [
  { title: "Summary", url: "/doctor-dashboard#summary", icon: FileText, tab: "summary" },
  { title: "Dashboard", url: "/doctor-dashboard#dashboard", icon: LayoutDashboard, tab: "dashboard" },
  { title: "My Patients", url: "/doctor-dashboard#patients", icon: Users, tab: "patients" },
  { title: "Appointments", url: "/doctor-dashboard#appointments", icon: Calendar, tab: "appointments" },
  { title: "Settings", url: "/settings", icon: Settings, tab: "settings" },
  { title: "Contact Us", url: "/contact-us", icon: Phone, tab: "contact-us" },
];

const hospitalStaffMenuItems = [
  { title: "Summary", url: "/hospital-dashboard#summary", icon: FileText, tab: "summary" },
  { title: "Dashboard", url: "/hospital-dashboard#dashboard", icon: LayoutDashboard, tab: "dashboard" },
  { title: "Patients", url: "/hospital-dashboard#patients", icon: Users, tab: "patients" },
  { title: "Add Patient", url: "/hospital-dashboard#add-patient", icon: UserPlus, tab: "add-patient" },
  { title: "Doctors", url: "/hospital-dashboard#doctors", icon: Stethoscope, tab: "doctors" },
  { title: "Appointments", url: "/hospital-dashboard#appointments", icon: Calendar, tab: "appointments" },
  { title: "Add Record", url: "/hospital-dashboard#add-record", icon: FilePlus, tab: "add-record" },
  { title: "Settings", url: "/settings", icon: Settings, tab: "settings" },
  { title: "Contact Us", url: "/contact-us", icon: Phone, tab: "contact-us" },
];

/**
 * @interface AppSidebarProps
 * @description Defines the props for the AppSidebar component.
 * @property {any} user - The user object.
 * @property {any} patientData - The patient data object.
 * @property {'patient' | 'hospital_staff' | 'admin' | 'doctor'} userRole - The role of the current user.
 */
interface AppSidebarProps {
  user: any;
  patientData: any;
  userRole: 'patient' | 'hospital_staff' | 'admin' | 'doctor';
}

/**
 * @function getMenuItems
 * @description Returns the menu items based on the user's role.
 * @param {AppSidebarProps['userRole']} role - The role of the user.
 * @returns {Array<object>} - An array of menu item objects.
 */
const getMenuItems = (role: AppSidebarProps['userRole']) => {
  switch (role) {
    case 'patient':
      return patientMenuItems;
    case 'doctor':
      return doctorMenuItems;
    case 'hospital_staff':
      return hospitalStaffMenuItems;
    default:
      return [];
  }
};

/**
 * @function AppSidebar
 * @description The sidebar component for the application. It displays navigation links based on the user's role.
 * @param {AppSidebarProps} props - The props for the component.
 * @returns {JSX.Element} - The rendered AppSidebar component.
 */
export function AppSidebar({ user, patientData, userRole }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isMobile, setOpenMobile } = useSidebar();

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const menuItems = getMenuItems(userRole);
  const secondaryItems = userRole === 'patient' ? patientSecondaryItems : [];

  const isItemActive = (item: { url: string; tab: string }) => {
    const itemPath = item.url.split("#")[0];
    const hasHash = item.url.includes("#");

    if (hasHash) {
      if (location.pathname === itemPath) {
        const currentTabInHash = location.hash.substring(1);
        const defaultTab = getMenuItems(userRole)[0]?.tab || "";
        const activeTab = currentTabInHash || defaultTab;
        return activeTab === item.tab;
      }
    } else {
      return location.pathname === item.url;
    }
    return false;
  };

  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar className="border-r border-border" collapsible="icon">
      <SidebarContent className="bg-sidebar">
        {/* Branding */}
        <div className={`p-4 flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          <img src={logo} alt="Medilock" className="h-8 w-8 flex-shrink-0" />
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-semibold text-sm text-sidebar-foreground">Medilock</span>
              <span className="text-xs text-muted-foreground">Health Portal</span>
            </div>
          )}
        </div>

        {!isCollapsed && <Separator className="mx-4 w-auto" />}

        {/* Main Navigation */}
        <SidebarGroup className="px-2 py-2">
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground px-2 mb-1">
            Main Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = isItemActive(item);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <a
                        href={item.url}
                        onClick={handleLinkClick}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-sidebar-foreground hover:bg-sidebar-accent"
                        }`}
                      >
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Secondary Navigation */}
        {secondaryItems.length > 0 && (
          <>
            <Separator className="mx-4 w-auto" />
            <SidebarGroup className="px-2 py-2">
              <SidebarGroupLabel className="text-xs font-medium text-muted-foreground px-2 mb-1">
                Account
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {secondaryItems.map((item) => {
                    const isActive = isItemActive(item);
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild>
                          <a
                            href={item.url}
                            onClick={handleLinkClick}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                              isActive
                                ? "bg-primary text-primary-foreground"
                                : "text-sidebar-foreground hover:bg-sidebar-accent"
                            }`}
                          >
                            <item.icon className="h-4 w-4 flex-shrink-0" />
                            <span>{item.title}</span>
                          </a>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      {/* User Profile Footer */}
      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          <Avatar className="h-9 w-9 flex-shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {user?.name || 'User'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {patientData?.shareable_id || 'Free Plan'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
import { useLocation } from "react-router-dom";
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

const patientMenuItems = [
  { title: "My Documents", url: "/patient-dashboard#documents", icon: FileText, tab: "documents" },
  { title: "Search Documents", url: "/patient-dashboard#search", icon: Search, tab: "search" },
  { title: "My Appointments", url: "/patient-dashboard#appointments", icon: Calendar, tab: "appointments" },
  { title: "Book Appointment", url: "/patient-dashboard#book-appointment", icon: CalendarPlus, tab: "book-appointment" },
  { title: "Upload Documents", url: "/patient-dashboard#upload", icon: Upload, tab: "upload" },
  { title: "Family Access", url: "/patient-dashboard#family", icon: Users, tab: "family" },
  { title: "Contact Us", url: "/contact-us", icon: Phone, tab: "contact-us" },
];

const doctorMenuItems = [
  { title: "Dashboard", url: "/doctor-dashboard#dashboard", icon: LayoutDashboard, tab: "dashboard" },
  { title: "My Patients", url: "/doctor-dashboard#patients", icon: Users, tab: "patients" },
  { title: "Appointments", url: "/doctor-dashboard#appointments", icon: Calendar, tab: "appointments" },
  { title: "Contact Us", url: "/contact-us", icon: Phone, tab: "contact-us" },
];

const hospitalStaffMenuItems = [
  { title: "Dashboard", url: "/hospital-dashboard#dashboard", icon: LayoutDashboard, tab: "dashboard" },
  { title: "Patients", url: "/hospital-dashboard#patients", icon: Users, tab: "patients" },
  { title: "Add Patient", url: "/hospital-dashboard#add-patient", icon: UserPlus, tab: "add-patient" },
  { title: "Doctors", url: "/hospital-dashboard#doctors", icon: Stethoscope, tab: "doctors" },
  { title: "Appointments", url: "/hospital-dashboard#appointments", icon: Calendar, tab: "appointments" },
  { title: "Add Record", url: "/hospital-dashboard#add-record", icon: FilePlus, tab: "add-record" },
  { title: "Contact Us", url: "/contact-us", icon: Phone, tab: "contact-us" },
];

/**
 * @interface AppSidebarProps
 * @description Defines the props for the AppSidebar component.
 * @property {any} user - The user object.
 * @property {any} patientData - The patient data object.
 * @property {'patient' | 'hospital_staff' | 'admin' | 'doctor' | 'family_member'} userRole - The role of the current user.
 */
interface AppSidebarProps {
  user: any;
  patientData: any;
  userRole: 'patient' | 'hospital_staff' | 'admin' | 'doctor' | 'family_member';
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
  const { isMobile, setOpenMobile } = useSidebar();

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const menuItems = getMenuItems(userRole);

  return (
    <Sidebar className="w-64" collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const itemPath = item.url.split("#")[0];
                const hasHash = item.url.includes("#");

                let isActive = false;
                if (hasHash) {
                  if (location.pathname === itemPath) {
                    const currentTabInHash = location.hash.substring(1);
                    const defaultTab = getMenuItems(userRole)[0]?.tab || "";
                    const activeTab = currentTabInHash || defaultTab;
                    isActive = activeTab === item.tab;
                  }
                } else {
                  isActive = location.pathname === item.url;
                }

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <a
                        href={item.url}
                        onClick={handleLinkClick}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-accent"
                        }`}
                      >
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        <span className="text-sm">{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
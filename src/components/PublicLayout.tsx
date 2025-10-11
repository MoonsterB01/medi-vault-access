import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import logo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

/**
 * @interface PublicLayoutProps
 * @description Defines the props for the PublicLayout component.
 * @property {React.ReactNode} children - The content to be rendered within the layout.
 */
interface PublicLayoutProps {
  children: React.ReactNode;
}

/**
 * @function PublicLayout
 * @description A layout component for public-facing pages. It includes a navigation bar with a logo, a sign-in/sign-out button, and a theme toggle.
 * @param {PublicLayoutProps} props - The props for the component.
 * @returns {JSX.Element} - The rendered PublicLayout component.
 */
export default function PublicLayout({ children }: PublicLayoutProps) {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    checkUser();
  }, []);

  return (
    <div className="min-h-screen">
      <nav className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <img src={logo} alt="MediVault Logo" className="h-10 w-10 object-contain" />
          <span className="text-xl font-bold">MediVault</span>
        </div>
        <div className="flex gap-4 items-center">
          {user ? (
            <Button onClick={() => supabase.auth.signOut().then(() => navigate('/'))} variant="outline">
              Sign Out
            </Button>
          ) : (
            <Button onClick={() => navigate('/auth')}>
              Sign In
            </Button>
          )}
          <ThemeToggle />
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}
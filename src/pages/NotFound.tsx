import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import PublicLayout from "@/components/PublicLayout";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-4">Oops! Page not found</p>
        <Link to="/" className="text-primary hover:underline">
          Return to Home
        </Link>
      </div>
    </PublicLayout>
  );
};

export default NotFound;
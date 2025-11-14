import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2 } from "lucide-react";

export default function HospitalAuth() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Verify user is a hospital admin
      const { data: adminData, error: adminError } = await supabase
        .from('hospital_admins')
        .select('*')
        .eq('user_id', data.user.id)
        .single();

      if (adminError || !adminData) {
        await supabase.auth.signOut();
        throw new Error("Access denied. Not a hospital admin.");
      }

      toast.success("Login successful!");
      navigate('/hms-dashboard');
    } catch (error: any) {
      toast.error(error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmail, {
        redirectTo: `${window.location.origin}/hms-dashboard`,
      });

      if (error) throw error;

      toast.success("Password reset link sent to your email!");
      setShowRecovery(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  };

  if (showRecovery) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Building2 className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl">Password Recovery</CardTitle>
            <CardDescription>Enter your email to receive a password reset link</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordRecovery} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recoveryEmail">Email</Label>
                <Input
                  id="recoveryEmail"
                  type="email"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>

              <Button
                type="button"
                variant="link"
                className="w-full"
                onClick={() => setShowRecovery(false)}
              >
                Back to Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Building2 className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Hospital Login</CardTitle>
          <CardDescription>Access your hospital management system</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </Button>

            <div className="flex justify-between text-sm">
              <Button
                type="button"
                variant="link"
                className="p-0 h-auto"
                onClick={() => setShowRecovery(true)}
              >
                Forgot password?
              </Button>
              <Button
                type="button"
                variant="link"
                className="p-0 h-auto"
                onClick={() => navigate('/hospital-registration')}
              >
                Register hospital
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

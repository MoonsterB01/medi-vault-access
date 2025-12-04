import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import logo from "@/assets/logo.png";
import PublicLayout from "@/components/PublicLayout";

const signInSchema = z.object({
  email: z.string().trim().email({ message: "Please enter a valid email address" }).max(255),
  password: z.string().min(1, { message: "Password is required" }),
});

const signUpSchema = z.object({
  name: z.string().trim().min(2, { message: "Name must be at least 2 characters" }).max(100).regex(/^[a-zA-Z\s'-]+$/),
  email: z.string().trim().email({ message: "Please enter a valid email address" }).max(255),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }).max(128).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
});

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setValidationErrors({});

    try {
      const validatedData = signUpSchema.parse(formData);
      const { data, error } = await supabase.auth.signUp({
        email: validatedData.email,
        password: validatedData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { name: validatedData.name, role: 'patient' },
        },
      });
      if (error) throw error;
      if (data.user) {
        toast({
          title: "Account created successfully!",
          description: "Please check your email to verify your account.",
        });
        setFormData({ email: "", password: "", name: "" });
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.issues.forEach((issue) => {
          if (issue.path[0]) fieldErrors[issue.path[0] as string] = issue.message;
        });
        setValidationErrors(fieldErrors);
      } else {
        toast({
          title: "Sign Up Failed",
          description: error.message || "An unexpected error occurred.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast({ title: "Google Sign In Failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setValidationErrors({});
    try {
      const validatedData = signInSchema.parse(formData);
      const { data, error } = await supabase.auth.signInWithPassword(validatedData);
      if (error) throw error;
      if (data.user) {
        const { data: userData } = await supabase.from('users').select('role').eq('id', data.user.id).single();
        toast({ title: "Welcome back!", description: "Signed in successfully." });
        if (userData?.role === 'hospital_staff' || userData?.role === 'admin' || userData?.role === 'doctor') {
          navigate(userData.role === 'doctor' ? '/doctor-dashboard' : '/hospital-dashboard');
        } else {
          navigate('/patient-dashboard');
        }
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.issues.forEach((issue) => {
          if (issue.path[0]) fieldErrors[issue.path[0] as string] = issue.message;
        });
        setValidationErrors(fieldErrors);
      } else {
        toast({ title: "Sign In Failed", description: error.message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmail, {
        redirectTo: `${window.location.origin}/`,
      });
      if (error) throw error;
      toast({
        title: "Recovery email sent!",
        description: "Please check your email for the password reset link.",
      });
      setShowRecovery(false);
      setRecoveryEmail("");
    } catch (error: any) {
      toast({
        title: "Recovery Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <img src={logo} alt="MediVault Logo" className="h-20 w-20 object-contain" />
            </div>
            <h1 className="text-3xl font-bold">MediVault</h1>
            <p className="text-muted-foreground mt-2">Secure Digital Medical Records</p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Patient Portal</CardTitle>
              <CardDescription>Sign in or create a patient account</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="signin" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>
                <TabsContent value="signin" className="pt-4">
                  {!showRecovery ? (
                    <form onSubmit={handleSignIn} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signin-email">Email</Label>
                        <Input id="signin-email" type="email" placeholder="m@example.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required className={validationErrors.email ? "border-destructive" : ""} />
                        {validationErrors.email && <p className="text-sm text-destructive">{validationErrors.email}</p>}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="signin-password">Password</Label>
                          <button
                            type="button"
                            onClick={() => setShowRecovery(true)}
                            className="text-sm text-primary hover:underline"
                          >
                            Forgot Password?
                          </button>
                        </div>
                        <Input id="signin-password" type="password" placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required className={validationErrors.password ? "border-destructive" : ""} />
                        {validationErrors.password && <p className="text-sm text-destructive">{validationErrors.password}</p>}
                      </div>
                      <Button type="submit" className="w-full" disabled={loading}>{loading ? "Signing in..." : "Sign In"}</Button>
                      
                      <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                        </div>
                      </div>
                      
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="w-full" 
                        onClick={handleGoogleSignIn}
                        disabled={loading}
                      >
                        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                          <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            fill="#4285F4"
                          />
                          <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                          />
                          <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            fill="#FBBC05"
                          />
                          <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            fill="#EA4335"
                          />
                        </svg>
                        Continue with Google
                      </Button>
                    </form>
                  ) : (
                    <form onSubmit={handlePasswordRecovery} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="recovery-email">Email Address</Label>
                        <Input
                          id="recovery-email"
                          type="email"
                          placeholder="m@example.com"
                          value={recoveryEmail}
                          onChange={(e) => setRecoveryEmail(e.target.value)}
                          required
                        />
                        <p className="text-sm text-muted-foreground">
                          Enter your email address and we'll send you a link to reset your password.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Button type="submit" className="w-full" disabled={loading}>
                          {loading ? "Sending..." : "Send Recovery Email"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="w-full"
                          onClick={() => setShowRecovery(false)}
                        >
                          Back to Sign In
                        </Button>
                      </div>
                    </form>
                  )}
                </TabsContent>
                <TabsContent value="signup" className="pt-4">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Full Name</Label>
                      <Input id="signup-name" type="text" placeholder="John Doe" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className={validationErrors.name ? "border-destructive" : ""} />
                      {validationErrors.name && <p className="text-sm text-destructive">{validationErrors.name}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input id="signup-email" type="email" placeholder="m@example.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required className={validationErrors.email ? "border-destructive" : ""} />
                      {validationErrors.email && <p className="text-sm text-destructive">{validationErrors.email}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input id="signup-password" type="password" placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required className={validationErrors.password ? "border-destructive" : ""} />
                      {validationErrors.password && <p className="text-sm text-destructive">{validationErrors.password}</p>}
                      <p className="text-xs text-muted-foreground">Must be at least 8 characters with uppercase, lowercase, and number</p>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>{loading ? "Creating account..." : "Create Patient Account"}</Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </PublicLayout>
  );
}
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Hospital, Users, User } from "lucide-react";
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
  role: z.string().refine((value) => ["hospital_staff", "patient", "family_member"].includes(value), {
    message: "Please select a valid role"
  }),
});

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    role: "",
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
          data: { name: validatedData.name, role: validatedData.role },
        },
      });
      if (error) throw error;
      if (data.user) {
        toast({
          title: "Account created successfully!",
          description: "Please check your email to verify your account.",
        });
        setFormData({ email: "", password: "", name: "", role: "" });
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
              <CardTitle>Authentication</CardTitle>
              <CardDescription>Sign in or create a new account</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="signin" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>
                <TabsContent value="signin" className="pt-4">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <Input id="signin-email" type="email" placeholder="m@example.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required className={validationErrors.email ? "border-destructive" : ""} />
                      {validationErrors.email && <p className="text-sm text-destructive">{validationErrors.email}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password">Password</Label>
                      <Input id="signin-password" type="password" placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required className={validationErrors.password ? "border-destructive" : ""} />
                      {validationErrors.password && <p className="text-sm text-destructive">{validationErrors.password}</p>}
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>{loading ? "Signing in..." : "Sign In"}</Button>
                  </form>
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
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select onValueChange={(value) => setFormData({ ...formData, role: value })}>
                        <SelectTrigger className={validationErrors.role ? "border-destructive" : ""}><SelectValue placeholder="Select your role" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hospital_staff"><div className="flex items-center gap-2"><Hospital className="h-4 w-4" />Hospital Staff</div></SelectItem>
                          <SelectItem value="patient"><div className="flex items-center gap-2"><User className="h-4 w-4" />Patient</div></SelectItem>
                          <SelectItem value="family_member"><div className="flex items-center gap-2"><Users className="h-4 w-4" />Family Member</div></SelectItem>
                        </SelectContent>
                      </Select>
                      {validationErrors.role && <p className="text-sm text-destructive">{validationErrors.role}</p>}
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>{loading ? "Creating account..." : "Create Account"}</Button>
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
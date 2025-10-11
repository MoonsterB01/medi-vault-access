import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Stethoscope } from "lucide-react";
import PublicLayout from "@/components/PublicLayout";

/**
 * @function DoctorAuth
 * @description A page component for doctor authentication. It provides tabs for signing in and signing up as a doctor.
 * @returns {JSX.Element} - The rendered DoctorAuth page component.
 */
const DoctorAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [signUpData, setSignUpData] = useState({
    email: "",
    password: "",
    name: "",
    specialization: "",
    qualifications: "",
    yearsExperience: "",
    consultationFee: "",
    bio: ""
  });

  const [signInData, setSignInData] = useState({
    email: "",
    password: ""
  });

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: signUpData.email,
        password: signUpData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/doctor-dashboard`,
          data: { name: signUpData.name, role: 'doctor' }
        }
      });
      if (authError) throw authError;
      if (authData.user) {
        toast({
          title: "Account created successfully!",
          description: "Please check your email to verify your account.",
        });
        setSignUpData({ email: "", password: "", name: "", specialization: "", qualifications: "", yearsExperience: "", consultationFee: "", bio: "" });
      }
    } catch (error: any) {
      toast({
        title: "Registration Error",
        description: error.message || "Failed to create account.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword(signInData);
      if (error) throw error;
      if (data.user) {
        const { data: userData } = await supabase.from('users').select('role').eq('id', data.user.id).single();
        if (userData?.role === 'doctor') {
          navigate('/doctor-dashboard');
        } else {
          throw new Error('This login is for doctors only.');
        }
      }
    } catch (error: any) {
      toast({ title: "Sign In Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                <Stethoscope className="w-6 h-6 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-2xl font-bold">MediDoc</h1>
            <p className="text-muted-foreground">Doctor Portal</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Doctor Authentication</CardTitle>
              <CardDescription>Sign in or create a new doctor account</CardDescription>
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
                      <Input id="signin-email" type="email" placeholder="doctor@hospital.com" value={signInData.email} onChange={(e) => setSignInData({ ...signInData, email: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password">Password</Label>
                      <Input id="signin-password" type="password" value={signInData.password} onChange={(e) => setSignInData({ ...signInData, password: e.target.value })} required />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? "Signing In..." : "Sign In"}</Button>
                  </form>
                </TabsContent>
                <TabsContent value="signup" className="pt-4">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-name">Full Name</Label>
                        <Input id="signup-name" placeholder="Dr. John Smith" value={signUpData.name} onChange={(e) => setSignUpData({ ...signUpData, name: e.target.value })} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-specialization">Specialization</Label>
                        <Select onValueChange={(value) => setSignUpData({ ...signUpData, specialization: value })}>
                          <SelectTrigger><SelectValue placeholder="Select specialization" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cardiology">Cardiology</SelectItem>
                            <SelectItem value="neurology">Neurology</SelectItem>
                            <SelectItem value="orthopedics">Orthopedics</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input id="signup-email" type="email" placeholder="doctor@hospital.com" value={signUpData.email} onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input id="signup-password" type="password" value={signUpData.password} onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })} required />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? "Creating Account..." : "Create Doctor Account"}</Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </PublicLayout>
  );
};

export default DoctorAuth;
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
import { Stethoscope, ArrowLeft } from "lucide-react";

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
      const redirectUrl = `${window.location.origin}/doctor-dashboard`;
      
      // First create the auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: signUpData.email,
        password: signUpData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name: signUpData.name,
            role: 'doctor'
          }
        }
      });

      if (authError) {
        console.error('Auth signup error:', authError);
        throw authError;
      }

      if (authData.user) {
        // Wait a moment to ensure the session is established
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Create doctor profile
        const { error: profileError } = await supabase
          .from('doctors')
          .insert([{
            user_id: authData.user.id,
            specialization: signUpData.specialization,
            qualifications: signUpData.qualifications.split(',').map(q => q.trim()).filter(q => q.length > 0),
            years_experience: parseInt(signUpData.yearsExperience) || 0,
            consultation_fee: parseFloat(signUpData.consultationFee) || 0,
            bio: signUpData.bio || '',
            doctor_id: `DOC-${Math.random().toString(36).substr(2, 8).toUpperCase()}` // Temporary, will be overwritten by trigger
          }]);

        if (profileError) {
          console.error('Profile creation error:', profileError);
          
          // If profile creation fails, we should clean up the auth user
          // But since we can't delete auth users from client side, just show the error
          throw new Error(`Profile creation failed: ${profileError.message}. Please contact support.`);
        }

        toast({
          title: "Account created successfully!",
          description: "Please check your email to verify your account before signing in.",
        });

        // Clear the form
        setSignUpData({
          email: "",
          password: "",
          name: "",
          specialization: "",
          qualifications: "",
          yearsExperience: "",
          consultationFee: "",
          bio: ""
        });
      }
    } catch (error: any) {
      console.error('Signup process error:', error);
      toast({
        title: "Registration Error",
        description: error.message || "Failed to create doctor account. Please try again.",
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email: signInData.email,
        password: signInData.password,
      });

      if (error) throw error;

      if (data.user) {
        // Check if user is a doctor
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (userError) throw userError;

        if (userData.role === 'doctor') {
          navigate('/doctor-dashboard');
        } else {
          throw new Error('This login is for doctors only. Please use the correct portal.');
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <Stethoscope className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">MediDoc</h1>
          <p className="text-muted-foreground">Doctor Portal - Secure Medical Practice Management</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Doctor Authentication</CardTitle>
            <CardDescription>
              Sign in to your doctor account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="space-y-4">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="doctor@hospital.com"
                      value={signInData.email}
                      onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      value={signInData.password}
                      onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Signing In..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Full Name</Label>
                      <Input
                        id="signup-name"
                        placeholder="Dr. John Smith"
                        value={signUpData.name}
                        onChange={(e) => setSignUpData({ ...signUpData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-specialization">Specialization</Label>
                      <Select onValueChange={(value) => setSignUpData({ ...signUpData, specialization: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select specialization" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cardiology">Cardiology</SelectItem>
                          <SelectItem value="neurology">Neurology</SelectItem>
                          <SelectItem value="orthopedics">Orthopedics</SelectItem>
                          <SelectItem value="pediatrics">Pediatrics</SelectItem>
                          <SelectItem value="dermatology">Dermatology</SelectItem>
                          <SelectItem value="general_medicine">General Medicine</SelectItem>
                          <SelectItem value="surgery">Surgery</SelectItem>
                          <SelectItem value="psychiatry">Psychiatry</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="doctor@hospital.com"
                      value={signUpData.email}
                      onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={signUpData.password}
                      onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-experience">Years Experience</Label>
                      <Input
                        id="signup-experience"
                        type="number"
                        placeholder="5"
                        value={signUpData.yearsExperience}
                        onChange={(e) => setSignUpData({ ...signUpData, yearsExperience: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-fee">Consultation Fee ($)</Label>
                      <Input
                        id="signup-fee"
                        type="number"
                        placeholder="150"
                        value={signUpData.consultationFee}
                        onChange={(e) => setSignUpData({ ...signUpData, consultationFee: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-qualifications">Qualifications (comma-separated)</Label>
                    <Input
                      id="signup-qualifications"
                      placeholder="MD, PhD, Board Certified"
                      value={signUpData.qualifications}
                      onChange={(e) => setSignUpData({ ...signUpData, qualifications: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-bio">Bio</Label>
                    <Textarea
                      id="signup-bio"
                      placeholder="Tell patients about your experience and approach to medicine..."
                      value={signUpData.bio}
                      onChange={(e) => setSignUpData({ ...signUpData, bio: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Creating Account..." : "Create Doctor Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DoctorAuth;
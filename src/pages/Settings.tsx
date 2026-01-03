import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/use-subscription";
import { 
  User, 
  Shield, 
  Bell, 
  CreditCard, 
  AlertTriangle,
  Save,
  Loader2,
  Heart,
  Calendar,
  HardDrive,
  Upload
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsProps {
  user?: any;
}

type SettingsSection = 'profile' | 'security' | 'notifications' | 'billing' | 'danger';

export default function Settings({ user }: SettingsProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [patientData, setPatientData] = useState<any>(null);
  const [healthScore, setHealthScore] = useState<number | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    dob: '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [preferences, setPreferences] = useState({
    allowAIAnalysis: true,
    researchContribution: false,
    emailNotifications: true,
    appointmentReminders: true,
  });
  const { toast } = useToast();
  const navigate = useNavigate();
  const subscription = useSubscription(user?.id, patientData?.id);

  useEffect(() => {
    if (user) {
      fetchPatientData();
      fetchHealthScore();
    }
  }, [user]);

  const fetchHealthScore = async () => {
    try {
      const { data: patient } = await supabase
        .from('patients')
        .select('id')
        .eq('created_by', user.id)
        .maybeSingle();

      if (patient) {
        const { data: insight } = await supabase
          .from('health_insights')
          .select('fitness_score')
          .eq('patient_id', patient.id)
          .eq('is_current', true)
          .maybeSingle();

        if (insight?.fitness_score) {
          setHealthScore(insight.fitness_score);
        }
      }
    } catch (error) {
      console.error('Error fetching health score:', error);
    }
  };

  const fetchPatientData = async () => {
    try {
      const { data: patient } = await supabase
        .from('patients')
        .select('*')
        .eq('created_by', user.id)
        .maybeSingle();

      if (patient) {
        setPatientData(patient);
        setFormData({
          name: patient.name || '',
          email: patient.primary_contact || '',
          phone: '',
          dob: patient.dob || '',
        });
      }
    } catch (error) {
      console.error('Error fetching patient data:', error);
    }
  };

  const handleSaveProfile = async () => {
    if (!patientData?.id) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('patients')
        .update({
          name: formData.name,
          primary_contact: formData.email,
          dob: formData.dob,
        })
        .eq('id', patientData.id);

      if (error) throw error;

      toast({
        title: "Profile Updated",
        description: "Your profile has been saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your new passwords match.",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      toast({
        title: "Password Updated",
        description: "Your password has been changed successfully.",
      });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast({
        title: "Password Update Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !patientData?.id) return;

    setAvatarLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${patientData.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setAvatarUrl(publicUrl + '?t=' + Date.now());

      toast({
        title: "Avatar Updated",
        description: "Your profile picture has been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Could not upload avatar. Storage bucket may not exist.",
        variant: "destructive",
      });
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!patientData?.id) return;

    setAvatarLoading(true);
    try {
      const { error } = await supabase.storage
        .from('avatars')
        .remove([`${patientData.id}/avatar.png`, `${patientData.id}/avatar.jpg`, `${patientData.id}/avatar.jpeg`]);

      if (error) throw error;

      setAvatarUrl(null);
      toast({
        title: "Avatar Removed",
        description: "Your profile picture has been removed.",
      });
    } catch (error: any) {
      toast({
        title: "Remove Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAvatarLoading(false);
    }
  };

  const sections = [
    { id: 'profile' as const, label: 'Profile', icon: User },
    { id: 'security' as const, label: 'Password & Security', icon: Shield },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'billing' as const, label: 'Billing & Storage', icon: CreditCard },
    { id: 'danger' as const, label: 'Danger Zone', icon: AlertTriangle },
  ];

  const storageUsed = subscription.uploadsUsed || 0;
  const storageLimit = subscription.currentPlan?.upload_limit || 5;
  const storagePercentage = Math.min((storageUsed / storageLimit) * 100, 100);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Account Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account preferences and security settings
        </p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-2">
              <nav className="space-y-1">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      activeSection === section.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <section.icon className="h-4 w-4" />
                    {section.label}
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Profile Section */}
          {activeSection === 'profile' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Profile Picture</CardTitle>
                  <CardDescription>Update your profile picture and personal details</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-6">
                    <div className="flex flex-col items-center gap-2">
                      <Avatar className="h-24 w-24 border-2 border-border">
                        {avatarUrl && <AvatarImage src={avatarUrl} alt="Profile" />}
                        <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                          {formData.name?.charAt(0)?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                      />
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => fileInputRef.current?.click()}
                          disabled={avatarLoading}
                        >
                          {avatarLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />}
                          Change
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-muted-foreground"
                          onClick={handleRemoveAvatar}
                          disabled={avatarLoading || !avatarUrl}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="gap-1">
                          <Heart className="h-3 w-3" />
                          Health Score: {healthScore ?? 'N/A'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Member since {patientData?.created_at ? new Date(patientData.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'N/A'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Update your personal details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="Enter your email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="Enter your phone number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dob">Date of Birth</Label>
                      <Input
                        id="dob"
                        type="date"
                        value={formData.dob}
                        onChange={(e) => setFormData(prev => ({ ...prev, dob: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={handleSaveProfile} disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Medical Preferences</CardTitle>
                  <CardDescription>Control how your medical data is processed</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Allow AI Analysis</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable AI-powered analysis of your medical documents
                      </p>
                    </div>
                    <Switch
                      checked={preferences.allowAIAnalysis}
                      onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, allowAIAnalysis: checked }))}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Research Contribution</Label>
                      <p className="text-sm text-muted-foreground">
                        Contribute anonymized data to medical research
                      </p>
                    </div>
                    <Switch
                      checked={preferences.researchContribution}
                      onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, researchContribution: checked }))}
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Security Section */}
          {activeSection === 'security' && (
            <Card>
              <CardHeader>
                <CardTitle>Password & Security</CardTitle>
                <CardDescription>Manage your password and security settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input 
                    id="new-password" 
                    type="password" 
                    placeholder="Enter new password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input 
                    id="confirm-password" 
                    type="password" 
                    placeholder="Confirm new password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  />
                </div>
                <Button 
                  onClick={handlePasswordChange} 
                  disabled={passwordLoading || !passwordData.newPassword || !passwordData.confirmPassword}
                >
                  {passwordLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Password'
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Notifications Section */}
          {activeSection === 'notifications' && (
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Choose how you want to be notified</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive important updates via email
                    </p>
                  </div>
                  <Switch
                    checked={preferences.emailNotifications}
                    onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, emailNotifications: checked }))}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Appointment Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Get reminded before your appointments
                    </p>
                  </div>
                  <Switch
                    checked={preferences.appointmentReminders}
                    onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, appointmentReminders: checked }))}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Billing Section */}
          {activeSection === 'billing' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Current Plan</CardTitle>
                  <CardDescription>Your subscription details</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <h3 className="font-semibold">{subscription.currentPlan?.display_name || 'Free Plan'}</h3>
                      <p className="text-sm text-muted-foreground">
                        {storageUsed} of {storageLimit} documents used
                      </p>
                    </div>
                    <Button variant="outline" onClick={() => navigate('/pricing')}>
                      Upgrade Plan
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HardDrive className="h-5 w-5" />
                    Storage Usage
                  </CardTitle>
                  <CardDescription>Your document storage usage</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{storageUsed} documents</span>
                      <span>{storageLimit} limit</span>
                    </div>
                    <Progress value={storagePercentage} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {storagePercentage.toFixed(0)}% of your storage used
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Danger Zone Section */}
          {activeSection === 'danger' && (
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Danger Zone
                </CardTitle>
                <CardDescription>Irreversible actions for your account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-lg">
                  <div>
                    <h4 className="font-medium">Delete Account</h4>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete your account and all data
                    </p>
                  </div>
                  <Button variant="destructive">Delete Account</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

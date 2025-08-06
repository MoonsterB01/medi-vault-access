import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { User, FileText, LogOut, Share2, Calendar, AlertCircle, Copy, Upload, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DocumentUpload from "@/components/DocumentUpload";
import DocumentSearch from "@/components/DocumentSearch";

export default function PatientDashboard() {
  const [user, setUser] = useState<any>(null);
  const [patientData, setPatientData] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [familyEmail, setFamilyEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (userError) {
        console.error('Error fetching user data:', userError);
        toast({
          title: "Error",
          description: "Failed to fetch user profile. Please try again.",
          variant: "destructive",
        });
        setAuthLoading(false);
        return;
      }

      if (!userData) {
        toast({
          title: "Profile Not Found",
          description: "Your user profile was not found. Please contact support.",
          variant: "destructive",
        });
        setAuthLoading(false);
        return;
      }

      if (userData.role === 'hospital_staff' || userData.role === 'admin') {
        navigate('/hospital-dashboard');
        return;
      }

      setUser(userData);
      await fetchPatientTimeline(user.id);
    } catch (error) {
      console.error('Auth error:', error);
      toast({
        title: "Authentication Error",
        description: "There was an error loading your account. Please try signing in again.",
        variant: "destructive",
      });
    } finally {
      setAuthLoading(false);
    }
  };

  const fetchPatientTimeline = async (userId: string) => {
    try {
      // Find patient record associated with this user
      const { data: patientAccess } = await supabase
        .from('family_access')
        .select('patient_id, patients(*)')
        .eq('user_id', userId)
        .single();

      if (patientAccess) {
        setPatientData(patientAccess.patients);
        
        // Fetch timeline for this patient
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch(
          `https://qiqepumdtaozjzfjbggl.supabase.co/functions/v1/get-patient-timeline?patientId=${patientAccess.patient_id}`,
          {
            headers: {
              'Authorization': `Bearer ${session?.access_token}`,
            },
          }
        );

        if (response.ok) {
          const result = await response.json();
          setTimeline(result.timeline || []);
        }
      }
    } catch (error) {
      console.error('Error fetching patient timeline:', error);
    }
  };

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyEmail || !patientData) return;

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`https://qiqepumdtaozjzfjbggl.supabase.co/functions/v1/grant-access-to-family`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId: patientData.id,
          familyMemberEmail: familyEmail,
          canView: true,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Access Granted!",
          description: `${familyEmail} now has access to view medical records`,
        });
        setFamilyEmail("");
      } else {
        throw new Error(result.error || 'Failed to grant access');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const copyShareableId = () => {
    if (patientData?.shareable_id) {
      navigator.clipboard.writeText(patientData.shareable_id);
      toast({
        title: "Copied!",
        description: "Shareable ID copied to clipboard",
      });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // This prevents rendering when user is null after auth check
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <User className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold">Patient Dashboard</h1>
              <p className="text-gray-600">Welcome, {user.name}</p>
            </div>
          </div>
          <Button onClick={handleSignOut} variant="outline">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Patient Info & Shareable ID */}
          <div className="space-y-6">
            {patientData && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Patient Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p><strong>Name:</strong> {patientData.name}</p>
                      <p><strong>DOB:</strong> {patientData.dob}</p>
                      <p><strong>Gender:</strong> {patientData.gender}</p>
                      <p><strong>Contact:</strong> {patientData.primary_contact}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Share2 className="h-5 w-5" />
                      Your Shareable ID
                    </CardTitle>
                    <CardDescription>
                      Share this ID with others to let them upload documents to your medical record
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                        <code className="flex-1 font-mono text-xl font-bold text-blue-900 tracking-wider">
                          {patientData.shareable_id}
                        </code>
                        <Button size="sm" variant="default" onClick={copyShareableId} className="bg-blue-600 hover:bg-blue-700">
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-gray-600 text-center">
                        📋 Click the copy button to share this ID with others for document uploads
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="h-5 w-5" />
                  Grant Family Access
                </CardTitle>
                <CardDescription>
                  Give family members access to view your medical records
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleGrantAccess} className="space-y-4">
                  <div className="space-y-2">
                    <Input
                      type="email"
                      placeholder="Family member's email"
                      value={familyEmail}
                      onChange={(e) => setFamilyEmail(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading || !patientData}>
                    {loading ? "Granting Access..." : "Grant Access"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Main Content with Tabs */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="timeline" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="timeline" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Timeline
                </TabsTrigger>
                <TabsTrigger value="documents" className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Search Documents
                </TabsTrigger>
                <TabsTrigger value="upload" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload
                </TabsTrigger>
              </TabsList>

              <TabsContent value="timeline" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Medical Records Timeline
                    </CardTitle>
                    <CardDescription>
                      Your medical records organized by date and severity
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {timeline.length > 0 ? (
                      <div className="space-y-4">
                        {timeline.map((record) => (
                          <div key={record.id} className="border rounded-lg p-4 space-y-2">
                            <div className="flex justify-between items-start">
                              <div className="space-y-1">
                                <h3 className="font-semibold capitalize">
                                  {record.record_type.replace('_', ' ')}
                                </h3>
                                <p className="text-sm text-gray-600">
                                  Uploaded by: {record.uploader_name}
                                </p>
                                {record.description && (
                                  <p className="text-sm">{record.description}</p>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <Badge className={getSeverityColor(record.severity)}>
                                  {record.severity}
                                </Badge>
                                <div className="flex items-center gap-1 text-sm text-gray-500">
                                  <Calendar className="h-4 w-4" />
                                  {new Date(record.record_date).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            {record.signed_url && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={record.signed_url} target="_blank" rel="noopener noreferrer">
                                  View Document
                                </a>
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          No Medical Records Found
                        </h3>
                        <p className="text-gray-600">
                          Your medical records will appear here once uploaded by healthcare providers.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="documents" className="mt-6">
                <DocumentSearch patientId={patientData?.id} />
              </TabsContent>

              <TabsContent value="upload" className="mt-6">
                <DocumentUpload 
                  shareableId={patientData?.shareable_id} 
                  onUploadSuccess={() => {
                    // Refresh timeline and documents
                    if (user?.id) {
                      fetchPatientTimeline(user.id);
                    }
                  }}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
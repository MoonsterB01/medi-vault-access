import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { User, FileText, LogOut, Share2, Copy, Upload, Download, Calendar, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DocumentUpload from "@/components/DocumentUpload";
import FamilyAccessManager from "@/components/FamilyAccessManager";

export default function PatientDashboard() {
  const [user, setUser] = useState<any>(null);
  const [patientData, setPatientData] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
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

      console.log('User data fetched:', userData);
      setUser(userData);
      await fetchPatientData(user.id);
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

  const fetchPatientData = async (userId: string) => {
    try {
      console.log('=== Starting fetchPatientData for user:', userId);
      
      // Find patient record associated with this user
      const { data: fa, error: faErr } = await supabase
        .from('family_access')
        .select('patient_id')
        .eq('user_id', userId)
        .maybeSingle();

      console.log('Family access query result:', { fa, faErr });

      if (faErr) {
        console.error('family_access fetch error:', faErr);
        toast({
          title: "Database Error",
          description: `Access check failed: ${faErr.message}`,
          variant: "destructive",
        });
        return;
      }

      if (!fa?.patient_id) {
        console.log('No patient associated with this user');
        toast({
          title: "No Patient Record",
          description: "No patient record found for your account.",
          variant: "destructive",
        });
        return;
      }

      console.log('Found patient ID:', fa.patient_id);

      // Get patient details
      const { data: patient, error: pErr } = await supabase
        .from('patients')
        .select('*')
        .eq('id', fa.patient_id)
        .maybeSingle();

      console.log('Patient query result:', { patient, pErr });

      if (pErr) {
        console.error('patients fetch error:', pErr);
        toast({
          title: "Patient Error",
          description: `Failed to load patient data: ${pErr.message}`,
          variant: "destructive",
        });
        return;
      }

      if (!patient) {
        console.log('Patient not found');
        toast({
          title: "Patient Not Found",
          description: "Patient record not found.",
          variant: "destructive",
        });
        return;
      }

      console.log('Setting patient data:', patient);
      setPatientData(patient);
      
      // Fetch documents directly
      await fetchDocuments(fa.patient_id);
    } catch (error) {
      console.error('Error in fetchPatientData:', error);
      toast({
        title: "Unexpected Error",
        description: "An unexpected error occurred while loading your data.",
        variant: "destructive",
      });
    }
  };

  const fetchDocuments = async (patientId: string) => {
    try {
      console.log('=== Fetching documents for patient:', patientId);
      
      const { data: docs, error: docsError } = await supabase
        .from('documents')
        .select(`
          *,
          patients (name, shareable_id)
        `)
        .eq('patient_id', patientId)
        .order('uploaded_at', { ascending: false });

      console.log('Documents query result:', { docs, docsError });

      if (docsError) {
        console.error('Documents fetch error:', docsError);
        toast({
          title: "Documents Error",
          description: `Failed to load documents: ${docsError.message}`,
          variant: "destructive",
        });
        return;
      }

      console.log('Setting documents:', docs || []);
      setDocuments(docs || []);
      
      if (!docs || docs.length === 0) {
        toast({
          title: "No Documents",
          description: "No documents found. Try uploading some documents first.",
        });
      } else {
        toast({
          title: "Documents Loaded",
          description: `Found ${docs.length} documents.`,
        });
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: "Document Fetch Error",
        description: "An unexpected error occurred while loading documents.",
        variant: "destructive",
      });
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

  const formatFileSize = (bytes: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDocumentType = (type: string) => {
    return type ? type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Document';
  };

  const onUploadSuccess = () => {
    if (patientData?.id) {
      fetchDocuments(patientData.id);
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
          {/* User Info & Unique ID */}
          <div className="space-y-6">
            {/* User's Personal Unique ID */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Your Unique ID
                </CardTitle>
                <CardDescription>
                  Your personal unique identifier as a {user?.role?.replace('_', ' ')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                    <code className="flex-1 font-mono text-xl font-bold text-green-900 tracking-wider">
                      {user?.user_shareable_id || 'No ID assigned'}
                    </code>
                    <Button 
                      size="sm" 
                      variant="default" 
                      onClick={() => {
                        if (user?.user_shareable_id) {
                          navigator.clipboard.writeText(user.user_shareable_id);
                          toast({
                            title: "Copied!",
                            description: "Your unique ID copied to clipboard",
                          });
                        }
                      }} 
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600 text-center">
                    🆔 This is your personal unique identifier
                  </p>
                </div>
              </CardContent>
            </Card>

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
                      Patient Shareable ID
                    </CardTitle>
                    <CardDescription>
                      Share this ID with others to let them upload documents to this patient's medical record
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
            {/* Timeline View Button */}
            <div className="mb-6">
              <Button 
                onClick={() => navigate('/document-timeline')}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Clock className="h-4 w-4" />
                View Timeline
              </Button>
            </div>
            
            <Tabs defaultValue="documents" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="documents" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  My Documents
                </TabsTrigger>
                <TabsTrigger value="upload" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload
                </TabsTrigger>
                <TabsTrigger value="family" className="flex items-center gap-2">
                  <Share2 className="h-4 w-4" />
                  Family Access
                </TabsTrigger>
              </TabsList>

              <TabsContent value="documents" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      My Documents
                    </CardTitle>
                    <CardDescription>
                      Your uploaded medical documents
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {documents.length > 0 ? (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {documents.map((doc) => (
                          <Card key={doc.id} className="p-4">
                            <div className="space-y-3">
                              <div>
                                <h3 className="font-semibold text-sm truncate" title={doc.filename}>
                                  {doc.filename}
                                </h3>
                                <p className="text-xs text-gray-500">
                                  {formatDocumentType(doc.document_type)}
                                </p>
                              </div>
                              
                              {doc.description && (
                                <p className="text-sm text-gray-600 line-clamp-2">{doc.description}</p>
                              )}
                              
                              <div className="space-y-1">
                                <p className="text-xs text-gray-500">
                                  <Calendar className="h-3 w-3 inline mr-1" />
                                  {new Date(doc.uploaded_at).toLocaleDateString()}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Size: {formatFileSize(doc.file_size)}
                                </p>
                              </div>
                              
                              {doc.tags && doc.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {doc.tags.slice(0, 2).map((tag: string, index: number) => (
                                    <Badge key={index} variant="secondary" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                  {doc.tags.length > 2 && (
                                    <Badge variant="secondary" className="text-xs">
                                      +{doc.tags.length - 2}
                                    </Badge>
                                  )}
                                </div>
                              )}
                              
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full"
                                onClick={async () => {
                                  try {
                                    const { data } = await supabase.storage
                                      .from('medical-documents')
                                      .createSignedUrl(doc.file_path, 3600);
                                    
                                    if (data?.signedUrl) {
                                      window.open(data.signedUrl, '_blank');
                                    } else {
                                      toast({
                                        title: "Error",
                                        description: "Could not generate download link",
                                        variant: "destructive",
                                      });
                                    }
                                  } catch (error) {
                                    console.error('Error creating signed URL:', error);
                                    toast({
                                      title: "Error",
                                      description: "Failed to open document",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                View
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
                        <p className="text-gray-500 mb-4">
                          Start by uploading your first medical document using the Upload tab.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="upload" className="mt-6">
                <DocumentUpload
                  shareableId={patientData?.shareable_id}
                  onUploadSuccess={() => {
                    toast({
                      title: "Document Uploaded!",
                      description: "Your document has been uploaded successfully.",
                    });
                    onUploadSuccess();
                  }}
                />
              </TabsContent>

              <TabsContent value="family" className="mt-6">
                <FamilyAccessManager 
                  patientId={patientData?.id || ""}
                  patientShareableId={patientData?.shareable_id || ""}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
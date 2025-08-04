import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Calendar, Download, AlertCircle, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function PatientTimeline() {
  const { patientId } = useParams();
  const [patientData, setPatientData] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (patientId) {
      fetchPatientTimeline();
    }
  }, [patientId]);

  const fetchPatientTimeline = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }

      const response = await fetch(
        `https://qiqepumdtaozjzfjbggl.supabase.co/functions/v1/get-patient-timeline?patientId=${patientId}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        setPatientData(result.patient);
        setTimeline(result.timeline || []);
        setSummary(result.summary);
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to fetch patient timeline",
          variant: "destructive",
        });
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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading patient timeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              <User className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold">
                  {patientData ? `${patientData.name}'s Medical Timeline` : 'Patient Timeline'}
                </h1>
                <p className="text-gray-600">Complete medical records history</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {patientData && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Patient Info & Summary */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Patient Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p><strong>Name:</strong> {patientData.name}</p>
                    <p><strong>DOB:</strong> {patientData.dob}</p>
                    <p><strong>Gender:</strong> {patientData.gender}</p>
                  </div>
                </CardContent>
              </Card>

              {summary && (
                <Card>
                  <CardHeader>
                    <CardTitle>Records Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Records</p>
                        <p className="text-2xl font-bold">{summary.total_records}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-2">By Severity</p>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-sm">Critical</span>
                            <Badge className="bg-red-100 text-red-800">{summary.by_severity.critical}</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">High</span>
                            <Badge className="bg-orange-100 text-orange-800">{summary.by_severity.high}</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Moderate</span>
                            <Badge className="bg-yellow-100 text-yellow-800">{summary.by_severity.moderate}</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Low</span>
                            <Badge className="bg-green-100 text-green-800">{summary.by_severity.low}</Badge>
                          </div>
                        </div>
                      </div>

                      {summary.latest_record && (
                        <div>
                          <p className="text-sm font-medium text-gray-600">Latest Record</p>
                          <p className="text-sm">{new Date(summary.latest_record).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Timeline */}
            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Medical Records Timeline
                  </CardTitle>
                  <CardDescription>
                    Chronological view of all medical records
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {timeline.length > 0 ? (
                    <div className="space-y-4">
                      {timeline.map((record, index) => (
                        <div key={record.id} className="relative">
                          {/* Timeline line */}
                          {index < timeline.length - 1 && (
                            <div className="absolute left-6 top-12 h-8 w-0.5 bg-gray-200"></div>
                          )}
                          
                          <div className="flex gap-4">
                            {/* Timeline dot */}
                            <div className={`flex-shrink-0 w-12 h-12 rounded-full border-2 flex items-center justify-center ${getSeverityColor(record.severity)}`}>
                              <AlertCircle className="h-5 w-5" />
                            </div>
                            
                            {/* Record content */}
                            <div className="flex-1 border rounded-lg p-4 bg-white">
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <h3 className="text-lg font-semibold capitalize">
                                    {record.record_type.replace('_', ' ')}
                                  </h3>
                                  <p className="text-sm text-gray-600">
                                    Uploaded by: {record.uploader_name}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <Badge className={getSeverityColor(record.severity)}>
                                    {record.severity}
                                  </Badge>
                                  <p className="text-sm text-gray-500 mt-1">
                                    {new Date(record.record_date).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              
                              {record.description && (
                                <p className="text-gray-700 mb-3">{record.description}</p>
                              )}
                              
                              <div className="flex gap-2">
                                {record.signed_url && (
                                  <Button variant="outline" size="sm" asChild>
                                    <a href={record.signed_url} target="_blank" rel="noopener noreferrer">
                                      <Download className="h-4 w-4 mr-2" />
                                      View Document
                                    </a>
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
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
                        No medical records have been uploaded for this patient yet.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Upload, Users } from "lucide-react";

interface HospitalDashboardProps {
  user?: any;
}

export default function HospitalDashboard({ user }: HospitalDashboardProps = {}) {
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [uploadData, setUploadData] = useState({
    recordType: "",
    description: "",
    severity: "low",
    recordDate: new Date().toISOString().split('T')[0],
    file: null as File | null,
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchPatients();
    }
  }, [user]);

  const fetchPatients = async () => {
    const { data, error } = await supabase.from('patients').select('*').order('name');
    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch patients",
        variant: "destructive",
      });
    } else {
      setPatients(data || []);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadData.file || !selectedPatient) {
      toast({
        title: "Error",
        description: "Please select a patient and file",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', uploadData.file);
      formData.append('patientId', selectedPatient);
      formData.append('recordType', uploadData.recordType);
      formData.append('description', uploadData.description);
      formData.append('severity', uploadData.severity);
      formData.append('recordDate', uploadData.recordDate);

      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`https://qiqepumdtaozjzfjbggl.supabase.co/functions/v1/upload-record`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}` },
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Upload failed');

      toast({
        title: "Success!",
        description: "Medical record uploaded successfully",
      });
      setUploadData({
        recordType: "",
        description: "",
        severity: "low",
        recordDate: new Date().toISOString().split('T')[0],
        file: null,
      });
      setSelectedPatient("");
    } catch (error: any) {
      toast({
        title: "Upload Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Medical Record
            </CardTitle>
            <CardDescription>
              Upload and categorize patient medical records
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-2">
                <Label>Select Patient</Label>
                <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.name} - DOB: {patient.dob}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Record Type</Label>
                <Select value={uploadData.recordType} onValueChange={(value) =>
                  setUploadData({ ...uploadData, recordType: value })
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Select record type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prescription">Prescription</SelectItem>
                    <SelectItem value="test_report">Test Report</SelectItem>
                    <SelectItem value="scan">Medical Scan</SelectItem>
                    <SelectItem value="discharge_summary">Discharge Summary</SelectItem>
                    <SelectItem value="consultation_notes">Consultation Notes</SelectItem>
                    <SelectItem value="lab_results">Lab Results</SelectItem>
                    <SelectItem value="imaging">Medical Imaging</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Severity</Label>
                <Select value={uploadData.severity} onValueChange={(value) =>
                  setUploadData({ ...uploadData, severity: value })
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low Priority</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="high">High Priority</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Record Date</Label>
                <Input
                  type="date"
                  value={uploadData.recordDate}
                  onChange={(e) => setUploadData({ ...uploadData, recordDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Description (Optional)</Label>
                <Textarea
                  placeholder="Additional notes about this record..."
                  value={uploadData.description}
                  onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>File</Label>
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(e) => setUploadData({ ...uploadData, file: e.target.files?.[0] || null })}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Uploading..." : "Upload Record"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Patient Records
            </CardTitle>
            <CardDescription>
              View and manage patient medical records
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {patients.map((patient) => (
                <div key={patient.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-semibold">{patient.name}</h3>
                    <p className="text-sm text-muted-foreground">DOB: {patient.dob}</p>
                    <p className="text-sm text-muted-foreground">Contact: {patient.primary_contact}</p>
                  </div>
                </div>
              ))}
              {patients.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No patients found</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
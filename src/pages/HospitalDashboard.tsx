import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, DollarSign, ClipboardList, Users, Calendar, TrendingUp, Download, Printer } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface HospitalDashboardProps {
  user?: any;
}

// Mock data
const mockConsultants = [
  { id: "doc_001", name: "Dr. Amit Sharma", avatarUrl: null, revenue: 37500, appointments: 12 },
  { id: "doc_002", name: "Dr. Priya Verma", avatarUrl: null, revenue: 42000, appointments: 15 },
  { id: "doc_003", name: "Dr. Rajesh Kumar", avatarUrl: null, revenue: 28500, appointments: 9 },
  { id: "doc_004", name: "Dr. Anita Desai", avatarUrl: null, revenue: 51000, appointments: 18 },
];

const mockAppointmentsData = [
  { date: "Nov 1", count: 12 },
  { date: "Nov 2", count: 18 },
  { date: "Nov 3", count: 15 },
  { date: "Nov 4", count: 22 },
  { date: "Nov 5", count: 19 },
  { date: "Nov 6", count: 25 },
  { date: "Nov 7", count: 21 },
  { date: "Nov 8", count: 28 },
  { date: "Nov 9", count: 24 },
  { date: "Nov 10", count: 30 },
  { date: "Nov 11", count: 26 },
  { date: "Nov 12", count: 32 },
  { date: "Nov 13", count: 29 },
];

export default function HospitalDashboard({ user }: HospitalDashboardProps = {}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState<string>("all");
  const [timeRange, setTimeRange] = useState("week");
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  return (
    <div className="container mx-auto px-4 py-8">
      {showSummary ? (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Summary View
            </CardTitle>
            <CardDescription>AI-generated summaries of patient data will be displayed here.</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Summary content is not yet available for hospital staff.</p>
          </CardContent>
        </Card>
      ) : (
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
      )}
    </div>
  );
}
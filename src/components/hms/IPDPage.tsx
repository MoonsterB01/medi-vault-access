import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import NewIPDAdmissionDialog from "./NewIPDAdmissionDialog";

export default function IPDPage({ hospitalData }: { hospitalData: any }) {
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (hospitalData?.id) {
      fetchAdmissions();
    }
  }, [hospitalData]);

  const fetchAdmissions = async () => {
    if (!hospitalData?.id) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('ipd_admissions')
        .select('*, patients(name), doctors(users(name))')
        .eq('hospital_id', hospitalData.id)
        .order('admission_date', { ascending: false });

      if (error) throw error;
      setAdmissions(data || []);
    } catch (error: any) {
      console.error('IPD fetch error:', error);
      toast.error('Failed to load IPD admissions');
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'admitted': return 'default';
      case 'discharged': return 'secondary';
      case 'transferred': return 'outline';
      default: return 'secondary';
    }
  };

  if (!hospitalData?.id) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">No hospital data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">IPD Management</h2>
          <p className="text-muted-foreground">In-Patient Department admissions</p>
        </div>
        <NewIPDAdmissionDialog hospitalId={hospitalData.id} onSuccess={fetchAdmissions} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Admissions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Loading admissions...</p>
          ) : admissions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No IPD admissions found</p>
              <p className="text-sm text-muted-foreground">Click "New Admission" to add a patient</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Ward/Bed</TableHead>
                  <TableHead>Admission Date</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admissions.map((admission) => (
                  <TableRow key={admission.id}>
                    <TableCell className="font-medium">{admission.patients?.name || 'Unknown'}</TableCell>
                    <TableCell>{admission.ward_number || '-'} / {admission.bed_number || '-'}</TableCell>
                    <TableCell>{new Date(admission.admission_date).toLocaleDateString()}</TableCell>
                    <TableCell>{admission.doctors?.users?.name || 'Unassigned'}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(admission.status)}>
                        {admission.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">View</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

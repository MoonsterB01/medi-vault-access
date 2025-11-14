import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export default function IPDPage({ hospitalData }: { hospitalData: any }) {
  const [admissions, setAdmissions] = useState<any[]>([]);

  useEffect(() => {
    fetchAdmissions();
  }, [hospitalData]);

  const fetchAdmissions = async () => {
    if (!hospitalData?.id) return;

    try {
      const { data, error } = await supabase
        .from('ipd_admissions')
        .select('*, patients(name), doctors(users(name))')
        .eq('hospital_id', hospitalData.id)
        .order('admission_date', { ascending: false });

      if (error) throw error;
      setAdmissions(data || []);
    } catch (error: any) {
      toast.error('Failed to load IPD admissions');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">IPD Management</h2>
          <p className="text-muted-foreground">In-Patient Department admissions</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Admission
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Admissions</CardTitle>
        </CardHeader>
        <CardContent>
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
                  <TableCell className="font-medium">{admission.patients?.name}</TableCell>
                  <TableCell>{admission.ward_number} / {admission.bed_number}</TableCell>
                  <TableCell>{new Date(admission.admission_date).toLocaleDateString()}</TableCell>
                  <TableCell>{admission.doctors?.users?.name || 'Unassigned'}</TableCell>
                  <TableCell>
                    <Badge variant={admission.status === 'admitted' ? 'default' : 'secondary'}>
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
        </CardContent>
      </Card>
    </div>
  );
}

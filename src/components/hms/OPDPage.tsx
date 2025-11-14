import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export default function OPDPage({ hospitalData }: { hospitalData: any }) {
  const [visits, setVisits] = useState<any[]>([]);

  useEffect(() => {
    fetchVisits();
  }, [hospitalData]);

  const fetchVisits = async () => {
    if (!hospitalData?.id) return;

    try {
      const { data, error } = await supabase
        .from('opd_visits')
        .select('*, patients(name), doctors(users(name))')
        .eq('hospital_id', hospitalData.id)
        .order('visit_date', { ascending: false })
        .limit(50);

      if (error) throw error;
      setVisits(data || []);
    } catch (error: any) {
      toast.error('Failed to load OPD visits');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">OPD Management</h2>
          <p className="text-muted-foreground">Out-Patient Department visits</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Visit
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Visits</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Visit Date</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Complaint</TableHead>
                <TableHead>Follow-up</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visits.map((visit) => (
                <TableRow key={visit.id}>
                  <TableCell className="font-medium">{visit.patients?.name}</TableCell>
                  <TableCell>{new Date(visit.visit_date).toLocaleString()}</TableCell>
                  <TableCell>{visit.doctors?.users?.name || 'N/A'}</TableCell>
                  <TableCell className="max-w-xs truncate">{visit.chief_complaint}</TableCell>
                  <TableCell>{visit.follow_up_date || 'None'}</TableCell>
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

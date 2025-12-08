import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import NewOPDVisitDialog from "./NewOPDVisitDialog";

export default function OPDPage({ hospitalData }: { hospitalData: any }) {
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (hospitalData?.id) {
      fetchVisits();
    }
  }, [hospitalData]);

  const fetchVisits = async () => {
    if (!hospitalData?.id) return;
    setLoading(true);

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
      console.error('OPD fetch error:', error);
      toast.error('Failed to load OPD visits');
    } finally {
      setLoading(false);
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
          <h2 className="text-3xl font-bold">OPD Management</h2>
          <p className="text-muted-foreground">Out-Patient Department visits</p>
        </div>
        <NewOPDVisitDialog hospitalId={hospitalData.id} onSuccess={fetchVisits} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Visits</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Loading visits...</p>
          ) : visits.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No OPD visits found</p>
              <p className="text-sm text-muted-foreground">Click "New Visit" to record a visit</p>
            </div>
          ) : (
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
                    <TableCell className="font-medium">{visit.patients?.name || 'Unknown'}</TableCell>
                    <TableCell>{new Date(visit.visit_date).toLocaleString()}</TableCell>
                    <TableCell>{visit.doctors?.users?.name || 'N/A'}</TableCell>
                    <TableCell className="max-w-xs truncate">{visit.chief_complaint || '-'}</TableCell>
                    <TableCell>{visit.follow_up_date ? new Date(visit.follow_up_date).toLocaleDateString() : 'None'}</TableCell>
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

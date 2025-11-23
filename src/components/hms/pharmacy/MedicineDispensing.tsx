import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Trash2, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface Dispensation {
  id: string;
  dispensed_date: string;
  medicines: any;
  notes: string | null;
  total_amount: number | null;
  patient_id: string;
  prescribed_by: string | null;
  patients: {
    id: string;
    name: string;
    shareable_id: string;
  };
  doctors: {
    id: string;
    user_id: string;
    users: {
      name: string;
    };
  } | null;
}

interface MedicineDispensingProps {
  hospitalData: any;
}

export default function MedicineDispensing({ hospitalData }: MedicineDispensingProps) {
  const [dispensations, setDispensations] = useState<Dispensation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDispensation, setSelectedDispensation] = useState<Dispensation | null>(null);
  const [prescriptionDialogOpen, setPrescriptionDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dispensationToDelete, setDispensationToDelete] = useState<string | null>(null);
  const [prescriptionDoc, setPrescriptionDoc] = useState<any>(null);
  const [loadingPrescription, setLoadingPrescription] = useState(false);

  useEffect(() => {
    if (hospitalData?.id) {
      fetchDispensations();
    }
  }, [hospitalData]);

  const fetchDispensations = async () => {
    if (!hospitalData?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pharmacy_dispensations')
        .select(`
          *,
          patients!inner (id, name, shareable_id),
          doctors:prescribed_by (
            id,
            user_id,
            users:user_id (name)
          )
        `)
        .eq('hospital_id', hospitalData.id)
        .order('dispensed_date', { ascending: false });

      if (error) throw error;
      setDispensations(data || []);
    } catch (error: any) {
      console.error('Error fetching dispensations:', error);
      toast.error('Failed to load dispensations');
    } finally {
      setLoading(false);
    }
  };

  const fetchPrescription = async (patientId: string, dispensationDate: string) => {
    setLoadingPrescription(true);
    try {
      // Find prescription documents near the dispensation date
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('patient_id', patientId)
        .or('document_type.eq.prescription,auto_categories.cs.{prescription}')
        .order('uploaded_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      
      // Find the most relevant prescription
      const relevantDoc = data?.find(doc => {
        const uploadDate = new Date(doc.uploaded_at);
        const dispenseDate = new Date(dispensationDate);
        const daysDiff = Math.abs((dispenseDate.getTime() - uploadDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysDiff <= 30; // Within 30 days
      }) || data?.[0];

      setPrescriptionDoc(relevantDoc);
    } catch (error: any) {
      console.error('Error fetching prescription:', error);
      toast.error('Failed to load prescription');
    } finally {
      setLoadingPrescription(false);
    }
  };

  const handleViewPrescription = async (dispensation: Dispensation) => {
    setSelectedDispensation(dispensation);
    setPrescriptionDialogOpen(true);
    await fetchPrescription(dispensation.patient_id, dispensation.dispensed_date);
  };

  const handleDeleteClick = (id: string) => {
    setDispensationToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!dispensationToDelete) return;

    try {
      const { error } = await supabase
        .from('pharmacy_dispensations')
        .delete()
        .eq('id', dispensationToDelete);

      if (error) throw error;

      toast.success('Dispensation deleted successfully');
      setDeleteDialogOpen(false);
      setDispensationToDelete(null);
      fetchDispensations();
    } catch (error: any) {
      console.error('Error deleting dispensation:', error);
      toast.error('Failed to delete dispensation');
    }
  };

  const filteredDispensations = dispensations.filter(d => {
    const searchLower = searchTerm.toLowerCase();
    return (
      d.patients?.name?.toLowerCase().includes(searchLower) ||
      d.patients?.shareable_id?.toLowerCase().includes(searchLower) ||
      d.doctors?.users?.name?.toLowerCase().includes(searchLower)
    );
  });

  const totalPages = Math.ceil(filteredDispensations.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedDispensations = filteredDispensations.slice(startIndex, startIndex + pageSize);

  const extractMedicines = (medicinesData: any): string[] => {
    if (!medicinesData) return [];
    
    try {
      if (Array.isArray(medicinesData)) {
        return medicinesData.map((m: any) => {
          if (typeof m === 'string') return m;
          return m.medicine_name || m.name || 'Unknown';
        });
      }
    } catch {
      return [];
    }
    return [];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Medicine Dispensing</h2>
        <p className="text-muted-foreground">Manage medicine dispensations and prescriptions</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by patient name, ID, or doctor..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select value={pageSize.toString()} onValueChange={(v) => {
              setPageSize(Number(v));
              setCurrentPage(1);
            }}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 / page</SelectItem>
                <SelectItem value="25">25 / page</SelectItem>
                <SelectItem value="50">50 / page</SelectItem>
                <SelectItem value="100">100 / page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Serial No</TableHead>
                  <TableHead>Patient Name</TableHead>
                  <TableHead>Patient ID</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Prescribed By</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedDispensations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No dispensations found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedDispensations.map((dispensation, index) => (
                    <TableRow key={dispensation.id}>
                      <TableCell className="font-medium">
                        {startIndex + index + 1}
                      </TableCell>
                      <TableCell>{dispensation.patients?.name || 'Unknown'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {dispensation.patients?.shareable_id || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(dispensation.dispensed_date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        {dispensation.doctors?.users?.name || 'Not specified'}
                      </TableCell>
                      <TableCell>
                        {dispensation.total_amount 
                          ? `₹${dispensation.total_amount.toFixed(2)}`
                          : 'N/A'
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewPrescription(dispensation)}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteClick(dispensation.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {filteredDispensations.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(startIndex + pageSize, filteredDispensations.length)} of {filteredDispensations.length} records
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  {totalPages > 5 && <span className="px-2">...</span>}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prescription Dialog */}
      <Dialog open={prescriptionDialogOpen} onOpenChange={setPrescriptionDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Prescription Details</DialogTitle>
            <DialogDescription>
              Patient: {selectedDispensation?.patients?.name} ({selectedDispensation?.patients?.shareable_id})
            </DialogDescription>
          </DialogHeader>
          
          {loadingPrescription ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Dispensed Medicines */}
              {selectedDispensation?.medicines && (
                <div>
                  <h3 className="font-semibold mb-3">Dispensed Medicines</h3>
                  <div className="rounded-lg border bg-muted/20 p-4">
                    <div className="space-y-2">
                      {extractMedicines(selectedDispensation.medicines).map((med, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Badge variant="secondary">{idx + 1}</Badge>
                          <span>{med}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* AI Extracted Medicines from Prescription */}
              {prescriptionDoc && (
                <div>
                  <h3 className="font-semibold mb-3">AI-Extracted Prescription</h3>
                  <div className="rounded-lg border p-4 space-y-3">
                    {prescriptionDoc.extracted_entities?.medications?.length > 0 ? (
                      prescriptionDoc.extracted_entities.medications.map((med: any, idx: number) => (
                        <div key={idx} className="border-b last:border-0 pb-3 last:pb-0">
                          <div className="font-medium">{med.name || med.medication_name}</div>
                          {med.dosage && (
                            <div className="text-sm text-muted-foreground">Dosage: {med.dosage}</div>
                          )}
                          {med.frequency && (
                            <div className="text-sm text-muted-foreground">Frequency: {med.frequency}</div>
                          )}
                          {med.duration && (
                            <div className="text-sm text-muted-foreground">Duration: {med.duration}</div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        {prescriptionDoc.ai_summary || 'No AI analysis available'}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Prescription Document Info */}
              {prescriptionDoc && (
                <div>
                  <h3 className="font-semibold mb-3">Document Information</h3>
                  <div className="text-sm space-y-1">
                    <div><span className="text-muted-foreground">Filename:</span> {prescriptionDoc.filename}</div>
                    <div><span className="text-muted-foreground">Uploaded:</span> {format(new Date(prescriptionDoc.uploaded_at), 'MMM dd, yyyy HH:mm')}</div>
                    {prescriptionDoc.document_type && (
                      <div><span className="text-muted-foreground">Type:</span> {prescriptionDoc.document_type}</div>
                    )}
                  </div>
                </div>
              )}

              {!prescriptionDoc && !loadingPrescription && (
                <div className="text-center py-8 text-muted-foreground">
                  No prescription document found for this dispensation
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Dispensation Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this dispensation record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

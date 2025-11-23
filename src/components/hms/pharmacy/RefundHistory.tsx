import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, Eye, CheckCircle, XCircle, MoreHorizontal } from "lucide-react";
import { format } from "date-fns";

interface RefundRecord {
  id: string;
  billing_id: string;
  refund_amount: number;
  refund_reason: string | null;
  refund_date: string;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  refunded_items: any;
  notes: string | null;
  billing: {
    bill_number: string;
    bill_date: string;
  };
  patient: {
    id: string;
    shareable_id: string;
    name: string;
    primary_contact: string;
    dob: string;
  };
  approver?: {
    name: string;
  };
}

export default function RefundHistory({ hospitalData }: { hospitalData: any }) {
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [filteredRefunds, setFilteredRefunds] = useState<RefundRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedRefund, setSelectedRefund] = useState<RefundRecord | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processingAction, setProcessingAction] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchRefunds();
  }, [hospitalData?.id]);

  useEffect(() => {
    applySearch();
  }, [searchTerm, refunds]);

  const fetchRefunds = async () => {
    if (!hospitalData?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("pharmacy_refunds")
        .select(`
          *,
          billing:billing (
            bill_number,
            bill_date
          ),
          patient:patients (
            id,
            shareable_id,
            name,
            primary_contact,
            dob
          ),
          approver:users!pharmacy_refunds_approved_by_fkey (
            name
          )
        `)
        .eq("hospital_id", hospitalData.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRefunds(data || []);
      setFilteredRefunds(data || []);
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

  const applySearch = () => {
    if (!searchTerm) {
      setFilteredRefunds(refunds);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = refunds.filter(
      (refund) =>
        refund.patient.name.toLowerCase().includes(term) ||
        refund.patient.shareable_id.toLowerCase().includes(term) ||
        refund.patient.primary_contact.includes(term) ||
        refund.billing.bill_number.toLowerCase().includes(term)
    );

    setFilteredRefunds(filtered);
    setCurrentPage(1);
  };

  const handleApprove = async () => {
    if (!selectedRefund) return;

    setProcessingAction(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("pharmacy_refunds")
        .update({
          status: "approved",
          approved_by: userData.user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", selectedRefund.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Refund approved successfully",
      });

      setApprovalDialogOpen(false);
      setSelectedRefund(null);
      fetchRefunds();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingAction(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRefund || !rejectionReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a rejection reason",
        variant: "destructive",
      });
      return;
    }

    setProcessingAction(true);
    try {
      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("pharmacy_refunds")
        .update({
          status: "rejected",
          approved_by: userData.user?.id,
          approved_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
        })
        .eq("id", selectedRefund.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Refund rejected",
      });

      setRejectDialogOpen(false);
      setSelectedRefund(null);
      setRejectionReason("");
      fetchRefunds();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingAction(false);
    }
  };

  const handleView = (refund: RefundRecord) => {
    setSelectedRefund(refund);
    setViewDialogOpen(true);
  };

  const handleApproveClick = (refund: RefundRecord) => {
    setSelectedRefund(refund);
    setApprovalDialogOpen(true);
  };

  const handleRejectClick = (refund: RefundRecord) => {
    setSelectedRefund(refund);
    setRejectDialogOpen(true);
  };

  // Pagination
  const totalPages = Math.ceil(filteredRefunds.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRefunds = filteredRefunds.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <Card className="p-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Medicine Refund History</h3>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by patient name, ID, phone, or order number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => {
                setItemsPerPage(parseInt(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 rows</SelectItem>
                <SelectItem value="25">25 rows</SelectItem>
                <SelectItem value="50">50 rows</SelectItem>
                <SelectItem value="100">100 rows</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Table Section */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredRefunds.length)} of{" "}
            {filteredRefunds.length} records
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>S.No.</TableHead>
                  <TableHead>Patient Name</TableHead>
                  <TableHead>DOB</TableHead>
                  <TableHead>Phone No.</TableHead>
                  <TableHead>Order No.</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Refund Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : currentRefunds.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No refund records found
                    </TableCell>
                  </TableRow>
                ) : (
                  currentRefunds.map((refund, index) => (
                    <TableRow key={refund.id}>
                      <TableCell>{startIndex + index + 1}</TableCell>
                      <TableCell className="font-medium">
                        {refund.patient.name}
                      </TableCell>
                      <TableCell>
                        {format(new Date(refund.patient.dob), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>{refund.patient.primary_contact}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {refund.billing.bill_number}
                      </TableCell>
                      <TableCell>
                        {format(new Date(refund.billing.bill_date), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="font-semibold">
                        ₹{refund.refund_amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            refund.status === "approved"
                              ? "bg-green-100 text-green-800"
                              : refund.status === "rejected"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {refund.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(refund)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {refund.status === "pending" && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleApproveClick(refund)}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleRejectClick(refund)}
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Reject
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Refund Details</DialogTitle>
          </DialogHeader>
          {selectedRefund && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Patient Name</Label>
                  <p className="font-medium">{selectedRefund.patient.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Patient ID</Label>
                  <p className="font-medium">
                    {selectedRefund.patient.shareable_id}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Order Number</Label>
                  <p className="font-medium">{selectedRefund.billing.bill_number}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Order Date</Label>
                  <p className="font-medium">
                    {format(
                      new Date(selectedRefund.billing.bill_date),
                      "dd/MM/yyyy"
                    )}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Refund Amount</Label>
                  <p className="font-semibold text-lg">
                    ₹{selectedRefund.refund_amount.toFixed(2)}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <p className="font-medium capitalize">{selectedRefund.status}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Refund Date</Label>
                  <p className="font-medium">
                    {format(
                      new Date(selectedRefund.refund_date),
                      "dd/MM/yyyy hh:mm a"
                    )}
                  </p>
                </div>
                {selectedRefund.approved_by && (
                  <div>
                    <Label className="text-muted-foreground">
                      {selectedRefund.status === "approved"
                        ? "Approved By"
                        : "Rejected By"}
                    </Label>
                    <p className="font-medium">
                      {selectedRefund.approver?.name || "Unknown"}
                    </p>
                  </div>
                )}
              </div>

              {selectedRefund.refund_reason && (
                <div>
                  <Label className="text-muted-foreground">Refund Reason</Label>
                  <p className="mt-1">{selectedRefund.refund_reason}</p>
                </div>
              )}

              {selectedRefund.rejection_reason && (
                <div>
                  <Label className="text-muted-foreground text-red-600">
                    Rejection Reason
                  </Label>
                  <p className="mt-1 text-red-600">
                    {selectedRefund.rejection_reason}
                  </p>
                </div>
              )}

              {selectedRefund.refunded_items &&
                selectedRefund.refunded_items.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground">Refunded Items</Label>
                    <Table className="mt-2">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Medicine</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedRefund.refunded_items.map(
                          (item: any, index: number) => (
                            <TableRow key={index}>
                              <TableCell>{item.medicine_name}</TableCell>
                              <TableCell>{item.quantity}</TableCell>
                              <TableCell>₹{item.amount?.toFixed(2)}</TableCell>
                            </TableRow>
                          )
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}

              {selectedRefund.notes && (
                <div>
                  <Label className="text-muted-foreground">Notes</Label>
                  <p className="mt-1">{selectedRefund.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approval Confirmation Dialog */}
      <AlertDialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Refund?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this refund of ₹
              {selectedRefund?.refund_amount.toFixed(2)}? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              disabled={processingAction}
            >
              {processingAction ? "Processing..." : "Approve"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Refund</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Rejection Reason *</Label>
              <Textarea
                placeholder="Please provide a reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectionReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processingAction || !rejectionReason.trim()}
            >
              {processingAction ? "Processing..." : "Reject Refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

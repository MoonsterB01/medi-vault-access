import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  FileDown, 
  Printer, 
  Eye, 
  FileText, 
  RotateCcw, 
  MoreHorizontal,
  Download
} from "lucide-react";
import { format } from "date-fns";

interface BillingRecord {
  id: string;
  bill_number: string;
  bill_date: string;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  payment_status: string;
  invoice_items: any;
  notes: string | null;
  patient: {
    id: string;
    shareable_id: string;
    name: string;
    primary_contact: string;
    dob: string;
  };
}

export default function BillingHistory({ hospitalData }: { hospitalData: any }) {
  const [bills, setBills] = useState<BillingRecord[]>([]);
  const [filteredBills, setFilteredBills] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedBill, setSelectedBill] = useState<BillingRecord | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const { toast } = useToast();

  // Filter states
  const [filters, setFilters] = useState({
    patientId: "",
    patientName: "",
    fromDate: "",
    toDate: "",
    billNumber: "",
    drugName: "",
    dob: "",
  });

  useEffect(() => {
    fetchBills();
  }, [hospitalData?.id]);

  useEffect(() => {
    applyFilters();
  }, [filters, bills]);

  const fetchBills = async () => {
    if (!hospitalData?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("billing")
        .select(`
          *,
          patient:patients (
            id,
            shareable_id,
            name,
            primary_contact,
            dob
          )
        `)
        .eq("hospital_id", hospitalData.id)
        .order("bill_date", { ascending: false });

      if (error) throw error;
      setBills(data || []);
      setFilteredBills(data || []);
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

  const applyFilters = () => {
    let filtered = [...bills];

    if (filters.patientId) {
      filtered = filtered.filter((bill) =>
        bill.patient.shareable_id.toLowerCase().includes(filters.patientId.toLowerCase())
      );
    }

    if (filters.patientName) {
      filtered = filtered.filter((bill) =>
        bill.patient.name.toLowerCase().includes(filters.patientName.toLowerCase())
      );
    }

    if (filters.fromDate) {
      filtered = filtered.filter(
        (bill) => new Date(bill.bill_date) >= new Date(filters.fromDate)
      );
    }

    if (filters.toDate) {
      filtered = filtered.filter(
        (bill) => new Date(bill.bill_date) <= new Date(filters.toDate)
      );
    }

    if (filters.billNumber) {
      filtered = filtered.filter((bill) =>
        bill.bill_number.toLowerCase().includes(filters.billNumber.toLowerCase())
      );
    }

    if (filters.drugName) {
      filtered = filtered.filter((bill) => {
        const items = bill.invoice_items || [];
        return items.some((item: any) =>
          item.medicine_name?.toLowerCase().includes(filters.drugName.toLowerCase())
        );
      });
    }

    if (filters.dob) {
      filtered = filtered.filter(
        (bill) => bill.patient.dob === filters.dob
      );
    }

    setFilteredBills(filtered);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilters({
      patientId: "",
      patientName: "",
      fromDate: "",
      toDate: "",
      billNumber: "",
      drugName: "",
      dob: "",
    });
  };

  const handleExportCSV = () => {
    const headers = [
      "S.No.",
      "Patient ID",
      "Patient Name",
      "Mobile No.",
      "Bill No.",
      "Bill Date",
      "Bill Amt.",
      "Paid Amt.",
      "GST(INR)",
      "Remaining",
      "Status",
    ];

    const rows = filteredBills.map((bill, index) => {
      const gstAmount = calculateGST(bill.invoice_items);
      return [
        index + 1,
        bill.patient.shareable_id,
        bill.patient.name,
        bill.patient.primary_contact,
        bill.bill_number,
        format(new Date(bill.bill_date), "dd/MM/yyyy"),
        bill.total_amount,
        bill.paid_amount,
        gstAmount.toFixed(2),
        bill.balance_amount,
        bill.payment_status,
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `billing-history-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "Billing history exported successfully",
    });
  };

  const handlePrint = (bill: BillingRecord) => {
    window.print();
    toast({
      title: "Print",
      description: `Printing bill ${bill.bill_number}`,
    });
  };

  const handleView = (bill: BillingRecord) => {
    setSelectedBill(bill);
    setViewDialogOpen(true);
  };

  const calculateGST = (items: any[] = []) => {
    return items.reduce((total, item) => {
      const cgst = parseFloat(item.cgst || 0);
      const sgst = parseFloat(item.sgst || 0);
      const quantity = parseFloat(item.quantity || 0);
      const price = parseFloat(item.price || 0);
      const itemTotal = quantity * price;
      return total + (itemTotal * (cgst + sgst)) / 100;
    }, 0);
  };

  // Pagination
  const totalPages = Math.ceil(filteredBills.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentBills = filteredBills.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      {/* Filter Section */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Medicine Billing History</h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
              >
                Clear Filters
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Patient ID</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by ID..."
                  value={filters.patientId}
                  onChange={(e) =>
                    setFilters({ ...filters, patientId: e.target.value })
                  }
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Patient Name</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name..."
                  value={filters.patientName}
                  onChange={(e) =>
                    setFilters({ ...filters, patientName: e.target.value })
                  }
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>From Date</Label>
              <Input
                type="date"
                value={filters.fromDate}
                onChange={(e) =>
                  setFilters({ ...filters, fromDate: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>To Date</Label>
              <Input
                type="date"
                value={filters.toDate}
                onChange={(e) =>
                  setFilters({ ...filters, toDate: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Order Number</Label>
              <Input
                placeholder="Search by bill no..."
                value={filters.billNumber}
                onChange={(e) =>
                  setFilters({ ...filters, billNumber: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Drug Name</Label>
              <Input
                placeholder="Search by drug..."
                value={filters.drugName}
                onChange={(e) =>
                  setFilters({ ...filters, drugName: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>DOB</Label>
              <Input
                type="date"
                value={filters.dob}
                onChange={(e) =>
                  setFilters({ ...filters, dob: e.target.value })
                }
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Table Section */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredBills.length)} of {filteredBills.length} records
            </div>
            <div className="flex items-center gap-2">
              <Label>Rows per page:</Label>
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(value) => {
                  setItemsPerPage(parseInt(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>S.No.</TableHead>
                  <TableHead>Patient ID</TableHead>
                  <TableHead>Patient Name</TableHead>
                  <TableHead>Mobile No.</TableHead>
                  <TableHead>Bill No.</TableHead>
                  <TableHead>Bill Date</TableHead>
                  <TableHead>Bill Amt.</TableHead>
                  <TableHead>Paid Amt.</TableHead>
                  <TableHead>GST(INR)</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : currentBills.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                      No billing records found
                    </TableCell>
                  </TableRow>
                ) : (
                  currentBills.map((bill, index) => {
                    const gstAmount = calculateGST(bill.invoice_items);
                    return (
                      <TableRow key={bill.id}>
                        <TableCell>{startIndex + index + 1}</TableCell>
                        <TableCell className="font-medium">
                          {bill.patient.shareable_id}
                        </TableCell>
                        <TableCell>{bill.patient.name}</TableCell>
                        <TableCell>{bill.patient.primary_contact}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {bill.bill_number}
                        </TableCell>
                        <TableCell>
                          {format(new Date(bill.bill_date), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell>₹{bill.total_amount.toFixed(2)}</TableCell>
                        <TableCell>₹{bill.paid_amount.toFixed(2)}</TableCell>
                        <TableCell>₹{gstAmount.toFixed(2)}</TableCell>
                        <TableCell>
                          <div>
                            <div>₹{bill.balance_amount.toFixed(2)}</div>
                            {bill.notes?.includes("waived") && (
                              <div className="text-xs text-muted-foreground">
                                (Waived)
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              bill.payment_status === "paid"
                                ? "bg-green-100 text-green-800"
                                : bill.payment_status === "partial"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {bill.payment_status}
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
                              <DropdownMenuItem onClick={() => handlePrint(bill)}>
                                <Printer className="h-4 w-4 mr-2" />
                                Print
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleView(bill)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <FileText className="h-4 w-4 mr-2" />
                                View Receipts
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <FileDown className="h-4 w-4 mr-2" />
                                View Refunds
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Refund
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
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
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* View Bill Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bill Details - {selectedBill?.bill_number}</DialogTitle>
          </DialogHeader>
          {selectedBill && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Patient Name</Label>
                  <p className="font-medium">{selectedBill.patient.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Patient ID</Label>
                  <p className="font-medium">{selectedBill.patient.shareable_id}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Bill Date</Label>
                  <p className="font-medium">
                    {format(new Date(selectedBill.bill_date), "dd/MM/yyyy hh:mm a")}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Payment Status</Label>
                  <p className="font-medium capitalize">{selectedBill.payment_status}</p>
                </div>
              </div>

              <div>
                <Label className="text-lg font-semibold mb-2 block">Items</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medicine</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>CGST</TableHead>
                      <TableHead>SGST</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(selectedBill.invoice_items || []).map((item: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>{item.medicine_name}</TableCell>
                        <TableCell>{item.batch_number}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>₹{item.price}</TableCell>
                        <TableCell>₹{item.discount || 0}</TableCell>
                        <TableCell>{item.cgst}%</TableCell>
                        <TableCell>{item.sgst}%</TableCell>
                        <TableCell>
                          ₹{(item.quantity * item.price - (item.discount || 0)).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>₹{(selectedBill.total_amount - calculateGST(selectedBill.invoice_items)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>GST:</span>
                  <span>₹{calculateGST(selectedBill.invoice_items).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total Amount:</span>
                  <span>₹{selectedBill.total_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-green-600">
                  <span>Paid Amount:</span>
                  <span>₹{selectedBill.paid_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-orange-600">
                  <span>Balance:</span>
                  <span>₹{selectedBill.balance_amount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
